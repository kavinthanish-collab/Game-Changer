import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
});

function App() {
    const [page, setPage] = useState("home");
    const [connected, setConnected] = useState(false);

    const [adminName, setAdminName] = useState("");
    const [adminPassword, setAdminPassword] = useState("");

    const [userName, setUserName] = useState("");
    const [gameCodeInput, setGameCodeInput] = useState("");

    const [topic, setTopic] = useState("");
    const [gameCode, setGameCode] = useState("");

    const [players, setPlayers] = useState([]);
    const [buzzOrder, setBuzzOrder] = useState([]);
    const [answers, setAnswers] = useState([]);

    const [notifications, setNotifications] = useState([]);

    const [userAnswer, setUserAnswer] = useState("");
    const [buzzed, setBuzzed] = useState(false);
    const [position, setPosition] = useState(null);

    const [message, setMessage] = useState("");

    // MARKS
    const [marks, setMarks] = useState({});

    // Admin enters the number of questions here.
    const [questionCount, setQuestionCount] = useState(0);

    useEffect(() => {
        const handleConnect = () => {
            setConnected(true);
        };

        const handleDisconnect = () => {
            setConnected(false);
        };

        const handleConnectError = () => {
            setConnected(false);
        };

        const handleAdminLoginResult = (data) => {
            if (data.success) {
                setMessage("");
                setPage("admin");
            } else {
                setMessage(data.message || "Invalid admin login");
            }
        };

        const handleGameCreated = (data) => {
            const newCode = data.gameCode || data.code || "";

            setGameCode(newCode);
            setTopic(data.topic || "");
            setPlayers([]);
            setBuzzOrder([]);
            setAnswers([]);
            setNotifications([]);
            setMarks({});
            setMessage("");

            setPage("admin");
        };

        const handleGameState = (data) => {
            if (!data) return;

            if (data.gameCode || data.code) {
                setGameCode(data.gameCode || data.code);
            }

            if (data.topic !== undefined) {
                setTopic(data.topic);
            }

            if (data.players) {
                setPlayers(data.players);
            }

            if (data.buzzOrder) {
                setBuzzOrder(data.buzzOrder);
            }

            if (data.answers) {
                setAnswers(data.answers);
            }
        };

        const handleJoinResult = (data) => {
            if (data.success) {
                setMessage("");
                setPage("user");

                setTopic(data.topic || "");
                setGameCode(
                    data.gameCode || data.code || gameCodeInput
                );

                setBuzzed(false);
                setPosition(null);
                setUserAnswer("");
            } else {
                setMessage(data.message || "Unable to join game");
            }
        };

        const handleBuzzAccepted = (data) => {
            setBuzzed(true);
            setPosition(data.position);
        };

        const handleNewBuzz = (data) => {
            setNotifications((prev) => [
                ...prev,
                `${data.userName} pressed the buzzer`,
            ]);
        };

        const handleUserJoined = (data) => {
            setNotifications((prev) => [
                ...prev,
                `${data.userName} joined the game`,
            ]);
        };

        const handleUserExitNotification = (data) => {
            setNotifications((prev) => [
                ...prev,
                `${data.userName} went out from the page`,
            ]);
        };

        const handleAnswerReceived = (data) => {
            setNotifications((prev) => [
                ...prev,
                `${data.userName} sent an answer`,
            ]);
        };
        const handleUserTabChangedNotification = (data) => {
            if (data.status === "left") {
                setNotifications((prev) => [
                    ...prev,
                    `${data.userName} changed the tab / left the game tab`,
                ]);
            }

            if (data.status === "returned") {
                setNotifications((prev) => [
                    ...prev,
                    `${data.userName} returned to the game tab`,
                ]);
            }
        };

        socket.on(
            "userTabChangedNotification",
            handleUserTabChangedNotification
        );

        const handleRoundReset = () => {
            setBuzzOrder([]);
            setAnswers([]);
            setBuzzed(false);
            setPosition(null);

            setPlayers((prev) =>
                prev.map((player) => ({
                    ...player,
                    buzzed: false,
                    position: null,
                }))
            );

            // Marks are kept after round reset.
            setNotifications((prev) => [
                ...prev,
                "Round reset",
            ]);
        };

        const handleTopicUpdated = (data) => {
            setTopic(data.topic || "");
        };

        const handleGameClosed = () => {
            setGameCode("");
            setTopic("");
            setPlayers([]);
            setBuzzOrder([]);
            setAnswers([]);
            setNotifications([]);
            setMarks({});
            setQuestionCount(0);

            setPage("home");
            setMessage("Game closed by admin");
        };

        const handleErrorMessage = (data) => {
            setMessage(
                data.message || "Something went wrong"
            );
            const handleUserTabChangedNotification = (data) => {
                if (data.status === "left") {
                    setNotifications((prev) => [
                        ...prev,
                        `${data.userName} changed the tab / left the game tab`,
                    ]);
                }

                if (data.status === "returned") {
                    setNotifications((prev) => [
                        ...prev,
                        `${data.userName} returned to the game tab`,
                    ]);
                }
            };
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);

        socket.on(
            "adminLoginResult",
            handleAdminLoginResult
        );
        socket.on("gameCreated", handleGameCreated);
        socket.on("gameState", handleGameState);
        socket.on("joinResult", handleJoinResult);
        socket.on("buzzAccepted", handleBuzzAccepted);
        socket.on("newBuzz", handleNewBuzz);
        socket.on("userJoined", handleUserJoined);
        socket.on(
            "userExitNotification",
            handleUserExitNotification
        );
        socket.on(
            "answerReceived",
            handleAnswerReceived
        );
        socket.on("roundReset", handleRoundReset);
        socket.on("topicUpdated", handleTopicUpdated);
        socket.on("gameClosed", handleGameClosed);
        socket.on("errorMessage", handleErrorMessage);
        socket.on(
            "userTabChangedNotification",
            handleUserTabChangedNotification
        );

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off(
                "connect_error",
                handleConnectError
            );

            socket.off(
                "adminLoginResult",
                handleAdminLoginResult
            );
            socket.off("gameCreated", handleGameCreated);
            socket.off("gameState", handleGameState);
            socket.off("joinResult", handleJoinResult);
            socket.off("buzzAccepted", handleBuzzAccepted);
            socket.off("newBuzz", handleNewBuzz);
            socket.off("userJoined", handleUserJoined);
            socket.off(
                "userExitNotification",
                handleUserExitNotification
            );
            socket.off(
                "answerReceived",
                handleAnswerReceived
            );
            socket.off("roundReset", handleRoundReset);
            socket.off("topicUpdated", handleTopicUpdated);
            socket.off("gameClosed", handleGameClosed);
            socket.off("errorMessage", handleErrorMessage);
            // ADD THIS
            socket.off(
                "userTabChangedNotification",
                handleUserTabChangedNotification
            );
        };
    }, [gameCodeInput]);
    useEffect(() => {
        if (page !== "user") return;

        const handleVisibilityChange = () => {
            if (!userName.trim() || !gameCode) return;

            if (document.visibilityState === "hidden") {
                socket.emit("userTabChanged", {
                    userName: userName.trim(),
                    gameCode,
                    status: "left",
                });
            }

            if (document.visibilityState === "visible") {
                socket.emit("userTabChanged", {
                    userName: userName.trim(),
                    gameCode,
                    status: "returned",
                });
            }
        };

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [page, userName, gameCode]);

    const goHome = () => {
        setPage("home");
        setMessage("");
    };

    const openAdminLogin = () => {
        setPage("adminLogin");
        setMessage("");
        setAdminName("");
        setAdminPassword("");
    };

    const openUserLogin = () => {
        setPage("userLogin");
        setMessage("");
        setUserName("");
        setGameCodeInput("");
    };

    const handleAdminLogin = (e) => {
        e.preventDefault();

        if (
            !adminName.trim() ||
            !adminPassword.trim()
        ) {
            setMessage(
                "Enter admin name and password"
            );
            return;
        }

        socket.emit("adminLogin", {
            adminName: adminName.trim(),
            password: adminPassword,
        });
    };

    const createGame = () => {
        if (!topic.trim()) {
            setMessage("Enter a topic name");
            return;
        }

        socket.emit("createGame", {
            adminName: adminName.trim(),
            topic: topic.trim(),
        });
    };

    const updateTopic = () => {
        if (!topic.trim()) {
            setMessage("Enter a topic name");
            return;
        }

        socket.emit("updateTopic", {
            adminName: adminName.trim(),
            gameCode,
            topic: topic.trim(),
        });
    };

    const resetGame = () => {
        socket.emit("resetGame", {
            adminName: adminName.trim(),
            gameCode,
        });
    };

    const exitAdmin = () => {
        socket.emit("adminExit", {
            adminName: adminName.trim(),
            gameCode,
        });

        setPage("home");
        setGameCode("");
        setTopic("");
        setPlayers([]);
        setBuzzOrder([]);
        setAnswers([]);
        setNotifications([]);
        setMarks({});
        setQuestionCount(0);
        setMessage("");
    };

    const handleUserLogin = (e) => {
        e.preventDefault();

        if (
            !userName.trim() ||
            !gameCodeInput.trim()
        ) {
            setMessage(
                "Enter username and game code"
            );
            return;
        }

        socket.emit("joinGame", {
            userName: userName.trim(),
            gameCode: gameCodeInput.trim(),
        });
    };

    const pressBuzzer = () => {
        if (buzzed) return;

        socket.emit("buzz", {
            userName: userName.trim(),
            gameCode,
        });
    };

    const sendAnswer = () => {
        if (!userAnswer.trim()) return;

        socket.emit("sendAnswer", {
            userName: userName.trim(),
            gameCode,
            answer: userAnswer.trim(),
        });

        setUserAnswer("");
    };

    const exitUser = () => {
        socket.emit("userExit", {
            userName: userName.trim(),
            gameCode,
        });

        setPage("home");
        setUserName("");
        setGameCodeInput("");
        setGameCode("");
        setTopic("");
        setPlayers([]);
        setBuzzOrder([]);
        setAnswers([]);
        setNotifications([]);
        setUserAnswer("");
        setBuzzed(false);
        setPosition(null);
        setMessage("");
    };

    // =========================
    // MARK FUNCTIONS
    // =========================

    const changeQuestionCount = (e) => {
        let value = parseInt(e.target.value, 10);

        if (Number.isNaN(value)) {
            setQuestionCount(0);
            return;
        }

        // Keep it practical and safe.
        value = Math.max(0, Math.min(value, 50));

        setQuestionCount(value);
    };

    const updateMark = (
        user,
        questionIndex,
        value
    ) => {
        setMarks((prev) => ({
            ...prev,
            [user]: {
                ...(prev[user] || {}),
                [questionIndex]: value,
            },
        }));
    };

    const getTotalMarks = (user) => {
        return Array.from({
            length: questionCount,
        }).reduce((total, _, index) => {
            return (
                total +
                (Number(
                    marks[user]?.[index]
                ) || 0)
            );
        }, 0);
    };

    const clearMarksForRemovedQuestions = () => {
        setMarks((prev) => {
            const updated = {};

            Object.keys(prev).forEach((user) => {
                updated[user] = {};

                for (
                    let i = 0;
                    i < questionCount;
                    i++
                ) {
                    if (
                        prev[user] &&
                        prev[user][i] !== undefined
                    ) {
                        updated[user][i] =
                            prev[user][i];
                    }
                }
            });

            return updated;
        });
    };

    useEffect(() => {
        clearMarksForRemovedQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionCount]);

    return (
        <div className="app">

            {/* ================= HOME ================= */}

            {page === "home" && (
                <div className="home-page">

                    <div className="home-header">
                        <h1>BUZZER ARENA</h1>

                        <div
                            className={
                                connected
                                    ? "connection online"
                                    : "connection"
                            }
                        >
                            <span className="connection-dot"></span>
                            {connected
                                ? "CONNECTED"
                                : "DISCONNECTED"}
                        </div>
                    </div>

                    <div className="home-center">

                        <button
                            className="main-login-button"
                            onClick={openUserLogin}
                        >
                            USER LOGIN
                        </button>

                        <button
                            className="main-login-button"
                            onClick={openAdminLogin}
                        >
                            ADMIN LOGIN
                        </button>

                    </div>
                </div>
            )}

            {/* ================= USER LOGIN ================= */}

            {page === "userLogin" && (
                <div className="login-page">

                    <div className="login-card">

                        <div className="login-header">
                            <h2>USER LOGIN</h2>
                            <p>
                                Join an active buzzer
                                game
                            </p>
                        </div>

                        <form onSubmit={handleUserLogin}>

                            <label>USERNAME</label>

                            <input
                                type="text"
                                value={userName}
                                onChange={(e) =>
                                    setUserName(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter username"
                            />

                            <label>GAME CODE</label>

                            <input
                                type="text"
                                value={gameCodeInput}
                                onChange={(e) =>
                                    setGameCodeInput(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter 6-digit game code"
                            />

                            {message && (
                                <div className="form-message">
                                    {message}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="purple-button"
                            >
                                JOIN GAME
                            </button>

                            <button
                                type="button"
                                className="back-button"
                                onClick={goHome}
                            >
                                BACK
                            </button>

                        </form>
                    </div>
                </div>
            )}

            {/* ================= ADMIN LOGIN ================= */}

            {page === "adminLogin" && (
                <div className="login-page">

                    <div className="login-card">

                        <div className="login-header">
                            <h2>ADMIN LOGIN</h2>
                            <p>
                                Administrator access
                            </p>
                        </div>

                        <form
                            onSubmit={handleAdminLogin}
                        >

                            <label>ADMIN NAME</label>

                            <input
                                type="text"
                                value={adminName}
                                onChange={(e) =>
                                    setAdminName(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter admin name"
                            />

                            <label>PASSWORD</label>

                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) =>
                                    setAdminPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter password"
                            />

                            {message && (
                                <div className="form-message">
                                    {message}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="purple-button"
                            >
                                LOGIN
                            </button>

                            <button
                                type="button"
                                className="back-button"
                                onClick={goHome}
                            >
                                BACK
                            </button>

                        </form>
                    </div>
                </div>
            )}

            {/* ================= ADMIN ================= */}

            {page === "admin" && (
                <div className="dashboard-page">

                    <div className="dashboard-header">

                        <div>
                            <h1>BUZZER ARENA</h1>
                            <p>ADMIN DASHBOARD</p>
                        </div>

                        <button
                            className="exit-button"
                            onClick={exitAdmin}
                        >
                            EXIT
                        </button>

                    </div>

                    {/* TOP CONTROLS */}

                    <div className="admin-top-controls">

                        <div className="topic-control">

                            <label>
                                TOPIC NAME
                            </label>

                            <input
                                type="text"
                                value={topic}
                                onChange={(e) =>
                                    setTopic(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter topic name"
                            />

                            <button
                                className="purple-button"
                                onClick={
                                    gameCode
                                        ? updateTopic
                                        : createGame
                                }
                            >
                                {gameCode
                                    ? "UPDATE TOPIC"
                                    : "CREATE GAME"}
                            </button>

                        </div>

                        <div className="game-code-box">
                            <span>GAME CODE</span>
                            <strong>
                                {gameCode || "------"}
                            </strong>
                        </div>

                    </div>

                    {message && (
                        <div className="dashboard-message">
                            {message}
                        </div>
                    )}

                    {/* STATS */}

                    <div className="admin-stats">

                        <div className="stat-card">
                            <span>TOPIC</span>
                            <strong>
                                {topic || "-"}
                            </strong>
                        </div>

                        <div className="stat-card">
                            <span>PLAYERS</span>
                            <strong>
                                {players.length}
                            </strong>
                        </div>

                        <div className="stat-card">
                            <span>BUZZES</span>
                            <strong>
                                {buzzOrder.length}
                            </strong>
                        </div>

                        <div className="stat-card">
                            <span>ANSWERS</span>
                            <strong>
                                {answers.length}
                            </strong>
                        </div>

                        <button
                            className="reset-button"
                            onClick={resetGame}
                        >
                            RESET
                        </button>

                    </div>

                    {/* FIRST ROW */}

                    <div className="admin-grid">

                        {/* PLAYERS */}

                        <div className="panel">

                            <div className="panel-title">
                                <h3>
                                    PLAYERS ONLINE
                                </h3>
                            </div>

                            <div className="panel-content">

                                {players.length === 0 ? (
                                    <div className="empty-state">
                                        No players yet
                                    </div>
                                ) : (
                                    players.map(
                                        (player) => (
                                            <div
                                                className="player-item"
                                                key={
                                                    player.id
                                                }
                                            >
                                                <span className="player-name">
                                                    {
                                                        player.userName
                                                    }
                                                </span>

                                                {player.buzzed && (
                                                    <span className="player-buzzed">
                                                        BUZZED
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    )
                                )}

                            </div>
                        </div>

                        {/* BUZZER ORDER */}

                        <div className="panel buzzer-panel">

                            <div className="panel-title">
                                <h3>
                                    BUZZER ORDER
                                </h3>
                            </div>

                            <div className="panel-content">

                                {buzzOrder.length === 0 ? (
                                    <div className="empty-state">
                                        No buzzers yet
                                    </div>
                                ) : (
                                    buzzOrder.map(
                                        (item) => (
                                            <div
                                                className="buzzer-order-item"
                                                key={
                                                    item.position
                                                }
                                            >
                                                <div className="order-number">
                                                    {
                                                        item.position
                                                    }
                                                </div>

                                                <div className="order-user">
                                                    {
                                                        item.userName
                                                    }
                                                </div>
                                            </div>
                                        )
                                    )
                                )}

                            </div>
                        </div>

                        {/* USER ANSWERS */}

                        <div className="panel">

                            <div className="panel-title">
                                <h3>
                                    USER ANSWERS
                                </h3>
                            </div>

                            <div className="panel-content">

                                {answers.length === 0 ? (
                                    <div className="empty-state">
                                        No answers yet
                                    </div>
                                ) : (
                                    answers.map(
                                        (item, index) => (
                                            <div
                                                className="answer-item"
                                                key={index}
                                            >
                                                <div className="answer-user">
                                                    {
                                                        item.userName
                                                    }
                                                </div>

                                                <div className="answer-text">
                                                    {
                                                        item.answer
                                                    }
                                                </div>
                                            </div>
                                        )
                                    )
                                )}

                            </div>
                        </div>

                    </div>

                    {/* =========================
                        BOTTOM AREA
                        MARKS LEFT
                        LIVE ACTIVITY RIGHT
                       ========================= */}

                    <div className="admin-bottom-grid">

                        {/* MARKS TABLE */}

                        <div className="panel marks-panel">

                            <div className="panel-title marks-title">

                                <div>
                                    <h3>MARKS</h3>
                                </div>

                                <div className="question-count-control">

                                    <label>
                                        NO. OF QUESTIONS
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={
                                            questionCount
                                        }
                                        onChange={
                                            changeQuestionCount
                                        }
                                    />

                                </div>

                            </div>

                            <div className="panel-content marks-panel-content">

                                {questionCount === 0 ? (
                                    <div className="marks-empty-message">
                                        Enter the number of
                                        questions above to
                                        create the Qn boxes.
                                    </div>
                                ) : (

                                    <div className="marks-table-wrapper">

                                        <table className="marks-table">

                                            <thead>

                                                <tr>

                                                    <th>
                                                        USER
                                                    </th>

                                                    {Array.from(
                                                        {
                                                            length:
                                                                questionCount,
                                                        }
                                                    ).map(
                                                        (
                                                            _,
                                                            index
                                                        ) => (
                                                            <th
                                                                key={
                                                                    index
                                                                }
                                                            >
                                                                Qn{" "}
                                                                {index +
                                                                    1}
                                                            </th>
                                                        )
                                                    )}

                                                    <th>
                                                        TOTAL
                                                    </th>

                                                </tr>

                                            </thead>

                                            <tbody>

                                                {players.length ===
                                                    0 ? (
                                                    <tr>
                                                        <td
                                                            colSpan={
                                                                questionCount +
                                                                2
                                                            }
                                                            className="empty-marks"
                                                        >
                                                            No
                                                            players
                                                            yet
                                                        </td>
                                                    </tr>
                                                ) : (

                                                    players.map(
                                                        (
                                                            player
                                                        ) => {

                                                            const user =
                                                                player.userName;

                                                            return (
                                                                <tr
                                                                    key={
                                                                        player.id
                                                                    }
                                                                >

                                                                    <td className="marks-user-name">
                                                                        {
                                                                            user
                                                                        }
                                                                    </td>

                                                                    {Array.from(
                                                                        {
                                                                            length:
                                                                                questionCount,
                                                                        }
                                                                    ).map(
                                                                        (
                                                                            _,
                                                                            index
                                                                        ) => (
                                                                            <td
                                                                                key={
                                                                                    index
                                                                                }
                                                                            >

                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    value={
                                                                                        marks[
                                                                                        user
                                                                                        ]?.[
                                                                                        index
                                                                                        ] ??
                                                                                        ""
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        updateMark(
                                                                                            user,
                                                                                            index,
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    className="mark-input"
                                                                                />

                                                                            </td>
                                                                        )
                                                                    )}

                                                                    <td className="total-mark">
                                                                        {getTotalMarks(
                                                                            user
                                                                        )}
                                                                    </td>

                                                                </tr>
                                                            );
                                                        }
                                                    )

                                                )}

                                            </tbody>

                                        </table>

                                    </div>

                                )}

                            </div>
                        </div>

                        {/* LIVE ACTIVITY */}

                        <div className="panel activity-panel">

                            <div className="panel-title">
                                <h3>
                                    LIVE ACTIVITY
                                </h3>
                            </div>

                            <div className="panel-content activity-content">

                                {notifications.length ===
                                    0 ? (
                                    <div className="empty-state">
                                        Waiting for activity...
                                    </div>
                                ) : (
                                    notifications
                                        .slice()
                                        .reverse()
                                        .map(
                                            (
                                                notification,
                                                index
                                            ) => (
                                                <div
                                                    className="activity-item"
                                                    key={
                                                        index
                                                    }
                                                >
                                                    {
                                                        notification
                                                    }
                                                </div>
                                            )
                                        )
                                )}

                            </div>

                        </div>

                    </div>

                </div>
            )}

            {/* ================= USER PAGE ================= */}

            {page === "user" && (
                <div className="user-page">

                    <div className="user-header">

                        <div>
                            <h1>BUZZER ARENA</h1>
                            <p>
                                {topic ||
                                    "LIVE GAME"}
                            </p>
                        </div>

                        <div className="user-game-code">
                            CODE:{" "}
                            <strong>
                                {gameCode}
                            </strong>
                        </div>

                        <button
                            className="exit-button"
                            onClick={exitUser}
                        >
                            EXIT
                        </button>

                    </div>

                    <div className="user-layout">

                        <div className="user-main">

                            <div className="topic-display">
                                <span>TOPIC</span>
                                <strong>
                                    {topic || "-"}
                                </strong>
                            </div>

                            <button
                                className={`big-buzzer ${buzzed
                                    ? "buzzed"
                                    : ""
                                    }`}
                                onClick={
                                    pressBuzzer
                                }
                                disabled={buzzed}
                            >
                                {buzzed
                                    ? "BUZZED"
                                    : "BUZZ"}
                            </button>

                            {buzzed &&
                                position && (
                                    <div className="your-position">
                                        YOUR POSITION:{" "}
                                        <strong>
                                            {position}
                                        </strong>
                                    </div>
                                )}

                            <div className="answer-box">

                                <input
                                    type="text"
                                    value={
                                        userAnswer
                                    }
                                    onChange={(e) =>
                                        setUserAnswer(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Type your answer..."
                                    onKeyDown={(e) => {
                                        if (
                                            e.key ===
                                            "Enter"
                                        ) {
                                            sendAnswer();
                                        }
                                    }}
                                />

                                <button
                                    className="purple-button"
                                    onClick={
                                        sendAnswer
                                    }
                                >
                                    SEND
                                </button>

                            </div>

                        </div>

                        <div className="user-side">

                            <div className="panel">

                                <div className="panel-title">
                                    <h3>
                                        PLAYERS ONLINE
                                    </h3>
                                </div>

                                <div className="panel-content">

                                    {players.length ===
                                        0 ? (
                                        <div className="empty-state">
                                            No players yet
                                        </div>
                                    ) : (
                                        players.map(
                                            (
                                                player
                                            ) => (
                                                <div
                                                    className="player-item"
                                                    key={
                                                        player.id
                                                    }
                                                >

                                                    <span className="player-name">
                                                        {
                                                            player.userName
                                                        }
                                                    </span>

                                                    {player.buzzed && (
                                                        <span className="player-buzzed">
                                                            BUZZED
                                                        </span>
                                                    )}

                                                </div>
                                            )
                                        )
                                    )}

                                </div>
                            </div>

                            <div className="panel">

                                <div className="panel-title">
                                    <h3>
                                        BUZZER ORDER
                                    </h3>
                                </div>

                                <div className="panel-content">

                                    {buzzOrder.length ===
                                        0 ? (
                                        <div className="empty-state">
                                            No buzzers yet
                                        </div>
                                    ) : (
                                        buzzOrder.map(
                                            (
                                                item
                                            ) => (
                                                <div
                                                    className="buzzer-order-item"
                                                    key={
                                                        item.position
                                                    }
                                                >

                                                    <div className="order-number">
                                                        {
                                                            item.position
                                                        }
                                                    </div>

                                                    <div className="order-user">
                                                        {
                                                            item.userName
                                                        }
                                                    </div>

                                                </div>
                                            )
                                        )
                                    )}

                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default App;