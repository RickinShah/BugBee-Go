import { useState, useEffect, useRef } from "react";
import { FaSearch, FaPaperPlane } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Card from "./Card.jsx";
import { apiCall, chatApiCall, getMediaPath } from "../../utils/api.js";
import { validationError } from "../../utils/errors.js";
import useNavigation from "../../utils/navigate.jsx";
import addButton from "../../assets/plus-community.png";
import backButton from "../../assets/back-1.png";
import toggleChannelsButton from "../../assets/channels.png";
import toggleMembersButton from "../../assets/members.png";
import closeButton from "../../assets/close.png";
import socket from "../../socket.js";
import EmojiPicker from "emoji-picker-react";


const Communities = () => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef();
    const inputRef = useRef();
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [toggleChannel, settoggleChannel] = useState(false);
    const [channels, setChannels] = useState([]);
    const [toggleCreateCommunity, settoggleCreateCommunity] = useState(false);
    const [roles, setRoles] = useState([]);
    const [members, setMembers] = useState([]);
    const [joinedCommunities, setJoinedCommunities] = useState([]);
    const [toggleChannels, setToggleChannels] = useState(false);
    const [toggleMembers, setToggleMembers] = useState(false);
    const [profilePath] = useState(() => localStorage.getItem("profile_path"));
    const [isSelected, setSelected] = useState(false);
    const [selectedCommunityId, setSelectedCommunityId] = useState();
    const { goTo } = useNavigation();
    const [currentCommunity, setCurrentCommunity] = useState({});
    const [user] = useState(JSON.parse(localStorage.getItem("user")));
    const [channelName, setChannelName] = useState("");
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedCommunityHandle, setSelectedCommunityHandle] = useState("");
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedChannelId, setSelectedChannelId] = useState(null);
    const messagesEndRef = useRef(null);
    const [selectedChannel, setSelectedChannel] = useState({});

    const formatMessageTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };



    // Toggle emoji picker visibility
    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    // Handle emoji selection
    const onEmojiClick = (emojiData) => {
        setNewMessage(prevMessage => prevMessage + emojiData.emoji);

        // Focus back on input after emoji selection
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Chat-related functions
    const fetchMessages = async (channelId) => {
        try {
            await apiCall(
                `/v1/channel/chats/${channelId}`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    console.log(response.messages)
                    setMessages(response.messages || []);
                },
            );
        } catch (err) {
            validationError(err);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChannelId) return;


        try {
            const formData = new FormData();
            formData.append("conversation", selectedChannelId)
            formData.append("content", newMessage)
            await apiCall(
                `/v1/channel/chats`,
                "POST",
                formData,
                {},
                "include",
                true,
                (response) => {
                    console.log(response.message)
                    // setMessages((prev) => [...prev, response.message]);
                    socket.emit("sendMessage", selectedChannelId, response.message)
                    setNewMessage("")
                },
            );
        } catch (err) {
            validationError(err);
        }
    };

    useEffect(() => {
        socket.on("receiveMessage", (response) => {
            setMessages((prev) => [...prev, response])
        });

        return () => {
            socket.off("receiveMessage");
        }
    }, [selectedChannelId])

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Existing functions
    function CreateCommunity() {
        settoggleCreateCommunity(!toggleCreateCommunity);
    }

    function ChannelToggleFunction() {
        if (!toggleChannel) {
            setChannelName("");
            setSelectedRoles([]);
        }
        settoggleChannel(!toggleChannel);
    }

    const navigate = useNavigate();

    const goToUserPage = () => {
        navigate("/feed");
    };

    const goToCommunitySetting = () => {
        navigate(`/community/${currentCommunity.community_handle}/settings`);
    };

    const goToCreateCommunity = () => {
        navigate("/community/create");
    };

    const handleCommunityClick = (community) => {
        localStorage.setItem("currentCommunity", JSON.stringify(community));
        setCurrentCommunity(community);
        setSelected(true);
        setToggleChannels(true);
        setSelectedCommunityHandle(community.community_handle);
        setSelectedCommunityId(community.community_id);
        fetchMembers(community.community_handle);
        fetchChannels(community.community_handle);
        setSelectedChannelId(null); // Reset channel selection
        setMessages([]); // Clear messages
        setSearchQuery(""); // Clear search
        setSearchResults([]);

    };

    const handleChannelClick = (channel) => {
        setSelectedChannelId(channel.channel_id);
        setSelectedChannel(channel);
        fetchMessages(channel.channel_id);
        socket.emit("joinChannel", channel.channel_id);
        setSearchQuery(""); // Clear search when channel is selected
        setSearchResults([]);
    };


    const fetchChannels = async (handle) => {
        try {
            await apiCall(
                `/v1/community/${handle}/channels`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    setChannels(response.channels);
                },
            );
        } catch (err) {
            validationError(err);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.trim() === "") {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            await apiCall(
                `/v1/communities/search?query=${encodeURIComponent(query)}&size=10`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    const communities = Object.values(response.communities).map(
                        (community) => ({
                            handle: community.community_handle,
                            name: community.name || community.username,
                            profilePath: getMediaPath(community.profile_path),
                        }),
                    );
                    setSearchResults(communities || []);
                    setIsSearching(false);
                },
            );
        } catch (error) {
            console.error("Search failed:", error);
            setIsSearching(false);
        }
    };

    const fetchRoles = async (handle) => {
        try {
            await apiCall(
                `/v1/community/${handle}/roles`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    const formattedRoles = response.roles.map((role) => ({
                        ID: role.role_id,
                        Name: role.name,
                    }));
                    setRoles(formattedRoles);
                },
            );
        } catch (err) {
            validationError(err.errors);
        }
    };

    const handleRoleSelection = (roleId) => {
        if (selectedRoles.includes(roleId)) {
            setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
        } else {
            setSelectedRoles([...selectedRoles, roleId]);
        }
    };

    const joinCommunity = async (community) => {
        console.log(community.handle)
        await apiCall(
            `/v1/community/${community.handle}`,
            "POST",
            null,
            {},
            "include",
            false,
            (response) => {
                console.log(response);
            },
        )
    }

    const createChannel = async () => {
        if (!channelName.trim()) {
            alert("Please enter a channel name");
            return;
        }

        if (selectedRoles.length === 0) {
            alert("Please select at least one role");
            return;
        }

        const handle = selectedCommunityHandle;

        try {
            await apiCall(
                `/v1/community/${handle}/channels`,
                "POST",
                {
                    name: channelName,
                    roles: selectedRoles,
                },
                {},
                "include",
                false,
                (response) => {
                    ChannelToggleFunction();
                    if (prevChannels) {
                        setChannels((prevChannels) => [
                            ...prevChannels,
                            response.channel,
                        ]);

                    }
                },
            );
        } catch (err) {
            validationError(err.errors);
        }
    };

    const fetchMembers = async (community_handle) => {
        await apiCall(
            `/v1/community/${community_handle}/members`,
            "GET",
            null,
            {},
            "include",
            false,
            (response) => {
                setMembers(response.members);
            },
        );
    };

    const fetchJoinedCommunities = async () => {
        await apiCall(
            "/v1/communities/joined",
            "GET",
            null,
            {},
            "include",
            false,
            (response) => {
                setJoinedCommunities(response.communities);
            },
        );
    };

    useEffect(() => {
        fetchJoinedCommunities();
    }, []);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="bg-gradient-to-br from-[#1e3a8a] via-[#0f172a] to-[#1e40af] w-full h-screen flex flex-col md:flex-row font-sans">
            {/* Sidebar */}
            <div className="bg-[#1e3a8a] w-full md:w-20 h-16 md:h-full flex flex-row md:flex-col justify-between items-center md:items-stretch shadow-2xl fixed top-0 left-0 z-20">
                <div className="p-2 md:p-3">
                    <div className="bg-blue-950 rounded-full p-2 shadow-md">
                        <img
                            src={profilePath}
                            alt="profile"
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full cursor-pointer"
                            onClick={() =>
                                navigate(`/profile/${user.username}`)
                            }
                        />
                    </div>
                </div>

                <div className="flex md:flex-1 p-1 overflow-x-auto md:overflow-y-auto scrollbar-hide flex-row md:flex-col">
                    {joinedCommunities?.map((community) => (
                        <div
                            key={community.community_id}
                            className={`w-12 h-12 md:w-12 md:h-12 flex-shrink-0 md:my-2 mx-1 md:mx-auto rounded-full border-2 transition-all duration-300
                ${selectedCommunityId === community.community_id
                                    ? "border-blue-600 bg-blue-100 shadow-lg ring-4 ring-blue-500 ring-offset-2 scale-110"
                                    : "border-blue-500/50 hover:border-blue-400 hover:scale-110"
                                }`}
                        >
                            <button
                                className="w-full h-full"
                                onClick={() => handleCommunityClick(community)}
                            >
                                <img
                                    src={getMediaPath(community.profile_path)}
                                    alt={community.name}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={CreateCommunity}
                        className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 md:my-2 mx-1 md:mx-auto rounded-full bg-blue-800/50 hover:bg-blue-700/70 transition-colors duration-300 flex items-center justify-center"
                    >
                        <img
                            src={addButton}
                            alt="add community"
                            className="w-6 h-6 md:w-7 md:h-7 invert"
                        />
                    </button>
                </div>
                <div className="p-4 md:p-4 hidden md:block">
                    <div className="w-full h-auto bg-blue-700/80 text-white rounded-xl font-medium flex flex-col items-center justify-center space-y-4 py-4">
                        <button
                            className="w-1/2 h-full p-1 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center"
                            onClick={() => setToggleMembers(!toggleMembers)}
                        >
                            <img
                                src={toggleMembersButton}
                                alt="members"
                                className="w-4 h-4 invert"
                            />
                        </button>
                    </div>
                </div>

                <div className="p-4 md:p-6 hidden md:block">
                    <button
                        className="w-full h-6 md:h-8 bg-blue-700/80 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center gap-0"
                        onClick={goToUserPage}
                    >
                        <img
                            src={backButton}
                            alt="back"
                            className="w-3 h-3 invert"
                        />
                        <span className="text-sm font-semibold"></span>
                    </button>
                </div>
            </div>

            {/* Mobile Community Toggle */}
            {toggleCreateCommunity && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="w-11/12 max-w-sm md:max-w-md bg-gradient-to-b from-blue-950 to-blue-900 rounded-2xl p-6 shadow-xl transform transition-all duration-300">
                        <button
                            onClick={goToCreateCommunity}
                            className="w-full my-2 h-12 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                        >
                            Create Community
                        </button>
                        <button
                            onClick={CreateCommunity}
                            className="w-full my-2 h-12 bg-blue-800/50 hover:bg-blue-700/70 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Container */}
            <div className="flex-1 h-[calc(100vh-4rem)] md:h-full flex flex-col md:flex-row mt-16 md:mt-0 md:pl-20">
                {/* Mobile Toggle Buttons */}
                <div className="flex justify-between px-4 py-2 bg-blue-950/30 md:hidden">
                    <button
                        onClick={() => setToggleChannels(!toggleChannels)}
                        className="flex items-center gap-2 text-white font-medium"
                    >
                        <img
                            src={toggleChannelsButton}
                            alt="channels"
                            className="w-5 h-5 invert"
                        />
                        Channels
                    </button>
                    <button
                        onClick={() => setToggleMembers(!toggleMembers)}
                        className="flex items-center gap-2 text-white font-medium"
                    >
                        <img
                            src={toggleMembersButton}
                            alt="members"
                            className="w-5 h-5 invert"
                        />
                        Members - {currentCommunity.member_count || 0}
                    </button>
                </div>

                {/* Channels Sidebar */}
                {toggleChannels && (
                    <div
                        className={`fixed md:static top-16 md:top-0 left-0 md:left-0 w-3/4 md:w-60 h-[calc(100vh-4rem)] md:h-full bg-blue-900/20 flex flex-col backdrop-blur-sm z-30 md:z-10 transition-transform duration-300 ${toggleChannels
                            ? "translate-x-0"
                            : "-translate-x-full"
                            } md:translate-x-0 shadow-md md:shadow-lg`}
                    >
                        <div className="h-16 md:h-20 bg-blue-950/30 flex items-center justify-between px-4 border-b border-blue-800/50">
                            <button
                                className="w-full text-white font-semibold text-lg md:text-xl hover:text-blue-200 transition-colors duration-200 text-left"
                                onClick={goToCommunitySetting}
                            >
                                {currentCommunity.name}
                            </button>
                            <button
                                onClick={() => setToggleChannels(false)}
                                className="md:hidden"
                            >
                                <img
                                    src={closeButton}
                                    alt="close"
                                    className="w-6 h-6 invert"
                                />
                            </button>
                        </div>

                        <div className="flex-1 p-1 md:p-3 space-y-2 md:space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                            <div className="flex justify-between items-center text-white">
                                <span className="font-semibold text-base md:text-lg">
                                    Channels
                                </span>
                                <button
                                    onClick={() => {
                                        ChannelToggleFunction();
                                        fetchRoles(
                                            currentCommunity.community_handle,
                                        );
                                    }}
                                    className="hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-blue-800/30"
                                >
                                    <img
                                        src={addButton}
                                        alt="add"
                                        className="w-6 h-6 invert"
                                    />
                                </button>
                            </div>
                            <div className="flex flex-col items-center">
                                {channels?.map((channel) => (
                                    <button
                                        key={channel.channel_id}
                                        onClick={() =>
                                            handleChannelClick(
                                                channel,
                                            )
                                        }
                                        className={`w-full text-left p-2 rounded-lg ${selectedChannelId ===
                                            channel.channel_id
                                            ? "bg-blue-700 text-white"
                                            : "text-gray-300 hover:bg-blue-800/30"
                                            }`}
                                    >
                                        # {channel.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Channel Modal */}
                {toggleChannel && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                        <div className="w-11/12 max-w-sm md:w-[30rem] bg-blue-950/95 rounded-2xl p-6 md:p-8 shadow-xl transform scale-100 transition-all duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-white text-lg md:text-2xl font-semibold">
                                    Create Channel
                                </h2>
                                <button
                                    onClick={ChannelToggleFunction}
                                    className="hover:scale-110 transition-transform duration-200"
                                >
                                    <img
                                        src={closeButton}
                                        alt="close"
                                        className="w-6 h-6 invert"
                                    />
                                </button>
                            </div>
                            <div className="space-y-4 md:space-y-6">
                                <input
                                    type="text"
                                    placeholder="Channel Name"
                                    className="w-full h-12 bg-blue-900/40 rounded-lg text-white text-center border border-blue-800/50 focus:outline-none focus:border-blue-600 placeholder-blue-300 text-sm md:text-base"
                                    value={channelName}
                                    onChange={(e) =>
                                        setChannelName(e.target.value)
                                    }
                                />
                                <div className="bg-blue-900/40 rounded-lg p-4 max-h-40 md:max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                    {roles.map((role) => (
                                        <div
                                            key={role.ID}
                                            className="flex justify-between items-center py-2 px-3 text-white hover:bg-blue-800/30 rounded-md transition-colors duration-200"
                                        >
                                            <span className="text-sm md:text-base">
                                                {role.Name}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 md:w-5 md:h-5 accent-blue-500 rounded focus:ring-blue-600"
                                                checked={selectedRoles.includes(
                                                    role.ID,
                                                )}
                                                onChange={() =>
                                                    handleRoleSelection(role.ID)
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className="w-full h-12 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                                    onClick={createChannel}
                                >
                                    Create Channel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 bg-gradient-to-br from-blue-950 via-[#0f172a] to-blue-900 p-4 md:p-8 h-full flex flex-col">
                    {!selectedChannelId && (
                        <div className="relative mb-4 max-w-7xl mx-10 md:mx-20">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" />
                            <input
                                type="text"
                                className="w-full h-12 bg-gradient-to-br from-[#242380]/90 to-blue-950/90 rounded-2xl pl-10 pr-4 placeholder-white/70 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-600/50 transition-all"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {isSearching || searchResults.length > 0 ? (
                                <div className="absolute top-14 left-0 right-0 bg-gradient-to-b from-[#242380]/95 to-blue-950/95 rounded-xl shadow-xl max-h-96 overflow-y-auto z-20 border border-white/10">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-gray-300 animate-pulse">
                                            <span className="inline-flex items-center">
                                                <FaSearch className="w-4 h-4 mr-2" />
                                                Searching...
                                            </span>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map(
                                            (community, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center p-3 hover:bg-white/10 border-b border-white/5 last:border-b-0 cursor-pointer transition-all duration-200 group"
                                                    onClick={() =>
                                                        joinCommunity(community)
                                                    }
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 mr-3 border border-white/20 group-hover:border-pink-500/50 transition-colors">
                                                        <img
                                                            src={
                                                                community.profilePath
                                                            }
                                                            alt={`${community.name}'s profile`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-white truncate group-hover:text-pink-400 transition-colors">
                                                                {community.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-400 truncate">
                                                            @{community.handle}
                                                        </div>
                                                    </div>
                                                </div>
                                            ),
                                        )
                                    ) : (
                                        <div className="p-4 text-center text-gray-400">
                                            <span className="inline-flex items-center">
                                                No results found
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Chat Area */}
                    {isSelected && selectedChannelId ? (
                        <div className="flex-1 static overflow-y-auto flex flex-col bg-blue-950/50 rounded-xl  mb-0 p-2.5">

                            <div className="flex-1 overflow-y-auto mb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-blue-900 ">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.sender._id === user._id
                                            ? "justify-end"
                                            : "justify-start"
                                            } mb-3`}
                                    >
                                        <div
                                            className={`max-w-[70%] p-3 rounded-lg ${message.sender._id === user._id
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-700 text-gray-200"
                                                }`}
                                        >
                                            <div className="text-xs text-gray-300 mb-1">
                                                {message.sender.username} •{" "}
                                                {formatMessageTime(message.createdAt)}
                                            </div>
                                            <p>{message.message}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="w-full h-12 bg-blue-900/40 rounded-lg text-white border border-blue-800/50 focus:outline-none focus:border-blue-600 px-4"
                                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                    />

                                    {/* Emoji picker button and dropdown */}
                                    <div className="absolute right-2 bottom-0 flex items-center h-full" ref={emojiPickerRef}>
                                        <button
                                            onClick={toggleEmojiPicker}
                                            className="text-gray-300 hover:text-blue-400 transition-colors mr-2"
                                        >
                                            {/* Emoji icon */}
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.707-8.707a1 1 0 01-1.414-1.414 4 4 0 015.656-5.656 1 1 0 111.414 1.414 2 2 0 00-2.828 2.828 1 1 0 01-1.414 1.414 4 4 0 01-1.414-1.414zM10 15a4 4 0 01-4-4c0-.552.448-1 1-1s1 .448 1 1a2 2 0 104 0c0-.552.448-1 1-1s1 .448 1 1a4 4 0 01-4 4z" clipRule="evenodd" />
                                            </svg>
                                        </button>

                                        {showEmojiPicker && (
                                            <div className="fixed bottom-16 left-0 right-0 md:absolute md:bottom-14 md:right-0 md:left-auto z-50">
                                                <div className="flex justify-center md:justify-end">
                                                    <EmojiPicker
                                                        onEmojiClick={onEmojiClick}
                                                        autoFocusSearch={false}
                                                        theme="dark"
                                                        width={window.innerWidth < 768 ? "90%" : "350px"}
                                                        height="320px"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Send button */}
                                <button
                                    onClick={sendMessage}
                                    className="h-12 w-12 flex items-center justify-center bg-blue-700 hover:bg-blue-600 rounded-lg transition-all duration-200"
                                >
                                    <FaPaperPlane className="text-white" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Select a channel to start chatting
                        </div>
                    )}
                </div>

                {/* Members Sidebar */}
                {toggleMembers && (
                    <div
                        className={`fixed md:static inset-0 md:inset-auto w-3/4 md:w-60 h-full bg-blue-900/20 flex flex-col backdrop-blur-sm z-30 md:z-10 transition-transform duration-300 ${toggleMembers ? "translate-x-0" : "translate-x-full"
                            } md:translate-x-0 shadow-md md:shadow-lg`}
                    >
                        <div className="h-16 md:h-20 bg-blue-950/30 flex items-center justify-between px-6 border-b border-blue-800/50">
                            <span className="text-white font-semibold text-base md:text-lg">
                                Members - {members.length || currentCommunity.member_count || 0}
                            </span>
                            <button
                                onClick={() => setToggleMembers(false)}
                                className="md:hidden"
                            >
                                <img
                                    src={toggleMembersButton}
                                    alt="members"
                                    className="w-5 h-5 invert"
                                />
                            </button>
                        </div>
                        <div className="flex-1 p-4 md:p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                            {members.map((member, index) => (
                                <div
                                    key={index}
                                    className="flex items-center p-2 hover:bg-blue-800/20 rounded-lg transition-all duration-200 group"
                                >
                                    <img
                                        src={getMediaPath(member.profile_path)}
                                        alt={member.username}
                                        className="w-8 md:w-12 h-8 md:h-12 rounded-full object-cover mr-2 md:mr-4 shadow-sm"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium text-sm md:text-base group-hover:text-blue-200 transition-colors">
                                            {member.name}
                                        </span>
                                        <span className="text-white font-medium text-xs md:text-sm group-hover:text-blue-200 transition-colors">
                                            @{member.username}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Communities;
