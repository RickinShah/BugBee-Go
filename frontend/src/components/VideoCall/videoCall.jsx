import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./videoCall.css";
import useNavigation from "../../utils/navigate";
import { vcHost } from "../../utils/api";
import logo from "../../assets/logo.png";

const VideoCall = () => {
    const [meetingCode, setMeetingCode] = useState("");
    const { goTo } = useNavigation();
    const navigate = useNavigate();
    const [user, setUser] = useState(() =>
        JSON?.parse(localStorage.getItem("user")),
    );

    const handleStartCall = () => {
        // const config = config;
        // Logic to start a call
        console.log("Starting new meeting");
        // You would typically redirect to the actual call page or change state
        window.location.href = `https://${vcHost}/join?room=${generateRandomRoom()}&roomPassword=0&name=${user.username}&avatar=${user.profile_path}&audio=0&video=0&screen=0&hide=0&notify=1&duration=unlimited`;
    };

    const generateRandomRoom = () => {
        let result = "";
        let characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let charactersLength = characters.length;
        for (let i = 0; i < 7; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength),
            );
        }
        return result;
    };

    const handleJoinMeeting = () => {
        if (meetingCode.trim()) {
            console.log(`Joining meeting with code: ${meetingCode}`);
            // You would typically redirect to the actual call page or change state
            window.location.href = `https://${vcHost}/join?room=${meetingCode}&roomPassword=0&name=${user.username}&avatar=0&audio=0&video=0&screen=0&hide=0&notify=0&duration=unlimited`;
        }
    };

    const handleBackToDashboard = () => {
        // Navigate back to the dashboard
        try {
            goTo("feed");
            console.log("Navigating back to dashboard");
        } catch (error) {
            console.error("Navigation error:", error);
            // Fallback navigation if goTo fails
            window.location.href = "/feed";
        }
    };

    // Format current date
    const getCurrentDate = () => {
        const options = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        };
        return new Date().toLocaleDateString("en-US", options);
    };

    // Format current time
    const getCurrentTime = () => {
        const options = { hour: "2-digit", minute: "2-digit" };
        return new Date().toLocaleTimeString("en-US", options);
    };

    return (
        <div className="video-call-container">
            <div className="dashboard-header">
                <div className="header-left">
                    <button
                        className="back-button"
                        onClick={handleBackToDashboard}
                        aria-label="Back to Dashboard"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>

                    <div className="vc-logo ml-2 mt-2 lg:ml-0 lg-mt-0">
                        <img
                            src="BBlogo.svg"
                            alt="Logo"
                            width="100%"
                            height="100%"
                        />
                    </div>

                    <h2 className="vc">Video Conference</h2>
                </div>
                <div
                    className={`header-right ${window.innerWidth >= 768 ? "" : "fixed right-3 mt-0"}`}
                >
                    <button
                        className="icon-button"
                        onClick={() => goTo("settings")}
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="user-card">
                    <div className="user-info">
                        <div className="w-12 h-12 bg-[#ffffff86] rounded-full overflow-hidden flex-shrink-0 cursor-pointer">
                            <img
                                src={user.profile_path || "default-avatar.png"}
                                alt="profile"
                                className="w-full h-full object-cover"
                                onClick={() =>
                                    navigate(`/profile/${user.username}`)
                                }
                            />
                        </div>
                        <div
                            className="user-details cursor-pointer"
                            onClick={() =>
                                navigate(`/profile/${user.username}`)
                            }
                        >
                            <h3>{user.name || "User"}</h3>
                            <p>@{user.username || "username"}</p>
                        </div>
                    </div>
                    <div className="time-info">
                        <p className="current-time">{getCurrentTime()}</p>
                        <p className="current-date">{getCurrentDate()}</p>
                    </div>
                </div>

                <div className="glass-container">
                    <h1 className="headline">
                        Connect with Friends <br></br>Now.
                    </h1>

                    <div className="meeting-controls">
                        <div className="mix">
                            <button
                                className="new-meeting-button"
                                onClick={handleStartCall}
                            >
                                <i className="fas fa-video"></i> New Meeting
                            </button>
                            <span className="m-auto lg:m-0">or</span>
                            <div className="join-meeting">
                                <div className="input-container">
                                    <input
                                        type="text"
                                        placeholder="enter a code"
                                        value={meetingCode}
                                        onChange={(e) =>
                                            setMeetingCode(e.target.value)
                                        }
                                    />
                                </div>
                                <button
                                    className="join-button"
                                    onClick={handleJoinMeeting}
                                >
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoCall;
