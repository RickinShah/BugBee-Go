import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { apiCall, getMediaPath } from "../utils/api.js";
import { validationError } from "../utils/errors.js";
import useNavigation from "../utils/navigate.jsx";
import logo from "../assets/logo.png"

import {
    FaHome,
    FaEnvelope,
    FaSearch,
    FaUsers,
    FaComments,
    FaVideo,
    FaBell,
    FaCog,
    FaSignOutAlt,
    FaPlus,
} from "react-icons/fa";

const UserProfile = () => {
    const [user, setUser] = useState({});
    const [username] = useState(useParams().username);
    const [fetchedUser, setFetchedUser] = useState({});
    const { goTo } = useNavigation();

    const [userPosts, setUserPosts] = useState([]);
    const navigate = useNavigate();

    const fetchUser = async () => {
        try {
            apiCall(
                `/v1/users/${username}`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    setUserPosts(response.posts);
                    setFetchedUser(response.user);
                },
            );
        } catch (error) {
            validationError(error);
        }
    };

    useEffect(() => {
        const tempUser = localStorage.getItem("user")
        if (tempUser === null) {
            goTo("login");
        }
        setUser(JSON.parse(tempUser));
        fetchUser();
    }, []);

    return (
        <div className="min-h-screen bg-[#15145d] flex flex-col md:flex-row text-white">
            {/* Left Sidebar - Fixed */}
            <div className="hidden md:block bg-[#080a41] md:w-1/5 h-screen fixed left-0 top-0 shadow-[10px_0_8px_-4px_rgba(0,0,0,0.1)]">
                <div className="h-1/5 p-4">
                    <button onClick={() => goTo("feed")}>
                        <div className="mylogo cursor-pointer">
                            <img
                                src={logo}
                                alt="home"
                                width="100%"
                                height="100%"
                                onClick={() => goTo("feed")}
                            />
                        </div>
                    </button>
                    <div className="userprofile cursor-pointer">
                        <button
                            onClick={() => navigate(`/profile/${username}`)}
                        >
                            <div className="roundprofile">
                                <img
                                    src={user.profile_path}
                                    alt="profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </button>
                        <div className="flex-grow mx-3">
                            <button
                                className="w-full text-left pt-1"
                                onClick={() => navigate(`/profile/${username}`)}
                            >
                                <div className="font-semibold text-sm truncate">
                                    {user.name}
                                </div>
                                <div className="text-gray-400 text-xs truncate">
                                    @{user.username}
                                </div>
                            </button>
                        </div>
                        <button
                            className="flex items-center px-2 py-1 text-white text-sm shrink-0 transition-transform duration-200 hover:scale-[1.02]"
                            onClick={() => goTo("completeProfile")}
                        >
                            <span className="bg-gradient-to-r from-[#d946ef] to-[#9333ea] bg-clip-text text-transparent">
                                Edit
                            </span>
                            <svg
                                className="ml-1.5 w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity duration-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="h-4/5 flex flex-col justify-between py-6 px-4">
                    <div className="space-y-2 text-gray-400 font-medium">
                        {[
                            {
                                icon: <FaHome className="w-6 h-6" />,
                                text: "Home",
                                onClick: () => goTo("feed"),
                            },
                            {
                                icon: <FaUsers className="w-6 h-6" />,
                                text: "Communities",
                                onClick: () => goTo("communities"),
                            },
                            {
                                icon: <FaEnvelope className="w-6 h-6" />,
                                text: "Messages",
                                onClick: () => {
                                    goTo("chat");
                                },
                            },
                            {
                                icon: <FaVideo className="w-6 h-6" />,
                                text: "Video Conference",
                                onClick: () => goTo("vc"),
                            },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className={`flex items-center h-12 rounded-2xl px-4 transition-all duration-300 cursor-pointer ${item.selected
                                    ? "bg-[#9b9b9b6b] text-white"
                                    : "text-gray-400 hover:bg-[#9b9b9b6b] hover:text-white"
                                    }`}
                            >
                                {item.icon}
                                <button
                                    className="text-lg ml-3"
                                    onClick={item.onClick}
                                >
                                    {item.text}
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            apiCall(
                                `/v1/users/logout`,
                                "POST",
                                null,
                                {},
                                "include",
                                false,
                                () => goTo("login"),
                                null,
                            );
                        }}
                        className="bg-gradient-to-b from-[#ff599e] to-[#96003e] w-full h-11 rounded-xl font-semibold text-base hover:from-[#ff85b3] hover:to-[#b00052] transition-all duration-300 flex items-center justify-center shadow-md"
                    >
                        <FaSignOutAlt className="mr-2" /> Log Out
                    </button>
                </div>
            </div>

            {/* Main Content - Instagram Inspired */}
            <div className="w-full md:w-3/5 md:ml-[30%] md:mr-[10%] flex flex-col">
                <div className="h-full w-full overflow-auto scrollbar-hide p-2 md:p-8">
                    {/* Profile Info Section */}
                    <div className="bg-[#1a072cbf] mb-0.5 p-4 md:p-6 rounded-lg">
                        {/* Profile Section */}
                        <div className="flex flex-row items-start md:items-center">
                            {/* Profile Picture */}
                            <div className="flex w-20 h-20 md:w-40 md:h-40 rounded-full border-2 border-gray-300 overflow-hidden flex-shrink-0">
                                <img
                                    src={getMediaPath(fetchedUser.profile_path)}
                                    alt="Profile"
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            <div className="ml-4 md:ml-10 flex flex-col">
                                <h1 className="text-xl md:text-3xl font-semibold mb-0">
                                    {fetchedUser.name}
                                </h1>
                                <p className="text-gray-400 mb-2">
                                    @{fetchedUser.username}
                                </p>
                                <p className="hidden md:flex text-white text-sm md:text-base mb-2 max-w-lg">
                                    {fetchedUser.bio ? (
                                        fetchedUser.bio
                                    ) : (
                                        <span className="text-gray-400 italic">No bio yet.</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="flex mt-2 md:hidden text-white text-sm mb-2">
                                {fetchedUser.bio ? (
                                    fetchedUser.bio
                                ) : (
                                    <span className="text-gray-400 italic">No bio yet.</span>
                                )}
                            </p>
                        </div>
                        {/* Stats Section */}
                        <div
                            className="border border-gray-700 py-3 mt-4 rounded-lg"
                            style={{
                                boxShadow:
                                    "inset 0 4px 12px rgba(255, 255, 255, 0.12), inset 0 -4px 12px rgba(255, 255, 255, 0.12)",
                            }}
                        >
                            <div className="flex justify-center">
                                <span className="font-medium text-base text-white mr-1">
                                    Posts:
                                </span>
                                <span className="text-gray-400 text-base">
                                    {userPosts?.length || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Posts Grid */}
                    <div className="grid grid-cols-3 gap-0.5 md:gap-1 bg-[#1a072cbf] p-1 md:p-1.5 rounded-lg">
                        {userPosts &&
                            userPosts.map((post, index) => (
                                <button
                                    key={index}
                                    onClick={() =>
                                        navigate(`/posts/${post.post_id}`)
                                    }
                                    className="aspect-square bg-gray-800 overflow-hidden relative group rounded shadow-[0_4px_10px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.3)] transition duration-300"
                                >
                                    {post.type.startsWith("image/") ? (
                                        <img
                                            src={getMediaPath(post.path)}
                                            alt={`Post ${index}`}
                                            className={`w-full h-full object-cover transition duration-300 group-hover:opacity-70 rounded ${post.is_nsfw && !user?.show_nsfw ? 'blur-md' : ""}`}
                                        />
                                    ) : post.type.startsWith("video/") ? (
                                        <div className="w-full h-full relative">
                                            <video
                                                src={getMediaPath(post.path)}
                                                className="w-full h-full object-cover pointer-events-none transition duration-300 group-hover:opacity-70"
                                                muted
                                                preload="metadata"
                                            />
                                            <div className="absolute top-2 right-2 text-white opacity-80">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-6 w-6"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-gray-500">
                                            Unsupported media type
                                        </div>
                                    )}
                                </button>
                            ))}
                        {!userPosts && (
                            <div className="col-span-3 py-12 md:py-20 flex flex-col items-center justify-center text-center">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-12 w-12 md:h-16 md:w-16 text-gray-500 mb-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                                <p className="text-gray-400 text-lg md:text-xl">
                                    No posts yet
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#242380]/95 p-2 flex justify-around items-center shadow-lg">
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
                    },
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

export default UserProfile;
