const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const PORT = process.env.PORT || 5000;

const games = new Map();

/* =========================================================
   GAME CODE
========================================================= */

function generateGameCode() {
    let code;

    do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (games.has(code));

    return code;
}

/* =========================================================
   GAME STATE
========================================================= */

function getGameState(game) {
    return {
        gameCode: game.code,
        code: game.code,
        topic: game.topic,

        players: Array.from(game.users.values()).map((user) => ({
            userName: user.userName,
            buzzed: user.buzzed,
            position: user.position,
        })),

        buzzOrder: game.buzzOrder,

        answers: game.answers,
    };
}

function sendGameState(game) {
    const state = getGameState(game);

    io.to(game.adminId).emit("gameState", state);
    io.to(game.code).emit("gameState", state);
}

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
    res.send("Buzzer Arena server is running");
});

/* =========================================================
   SOCKET CONNECTION
========================================================= */

io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    /* =======================================================
       ADMIN LOGIN
    ======================================================= */

    socket.on("adminLogin", ({ adminName, password }) => {
        adminName = String(adminName || "").trim();
        password = String(password || "");

        if (!adminName || !password) {
            socket.emit("adminLoginResult", {
                success: false,
                message: "Enter admin name and password.",
            });

            return;
        }

        const correctPassword = `${adminName}0000`;

        if (password !== correctPassword) {
            socket.emit("adminLoginResult", {
                success: false,
                message: "Invalid admin login.",
            });

            return;
        }

        socket.isAdmin = true;
        socket.adminName = adminName;

        socket.emit("adminLoginResult", {
            success: true,
            adminName,
        });

        console.log(`Admin logged in: ${adminName}`);
    });

    /* =======================================================
       CREATE GAME
    ======================================================= */

    socket.on("createGame", ({ topic }) => {
        if (!socket.isAdmin) {
            socket.emit("errorMessage", "Admin login required.");
            return;
        }

        topic = String(topic || "").trim();

        if (!topic) {
            socket.emit("errorMessage", "Please enter a topic.");
            return;
        }

        /* Remove old game belonging to this admin */

        for (const [code, game] of games.entries()) {
            if (game.adminId === socket.id) {
                io.to(code).emit("gameClosed");
                games.delete(code);
            }
        }

        const gameCode = generateGameCode();

        const game = {
            code: gameCode,
            topic,
            adminId: socket.id,
            adminName: socket.adminName,

            users: new Map(),

            buzzOrder: [],

            answers: [],
        };

        games.set(gameCode, game);

        socket.join(gameCode);

        console.log(
            `Game created | Topic: ${topic} | Code: ${gameCode} | Admin: ${socket.adminName}`
        );

        /* VERY IMPORTANT:
           Send the code immediately to admin */

        socket.emit("gameCreated", {
            success: true,
            gameCode: gameCode,
            code: gameCode,
            topic: topic,
        });

        sendGameState(game);
    });

    /* =======================================================
       UPDATE TOPIC
    ======================================================= */

    socket.on("updateTopic", ({ gameCode, topic }) => {
        const game = games.get(String(gameCode));

        if (!game) {
            socket.emit("errorMessage", "Game not found.");
            return;
        }

        if (game.adminId !== socket.id) {
            socket.emit("errorMessage", "Only admin can update topic.");
            return;
        }

        topic = String(topic || "").trim();

        if (!topic) {
            socket.emit("errorMessage", "Topic cannot be empty.");
            return;
        }

        game.topic = topic;

        io.to(game.code).emit("topicUpdated", {
            topic: game.topic,
        });

        sendGameState(game);
    });

    /* =======================================================
       USER JOIN
    ======================================================= */

    socket.on("joinGame", ({ userName, gameCode }) => {
        userName = String(userName || "").trim();
        gameCode = String(gameCode || "").trim();

        if (!userName || !gameCode) {
            socket.emit("joinResult", {
                success: false,
                message: "Enter username and game code.",
            });

            return;
        }

        const game = games.get(gameCode);

        if (!game) {
            socket.emit("joinResult", {
                success: false,
                message: "Invalid game code.",
            });

            return;
        }

        const alreadyExists = Array.from(game.users.values()).some(
            (user) => user.userName.toLowerCase() === userName.toLowerCase()
        );

        if (alreadyExists) {
            socket.emit("joinResult", {
                success: false,
                message: "Username already exists in this game.",
            });

            return;
        }

        const user = {
            id: socket.id,
            userName,
            buzzed: false,
            position: null,
        };

        game.users.set(socket.id, user);

        socket.userName = userName;
        socket.gameCode = gameCode;
        socket.join(gameCode);

        socket.emit("joinResult", {
            success: true,
            userName,
            gameCode,
            topic: game.topic,
        });

        io.to(game.adminId).emit("userJoined", {
            userName,
        });

        console.log(`${userName} joined game ${gameCode}`);

        sendGameState(game);
    });

    /* =======================================================
       BUZZER
    ======================================================= */

    socket.on("buzz", ({ gameCode }) => {
        gameCode = String(gameCode || "").trim();

        const game = games.get(gameCode);

        if (!game) {
            socket.emit("errorMessage", "Game not found.");
            return;
        }

        const user = game.users.get(socket.id);

        if (!user) {
            socket.emit("errorMessage", "User not found in game.");
            return;
        }

        if (user.buzzed) {
            return;
        }

        user.buzzed = true;
        user.position = game.buzzOrder.length + 1;

        const buzzData = {
            position: user.position,
            userName: user.userName,
        };

        game.buzzOrder.push(buzzData);

        socket.emit("buzzAccepted", {
            position: user.position,
        });

        io.to(game.adminId).emit("newBuzz", buzzData);

        console.log(
            `Buzz | ${user.userName} | Position ${user.position} | Game ${gameCode}`
        );

        sendGameState(game);
    });

    /* =======================================================
       ANSWER
    ======================================================= */

    socket.on("sendAnswer", ({ gameCode, answer }) => {
        gameCode = String(gameCode || "").trim();
        answer = String(answer || "").trim();

        const game = games.get(gameCode);

        if (!game) {
            socket.emit("errorMessage", "Game not found.");
            return;
        }

        const user = game.users.get(socket.id);

        if (!user) {
            socket.emit("errorMessage", "User not found.");
            return;
        }

        if (!answer) {
            socket.emit("errorMessage", "Please enter an answer.");
            return;
        }

        /* Update existing answer from same user */

        const existingAnswer = game.answers.find(
            (item) => item.userName === user.userName
        );

        if (existingAnswer) {
            existingAnswer.answer = answer;
            existingAnswer.time = new Date().toLocaleTimeString();
        } else {
            game.answers.push({
                userName: user.userName,
                answer,
                time: new Date().toLocaleTimeString(),
            });
        }

        io.to(game.adminId).emit("answerReceived", {
            userName: user.userName,
            answer,
        });

        sendGameState(game);
    });

    /* =======================================================
       RESET GAME
    ======================================================= */

    socket.on("resetGame", ({ gameCode }) => {
        gameCode = String(gameCode || "").trim();

        const game = games.get(gameCode);

        if (!game) {
            socket.emit("errorMessage", "Game not found.");
            return;
        }

        if (game.adminId !== socket.id) {
            socket.emit("errorMessage", "Only admin can reset.");
            return;
        }

        game.buzzOrder = [];
        game.answers = [];

        for (const user of game.users.values()) {
            user.buzzed = false;
            user.position = null;
        }

        io.to(game.code).emit("roundReset");

        sendGameState(game);

        console.log(`Game reset: ${gameCode}`);
    });

    /* =======================================================
       USER EXIT
    ======================================================= */

    socket.on("userExit", ({ gameCode }) => {
        gameCode = String(gameCode || "").trim();

        const game = games.get(gameCode);

        if (!game) {
            return;
        }

        const user = game.users.get(socket.id);

        if (!user) {
            return;
        }

        const userName = user.userName;

        game.users.delete(socket.id);

        game.answers = game.answers.filter(
            (answer) => answer.userName !== userName
        );

        game.buzzOrder = game.buzzOrder.filter(
            (buzz) => buzz.userName !== userName
        );

        /* Recalculate positions */

        game.buzzOrder.forEach((buzz, index) => {
            buzz.position = index + 1;

            const remainingUser = Array.from(game.users.values()).find(
                (u) => u.userName === buzz.userName
            );

            if (remainingUser) {
                remainingUser.position = index + 1;
            }
        });

        io.to(game.adminId).emit("userExitNotification", {
            userName,
            message: `${userName} went out from the page.`,
        });

        console.log(`${userName} exited game ${gameCode}`);

        sendGameState(game);
    });

    /* =======================================================
       USER TAB CHANGE
       ADDED FOR TAB SWITCH NOTIFICATION
    ======================================================= */

    socket.on("userTabChanged", (data) => {
        if (!data || !data.userName || !data.gameCode) {
            return;
        }

        if (data.status === "left") {
            io.emit("userTabChangedNotification", {
                userName: data.userName,
                status: "left",
            });
        }

        if (data.status === "returned") {
            io.emit("userTabChangedNotification", {
                userName: data.userName,
                status: "returned",
            });
        }
    });

    /* =======================================================
       ADMIN EXIT
    ======================================================= */

    socket.on("adminExit", ({ gameCode }) => {
        gameCode = String(gameCode || "").trim();

        const game = games.get(gameCode);

        if (!game) {
            return;
        }

        if (game.adminId !== socket.id) {
            return;
        }

        io.to(game.code).emit("gameClosed");

        games.delete(gameCode);

        console.log(`Game closed: ${gameCode}`);
    });

    /* =======================================================
       DISCONNECT
    ======================================================= */

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);

        /* Admin disconnected */

        if (socket.isAdmin) {
            for (const [code, game] of games.entries()) {
                if (game.adminId === socket.id) {
                    io.to(code).emit("gameClosed");
                    games.delete(code);

                    console.log(`Admin disconnected. Game closed: ${code}`);
                }
            }

            return;
        }

        /* User disconnected */

        if (socket.gameCode) {
            const game = games.get(socket.gameCode);

            if (!game) {
                return;
            }

            const user = game.users.get(socket.id);

            if (!user) {
                return;
            }

            const userName = user.userName;

            game.users.delete(socket.id);

            game.answers = game.answers.filter(
                (answer) => answer.userName !== userName
            );

            game.buzzOrder = game.buzzOrder.filter(
                (buzz) => buzz.userName !== userName
            );

            game.buzzOrder.forEach((buzz, index) => {
                buzz.position = index + 1;

                const remainingUser = Array.from(game.users.values()).find(
                    (u) => u.userName === buzz.userName
                );

                if (remainingUser) {
                    remainingUser.position = index + 1;
                }
            });

            io.to(game.adminId).emit("userExitNotification", {
                userName,
                message: `${userName} went out from the page.`,
            });

            sendGameState(game);
        }
    });
});

/* =========================================================
   START SERVER
========================================================= */

server.listen(PORT, () => {
    console.log(`Buzzer server running on http://localhost:${PORT}`);
});