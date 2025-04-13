import React from "react";
import "./dashboard.css";
import SearchIcon from "@mui/icons-material/Search";
import { useState, useEffect, useRef } from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import ExploreIcon from "@mui/icons-material/Explore";
import NotificationsIcon from "@mui/icons-material/Notifications";
import VideoCallIcon from "@mui/icons-material/VideoCall"; // Changed from BookmarkIcon
import Conversation from "../Conversation/coversation";
import Chats from "../Chats/chats";
import ForumIcon from "@mui/icons-material/Forum";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../../socket";
import useNavigation from "../../utils/navigate";
import logo from "../../assets/logo.png";
import { apiCall, appHost, getMediaPath } from "../../utils/api";
import { FaHome, FaUsers, FaEnvelope, FaVideo, FaSignOutAlt } from 'react-icons/fa';


const Dashboard = ({ setLoginFunc }) => {
    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [queryParam, setQueryParam] = useState("");
    const [searchData, setSearchedData] = useState([]);
    const [conversation, setConversation] = useState([]);
    const [conversationMessages, setConversationMessages] = useState({});
    const [unreadMessages, setUnreadMessages] = useState({});
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const ref = useRef();

    function timeout(delay) {
        return new Promise((res) => setTimeout(res, delay));
    }

    const { goTo } = useNavigation();

    useEffect(() => {
        // Get user profile
        const userInfo = JSON.parse(localStorage.getItem("user"));
        if (userInfo) {
            setUserProfile(userInfo);
        }
    }, []);

    const handleOpenAiChat = () => {
        // Navigate to AI chat route in a new tab
        window.open("/ai-chat", "_blank");
    };

    const handleOpenFeed = () => {
        goTo("feed");
    };

    const handleOpenCommunities = () => {
        goTo("communities");
    };

    // Updated navigation handler for video call with correct route
    const handleOpenVideoCall = () => {
        goTo("vc");
    };

    const handleSelectedUser = (id, userDetails) => {
        setSelectedUserDetails(userDetails);
        setSelectedId(id);
        socket.emit("joinConversation", id);

        // Mark as read when selecting a conversation
        if (unreadMessages[id]) {
            const updatedUnread = { ...unreadMessages };
            delete updatedUnread[id];
            setUnreadMessages(updatedUnread);
        }
    };

    const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
            setSearchedData([]);
            setQueryParam("");
        }
    };

    const fetchConversation = async () => {
        try {
            console.log(appHost);
            const response = await axios.get(
                `https://${appHost}/chat/api/conversation/get-conversation`,
                { withCredentials: true },
            );
            console.log(response);
            setConversation(response.data.conversations);

            // Fetch last message for each conversation
            response.data.conversations.forEach(async (conv) => {
                try {
                    const msgResponse = await axios.get(
                        `https://${appHost}/chat/api/chat/get-message-chat/${conv._id}`,
                        { withCredentials: true },
                    );

                    if (
                        msgResponse.data.message &&
                        msgResponse.data.message.length > 0
                    ) {
                        const lastMsg =
                            msgResponse.data.message[
                            msgResponse.data.message.length - 1
                            ];
                        setConversationMessages((prev) => ({
                            ...prev,
                            [conv._id]: lastMsg.message,
                        }));
                    }
                } catch (err) {
                    console.log(err);
                }
            });
        } catch (err) {
            console.log(err);
        }
    };

    const handleDeleteConversation = async (conversationId) => {
        try {
            // First confirm with the user if they really want to delete
            if (
                !window.confirm(
                    "Are you sure you want to delete this conversation?",
                )
            ) {
                return;
            }

            // Call the backend API to delete the conversation
            await axios.delete(
                `http://localhost:8000/api/conversation/delete-conversation/${conversationId}`,
                { withCredentials: true },
            );

            // Remove from frontend state
            setConversation((prevConversations) =>
                prevConversations.filter((conv) => conv._id !== conversationId),
            );

            // Clear conversation messages state
            setConversationMessages((prev) => {
                const updated = { ...prev };
                delete updated[conversationId];
                return updated;
            });

            // Clear unread messages state
            setUnreadMessages((prev) => {
                const updated = { ...prev };
                delete updated[conversationId];
                return updated;
            });

            // If the deleted conversation was the selected one, clear the selected state
            if (selectedId === conversationId) {
                setSelectedId(null);
                setSelectedUserDetails(null);
            }
        } catch (err) {
            console.log(err);
            alert("Failed to delete conversation. Please try again.");
        }
    };

    const fetchUserBySearch = async () => {
        setSearchedData([]);
        setLoading(true);
        try {
            await apiCall(
                `/v1/users?query=${queryParam}`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    // const ownId = userProfile?.username;
                    const filteredUsers = response.users.filter((user) => {
                        user.profile_path = getMediaPath(user.profile_path);
                        // Skip filtering if no conversations yet
                        if (!conversation.length) return true;

                        // Check if user is already in any conversation
                        return !conversation.some((conv) =>
                            conv.members.some(
                                (member) => member.username === user.username,
                            ),
                        );
                    });
                    setSearchedData(filteredUsers);
                },
            );
        } catch (err) {
            console.log(err);
        }
        await timeout(500);
        setLoading(false);
    };

    useEffect(() => {
        if (queryParam.length !== 0) {
            fetchUserBySearch();
        }
    }, [queryParam]);

    useEffect(() => {
        fetchConversation();

        // Setup socket listeners
        socket.on("receiveMessage", (message) => {
            // Update last message
            if (message.conversation) {
                setConversationMessages((prev) => ({
                    ...prev,
                    [message.conversation]: message.message,
                }));

                // Add unread notification if not in current conversation
                if (message.conversation !== selectedId) {
                    setUnreadMessages((prev) => ({
                        ...prev,
                        [message.conversation]: true,
                    }));
                }
            }
        });

        return () => {
            socket.off("receiveMessage");
        };
    }, [selectedId]);

    useEffect(() => {
        if (searchData.length) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchData]);

    const handleLogout = async () => {
        try {
            await axios.post(
                `https://${appHost}/api/v1/users/logout`,
                {},
                { withCredentials: true },
            );
            localStorage.clear();
            // localStorage.removeItem("userInfo");
            // localStorage.removeItem("isLogin");
            // setLoginFunc(false);
            goTo("login");
        } catch (err) {
            console.log(err);
            // Even if there's an error, clear local storage and redirect
            localStorage.removeItem("userInfo");
            localStorage.removeItem("isLogin");
            setLoginFunc(false);
            goTo("login");
        }
    };

    const handleCreateConv = async (id) => {
        // Get the current user's ID
        const ownId = userProfile?.username;

        // Check if conversation already exists with this user
        let existingConversation = null;

        for (const conv of conversation) {
            // Check if this conversation contains the searched user
            const hasSearchedUser = conv.members.some(
                (member) => member.username === id,
            );
            // Check if this conversation also contains the current user
            const hasCurrentUser = conv.members.some(
                (member) => member.username === ownId,
            );

            if (hasSearchedUser && hasCurrentUser) {
                existingConversation = conv;
                break;
            }
        }

        if (existingConversation) {
            // Select the existing conversation
            const friendItem = existingConversation.members.filter(
                (member) => member.username !== ownId,
            );
            handleSelectedUser(existingConversation.username, friendItem);
            setQueryParam("");
            setSearchedData([]);
        } else {
            // Create new conversation
            try {
                const response = await axios.post(
                    `https://${appHost}/chat/api/conversation/add-conversation`,
                    { recieverId: id },
                    { withCredentials: true },
                );
                // Wait for conversation to be created and fetch updated list
                await fetchConversation();

                // Find the new conversation to select it
                const newConv = response.data.savedConversation;
                if (newConv) {
                    const friendItem = newConv.members.filter(
                        (member) => member._id !== ownId,
                    );
                    handleSelectedUser(newConv._id, friendItem);
                }

                setQueryParam("");
                setSearchedData([]);
            } catch (err) {
                console.log(err);
            }
        }
    };

    const handleSearchSubmit = () => {
        if (queryParam.trim() === "") return;

        const searchExistingConversations = () => {
            const ownId = userProfile?._id;

            // Search existing conversations first
            for (const conv of conversation) {
                const friend = conv.members.find(
                    (member) => member._id !== ownId,
                );

                if (
                    friend &&
                    (friend.name
                        .toLowerCase()
                        .includes(queryParam.toLowerCase()) ||
                        friend.mobileNumber.includes(queryParam))
                ) {
                    // Found matching user in existing conversations
                    handleSelectedUser(conv._id, [friend]);
                    setQueryParam("");
                    return true;
                }
            }
            return false; // No match found
        };

        // If we didn't find a match in existing conversations, do API search
        if (!searchExistingConversations()) {
            fetchUserBySearch();
        }
    };

    return (
        <div className="dashboard">
            <div className="dashboard-logo" onClick={() => goTo("feed")}>
                <img src={logo} alt="Logo" width="100%" height="100%" />
            </div>
            <div className="dashboard-card">
                {/* New Sidebar */}
                <div className="dashboard-sidebar">
                    <div className="sidebar-profile">
                        {userProfile && (
                            <img
                                src={userProfile.profile_path}
                                alt="My Profile"
                            />
                        )}
                    </div>
                    <div className="sidebar-icons">
                        <div className="sidebar-icon">
                            < FaHome size={24} onClick={handleOpenFeed} />
                        </div>
                        <div className="sidebar-icon">
                            <FaUsers size={24} onClick={handleOpenCommunities} />
                        </div>
                        <div className="sidebar-icon-selected">
                            <FaEnvelope size={24} />
                        </div>
                        {/* Changed BookmarkIcon to VideoCallIcon with click handler */}
                        <div
                            className="sidebar-icon"
                            onClick={handleOpenVideoCall}
                        >
                            <FaVideo size={24} />
                        </div>
                    </div>
                    <div className="sidebar-logout" onClick={handleLogout}>
                        <FaSignOutAlt size={28} />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="dashboard-conversation">
                    <div className="ai-icon" onClick={handleOpenAiChat}>
                        <div className="ai-circle"></div>
                    </div>
                    <div className="dashboard-conv-block">
                        <div className="dashboard-title-block">
                            <div className="bold">Messages</div>
                        </div>
                        <div className="searchBoxDiv">
                            <input
                                value={queryParam}
                                onChange={(event) => {
                                    setQueryParam(event.target.value);
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearchSubmit();
                                    }
                                }}
                                type="text"
                                placeholder="Search"
                                className="searchBox"
                            />
                            <button
                                type="submit"
                                className="searchIcon"
                                onClick={handleSearchSubmit}
                            >
                                <SearchIcon />
                            </button>

                            {searchData.length ? (
                                <div ref={ref} className="searched-box">
                                    {searchData.map((item, index) => {
                                        return (
                                            <div
                                                className="search-item"
                                                key={index}
                                                onClick={() =>
                                                    handleCreateConv(
                                                        item.username,
                                                    )
                                                }
                                            >
                                                <img
                                                    className="search-item-profile"
                                                    src={item.profile_path}
                                                    alt="profile"
                                                />
                                                <div>{item.name}</div>
                                                <div className="search-item-mobile">
                                                    {item.username}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : queryParam.length !== 0 &&
                                searchData.length === 0 ? (
                                <div ref={ref} className="searched-box">
                                    <div className="search-item">
                                        <div>
                                            {loading
                                                ? "Loading..."
                                                : "No Data Found"}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="conv-block">
                            {conversation.map((item, index) => {
                                return (
                                    <Conversation
                                        key={index}
                                        active={item._id === selectedId}
                                        handleSelectedUser={handleSelectedUser}
                                        handleDeleteConversation={
                                            handleDeleteConversation
                                        }
                                        item={item}
                                        id={item._id}
                                        members={item.members}
                                        lastMessage={
                                            conversationMessages[item._id]
                                        }
                                        unread={unreadMessages[item._id]}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Chat Area or Empty State */}
                {selectedUserDetails ? (
                    <Chats
                        selectedId={selectedId}
                        selectedUserDetails={selectedUserDetails}
                        updateLastMessage={(message) => {
                            setConversationMessages((prev) => ({
                                ...prev,
                                [selectedId]: message,
                            }));
                        }}
                    />
                ) : (
                    <div className="noChatSelected">
                        <ForumIcon sx={{ fontSize: "72px" }} />
                        <div>No Chats Selected</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
