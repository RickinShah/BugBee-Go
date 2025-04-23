import React from "react";
import "./dashboard.css";
import SearchIcon from "@mui/icons-material/Search";
import { useState, useEffect, useRef } from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import ExploreIcon from "@mui/icons-material/Explore";
import NotificationsIcon from "@mui/icons-material/Notifications";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import Conversation from "../Conversation/coversation";
import Chats from "../Chats/chats";
import ForumIcon from "@mui/icons-material/Forum";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../../socket";
import useNavigation from "../../utils/navigate";
import logo from "../../assets/logo.png";
import { apiCall, chatURL, getMediaPath } from "../../utils/api";
import {
    FaHome,
    FaUsers,
    FaEnvelope,
    FaVideo,
    FaSignOutAlt,
    FaCog,
    FaPlus,
} from "react-icons/fa";

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
    const [isMobileView, setIsMobileView] = useState(false);
    const [showChatOnMobile, setShowChatOnMobile] = useState(false);
    const ref = useRef();
    const navigate = useNavigate();

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

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 768);
        };

        // Set initial value
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Clean up
        return () => window.removeEventListener('resize', handleResize);
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

    const handleOpenVideoCall = () => {
        goTo("vc");
    };

    const handleSelectedUser = (id, userDetails) => {
        setSelectedUserDetails(userDetails);
        setSelectedId(id);
        socket.emit("joinConversation", id);

        // On mobile, show the chat view
        if (isMobileView) {
            setShowChatOnMobile(true);
        }

        // Mark as read when selecting a conversation
        if (unreadMessages[id]) {
            const updatedUnread = { ...unreadMessages };
            delete updatedUnread[id];
            setUnreadMessages(updatedUnread);
        }
    };

    const handleBackToConversations = () => {
        setShowChatOnMobile(false);
    };

    const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
            setSearchedData([]);
            setQueryParam("");
        }
    };

    const fetchConversation = async () => {
        try {
            const response = await axios.get(
                `${chatURL}/api/conversation/get-conversation`,
                { withCredentials: true },
            );
            setConversation(response.data.conversations);

            // Fetch last message for each conversation
            response.data.conversations.forEach(async (conv) => {
                try {
                    const msgResponse = await axios.get(
                        `${chatURL}/api/chat/get-message-chat/${conv._id}`,
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
                `${chatURL}/api/v1/users/logout`,
                {},
                { withCredentials: true },
            );
            localStorage.clear();
            goTo("login");
        } catch (err) {
            console.log(err);
            localStorage.removeItem("userInfo");
            localStorage.removeItem("isLogin");
            setLoginFunc(false);
            goTo("login");
        }
    };

    const handleCreateConv = async (id) => {
        const ownId = userProfile?.username;

        let existingConversation = null;

        for (const conv of conversation) {
            const hasSearchedUser = conv.members.some(
                (member) => member.username === id,
            );
            const hasCurrentUser = conv.members.some(
                (member) => member.username === ownId,
            );

            if (hasSearchedUser && hasCurrentUser) {
                existingConversation = conv;
                break;
            }
        }

        if (existingConversation) {
            const friendItem = existingConversation.members.filter(
                (member) => member.username !== ownId,
            );
            handleSelectedUser(existingConversation.username, friendItem);
            setQueryParam("");
            setSearchedData([]);
        } else {
            try {
                const response = await axios.post(
                    `${chatURL}/chat/api/conversation/add-conversation`,
                    { recieverId: id },
                    { withCredentials: true },
                );
                await fetchConversation();

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
                    handleSelectedUser(conv._id, [friend]);
                    setQueryParam("");
                    return true;
                }
            }
            return false;
        };

        if (!searchExistingConversations()) {
            fetchUserBySearch();
        }
    };

    return (
        <div className="dashboard">
            <div
                className="dashboard-logo cursor-pointer"
                onClick={() => goTo("feed")}
            >
                <img src={logo} alt="Logo" width="100%" height="100%" />
            </div>
            <div className="dashboard-card cursor-default">
                {!isMobileView && (
                    <div className="dashboard-sidebar">
                        <div
                            className="sidebar-profile"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${userProfile.username}`);
                            }}
                        >
                            {userProfile && (
                                <img
                                    src={userProfile.profile_path}
                                    alt="My Profile"
                                />
                            )}
                        </div>
                        <div className="sidebar-icons">
                            <div className="sidebar-icon">
                                <FaHome size={24} onClick={handleOpenFeed} />
                            </div>
                            <div className="sidebar-icon">
                                <FaUsers
                                    size={24}
                                    onClick={handleOpenCommunities}
                                />
                            </div>
                            <div className="sidebar-icon-selected">
                                <FaEnvelope size={24} />
                            </div>
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
                )}

                {(!isMobileView || (isMobileView && !showChatOnMobile)) && (
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
                )}

                {selectedUserDetails && (!isMobileView || (isMobileView && showChatOnMobile)) ? (
                    <Chats
                        selectedId={selectedId}
                        selectedUserDetails={selectedUserDetails}
                        updateLastMessage={(message) => {
                            setConversationMessages((prev) => ({
                                ...prev,
                                [selectedId]: message,
                            }));
                        }}
                        isMobileView={isMobileView}
                        onBackClick={handleBackToConversations}
                    />
                ) : (
                    !isMobileView && (
                        <div className="noChatSelected">
                            <ForumIcon sx={{ fontSize: "72px" }} />
                            <div>No Chats Selected</div>
                        </div>
                    )
                )}
            </div>
            {/* Mobile Navigation */}
            <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-[#242380]/95 p-2 flex justify-around items-center shadow-lg ${showChatOnMobile ? 'hidden' : ''}`}>
                {[
                    {
                        icon: <FaHome className="w-7 h-7" />,
                        action: () => {
                            goTo("feed");
                        },
                    },
                    {
                        icon: <FaEnvelope className="w-7 h-7" />,
                        action: () => {
                            goTo("chat");
                        },
                    },
                    {
                        icon: <FaVideo className="w-7 h-7" />,
                        action: () => goTo("vc"),
                    },
                    {
                        icon: <FaUsers className="w-7 h-7" />,
                        action: () => goTo("communities"),
                    },
                    {
                        icon: <FaPlus className="w-7 h-7 text-[#e81bbb]" />,
                        action: () => goTo("postUpload"),
                    }
                    ,
                    {
                        icon: <FaCog className="w-6 h-6" />,
                        action: () => goTo("settings"),
                    },
                ].map((item, index) => (
                    <button
                        key={index}
                        onClick={item.action}
                        className="p-2 hover:text-gray-300 transition-colors"
                    >
                        {item.icon}
                    </button>
                ))}
            </div>







        </div>
    );
};

export default Dashboard;
