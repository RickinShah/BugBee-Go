import Card from "./Cards.jsx";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    FaHome,
    FaSearch,
    FaUsers,
    FaComments,
    FaVideo,
    FaBell,
    FaCog,
    FaSignOutAlt,
    FaPlus,
} from "react-icons/fa";
import useNavigation from "../utils/navigate.jsx";
import { apiCall, getMediaPath } from "../utils/api.js";

// Utility to debounce a function
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const Feed = () => {
    const [name] = useState(() => localStorage.getItem("name"));
    const [username] = useState(() => localStorage.getItem("username"));
    const [searchResults, setSearchResults] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [profilePath] = useState(() => localStorage.getItem("profile_path"));
    const { goTo } = useNavigation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const scrollRef = useRef(null);

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
                `/v1/users?query=${encodeURIComponent(query)}&size=10`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    const users = Object.values(response.users).map((user) => ({
                        username: user.username,
                        name: user.name || user.username,
                        profilePath: getMediaPath(user.profile_path),
                    }));
                    setSearchResults(users || []);
                    setIsSearching(false);
                },
                (error) => {
                    console.error("Search error:", error);
                    setIsSearching(false);
                },
            );
        } catch (error) {
            console.error("Search failed:", error);
            setIsSearching(false);
        }
    };

    const fetchPosts = async (lastId = null) => {
        if (loading || !hasMore || isFetching) return;

        setIsFetching(true);
        setLoading(true);

        try {
            const url = lastId
                ? `/v1/posts?size=5&last_id=${lastId}`
                : "/v1/posts?size=5";
            await apiCall(
                url,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    const newPosts = Array.isArray(response.posts)
                        ? response.posts
                        : [];
                    setPosts((prevPosts) =>
                        lastId ? [...prevPosts, ...newPosts] : newPosts,
                    );
                    setHasMore(newPosts.length === 5);
                },
                (error) => {
                    console.error("Fetch posts error:", error);
                },
            );
        } catch (error) {
            console.error("Fetch posts failed:", error);
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    };

    const fetchCommunities = () => {
        try {
            apiCall(
                "/v1/communities",
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    setCommunities(response.communities);
                },
            );
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCommunities();
    }, []);
    // Initial fetch
    useEffect(() => {
        fetchPosts();
    }, []);

    // Debounced scroll handler
    const handleScroll = useCallback(
        debounce(() => {
            const container = scrollRef.current;
            if (!container || loading || !hasMore || isFetching) return;

            const { scrollTop, scrollHeight, clientHeight } = container;
            const threshold = 500;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            console.log({
                scrollTop,
                scrollHeight,
                clientHeight,
                distanceFromBottom,
            });

            if (distanceFromBottom <= threshold) {
                const lastPostId = posts[posts.length - 1]?.post_id;
                if (lastPostId) {
                    console.log("Fetching more posts with lastId:", lastPostId);
                    fetchPosts(lastPostId);
                }
            }
        }, 300), // 300ms debounce delay
        [loading, hasMore, isFetching, posts], // Dependencies for useCallback
    );

    // Attach scroll listener
    useEffect(() => {
        const container = scrollRef.current;
        if (container) {
            container.addEventListener("scroll", handleScroll);
            return () => container.removeEventListener("scroll", handleScroll);
        }
    }, [handleScroll]); // Only re-run if handleScroll changes

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 flex flex-col md:flex-row text-white">
            {/* Left Sidebar - Fixed */}
            <div className="hidden md:block md:w-1/5 h-screen fixed left-0 top-0 shadow-lg">
                <div className="h-1/5 p-4">
                    <button onClick={() => goTo("feed")}>
                        <img
                            src="../src/assets/logo.png"
                            alt="home"
                            className="max-h-full mx-auto"
                        />
                    </button>
                    <div className="mt-4 bg-gradient-to-r from-[#6767676d] to-[#9c048596] rounded-2xl flex items-center p-3 shadow-md">
                        <button onClick={() => goTo("profile")}>
                            <div className="w-10 h-10 bg-[#ffffff86] rounded-full overflow-hidden flex-shrink-0">
                                <img
                                    src={profilePath}
                                    alt="profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </button>
                        <div className="flex-grow mx-3">
                            <button onClick={() => goTo("profile")}>
                                <div className="font-semibold text-sm truncate">
                                    {name}
                                </div>
                                <div className="text-gray-400 text-xs truncate">
                                    @{username}
                                </div>
                            </button>
                        </div>
                        <button
                            className="flex items-center px-2 py-1 text-white transition-all duration-200 hover:scale-105 hover:shadow-[0_0_8px_rgba(156,4,133,0.5)] text-sm shrink-0 group"
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
                                icon: <FaComments className="w-6 h-6" />,
                                text: "Messages",
                            },
                            {
                                icon: <FaVideo className="w-6 h-6" />,
                                text: "Video Conference",
                                onClick: () =>
                                    (window.location.href =
                                        "http://localhost:3010/newroom"),
                            },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center h-12 rounded-2xl hover:bg-[#9b9b9b6b] hover:text-white transition-all duration-300 px-4"
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
                        className="bg-gradient-to-b from-[#ff599e] to-[#96003e] w-full h-11 rounded-xl font-semibold text-base hover:h-12 transition-all duration-300 flex items-center justify-center shadow-md"
                    >
                        <FaSignOutAlt className="mr-2" /> Log Out
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full md:w-3/5 md:ml-[20%] md:mr-[20%] flex flex-col">
                {/* Fixed Search Bar with Background */}

                <div className="fixed top-0 left-0 md:left-[20%] right-0 md:right-[20%] z-10">
                    <div className="bg-gradient-to-br from-[#242380] to-blue-950 w-full h-20 md:h-24"></div>
                    <div className="absolute top-0 left-0 right-0 px-4 pt-4 pb-2">
                        <div className="flex items-center w-full max-w-2xl mx-auto md:block">
                            <div className="md:hidden flex items-center mr-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                    <button
                                        onClick={() => goTo("completeProfile")}
                                    >
                                        <img
                                            src={profilePath}
                                            alt="profile"
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" />
                                <input
                                    type="text"
                                    className="w-full h-12 bg-gradient-to-br from-[#242380]/90 to-blue-950/90 rounded-2xl pl-10 pr-4 placeholder-white/70 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-600/50 transition-all"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        handleSearch(e.target.value)
                                    }
                                />
                                {/* Search Results Dropdown */}
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
                                            searchResults.map((user, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center p-3 hover:bg-white/10 border-b border-white/5 last:border-b-0 cursor-pointer transition-all duration-200 group"
                                                    onClick={() =>
                                                        goTo(
                                                            `/profile/${user.username}`,
                                                        )
                                                    }
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 mr-3 border border-white/20 group-hover:border-pink-500/50 transition-colors">
                                                        <img
                                                            src={
                                                                user.profilePath
                                                            }
                                                            alt={`${user.username}'s profile`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-white truncate group-hover:text-pink-400 transition-colors">
                                                                {user.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-400 truncate">
                                                            @{user.username}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
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
                        </div>
                    </div>
                </div>
                {/* Scrollable Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 px-4 md:px-6 pt-20 md:pt-24 pb-20 overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 5rem)" }}
                >
                    <div className="space-y-6">
                        {posts.map((post) => (
                            <Card
                                key={post.post_id}
                                user={post.user}
                                post_id={post.post_id}
                                content={post.content}
                                stats={post.stats}
                                files={post.files}
                            />
                        ))}
                        {loading && (
                            <div className="text-center text-gray-300 animate-pulse">
                                Loading more posts...
                            </div>
                        )}
                        {!hasMore && posts.length > 0 && (
                            <div className="text-center text-gray-400">
                                No more posts to load
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Fixed */}
            <div className="hidden md:block w-1/5 h-screen fixed right-0 top-0">
                <div className="h-20 flex justify-end items-center p-4">
                    <button className="p-2 bg-[#9b9b9b6b] rounded-full hover:bg-[#f5c71fc0] transition-all duration-300 shadow-md">
                        <FaBell className="w-5 h-5 hover:w-6 hover:h-6 transition-all" />
                    </button>
                    <button
                        className="p-2 bg-[#9b9b9b6b] rounded-full hover:bg-[#75ccf2c0] transition-all duration-300 ml-2 shadow-md"
                        onClick={() => goTo("settings")}
                    >
                        <FaCog className="w-5 h-5 hover:w-6 hover:h-6 transition-all" />
                    </button>
                </div>
                <div className="flex flex-col items-center justify-between h-[calc(100vh-5rem)] px-4 pb-6">
                    <div className="my-4 w-full h-80 bg-[#1a072cbf] rounded-2xl shadow-md overflow-y-auto">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-white text-sm font-semibold">
                                Popular Communities
                            </h2>
                        </div>
                        {communities.map((community) => (
                            <div
                                key={community.community_id}
                                className="flex items-center p-4 border-b border-gray-700 hover:bg-[#2a143dbf] transition-colors"
                            >
                                <img
                                    src={getMediaPath(community.profile_path)}
                                    alt={`${community.name}'s profile`}
                                    className="w-9 h-9 rounded-full mr-4 object-cover"
                                    onError={(e) => {
                                        e.target.src = getMediaPath(
                                            "/bugbee/profiles/default.jpg",
                                        );
                                    }}
                                />
                                <div className="flex flex-col">
                                    <span className="text-white font-semibold text-sm">
                                        {community.name}
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                        @{community.community_handle}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        className="bg-gradient-to-b from-[#7793f7] to-[#2f59f3] w-full h-11 rounded-xl font-semibold text-base hover:h-12 transition-all duration-300 flex items-center justify-center shadow-md"
                        onClick={() => goTo("postUpload")}
                    >
                        Post
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#242380]/95 p-2 flex justify-around items-center shadow-lg">
                {[
                    {
                        icon: <FaHome className="w-7 h-7" />,
                        action: () => {
                            goTo("feed");
                        },
                    },
                    {
                        icon: <FaComments className="w-7 h-7" />,
                        action: () => {},
                    },
                    {
                        icon: <FaVideo className="w-7 h-7" />,
                        action: () =>
                            (window.location.href =
                                "http://localhost:3010/newroom"),
                    },
                    {
                        icon: <FaUsers className="w-7 h-7" />,
                        action: () => goTo("communities"),
                    },
                    {
                        icon: <FaPlus className="w-7 h-7" />,
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

export default Feed;
