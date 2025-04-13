import Card from "./Cards.jsx";
import { useState, useEffect, useRef } from "react";
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
    FaSmile,
} from "react-icons/fa";
import useNavigation from "../utils/navigate.jsx";
import { apiCall, getMediaPath } from "../utils/api.js";
import { useNavigate, useParams } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";

const SinglePost = () => {
    const navigate = useNavigate();
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
    const { postId } = useParams();
    const [commentData, setCommentData] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [commentCount, setCommentCount] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

    const fetchPosts = async () => {
        if (loading || !hasMore || isFetching) return;

        setIsFetching(true);
        setLoading(true);

        try {
            await apiCall(
                `/v1/posts/${postId}`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    const newPosts = response.post;
                    setPosts([newPosts]);
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

    const fetchComments = () => {
        apiCall(
            `/v1/posts/${postId}/comments`,
            "GET",
            null,
            {},
            "include",
            false,
            (response) => {
                const comments = response.comments;
                setCommentCount(comments.length);
                setCommentData(
                    comments.map((comment) => ({
                        Comments: comment.content,
                        username: comment.user.username,
                        name: comment.user.name,
                        profile_path: getMediaPath(comment.user.profile_path),
                    })),
                );
            },
        );
    };

    const handleCommentSubmit = () => {
        if (newComment.trim()) {
            const data = {
                content: newComment,
            };

            setCommentData([
                {
                    profile_path: profilePath,
                    username: username,
                    name: name,
                    Comments: newComment,
                    likes: 0,
                    dislikes: 0,
                    isLiked: false,
                    isDisliked: false,
                },
                ...commentData,
            ]);

            setCommentCount(commentCount + 1);
            setNewComment("");
            setShowEmojiPicker(false);

            apiCall(
                `/v1/posts/${postId}/comments`,
                "POST",
                data,
                {},
                "include",
                false,
                () => {
                    // Success callback
                },
            );
        }
    };

    const handleEmojiClick = (emojiObject) => {
        setNewComment(newComment + emojiObject.emoji);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    useEffect(() => {
        fetchPosts();
        fetchComments();
    }, []);

    return (
        <div className="min-h-screen bg-[#15145d] flex flex-col md:flex-row text-white">
            {/* Left Sidebar - Fixed */}
            <div className="hidden md:block md:w-1/5 h-screen bg-[#080a41] fixed left-0 top-0 shadow-[10px_0_8px_-4px_rgba(0,0,0,0.1)]">
                <div className="h-1/5 p-4">
                    <button onClick={() => goTo("feed")}>
                        <div className="mylogo">
                            <img
                                src="../src/assets/logo.png"
                                alt="home"
                                width="100%"
                                height="100%"
                            />
                        </div>
                    </button>
                    <div className="userprofile">
                        <button
                            onClick={() => navigate(`/profile/${username}`)}
                        >
                            <div className="roundprofile">
                                <img
                                    src={profilePath}
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
                                    {name}
                                </div>
                                <div className="text-gray-400 text-xs truncate">
                                    @{username}
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
                                className={`flex items-center h-12 rounded-2xl px-4 transition-all duration-300 cursor-pointer ${
                                    item.selected
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

            {/* Main Content Area - MODIFIED: Made postcard larger by adjusting width ratios */}
            <div className="w-full md:w-4/5 md:ml-[20%] flex flex-col">
                {/* Scrollable Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 px-4 md:px-6 pt-12 md:pt-16 pb-20 overflow-y-auto scrollbar-hide bg-[#15145d]"
                    style={{ maxHeight: "calc(100vh - 0.5rem)" }}
                >
                    {/* Updated layout with expanded post card */}
                    <div className="flex flex-col lg:flex-row items-start justify-center lg:space-x-6 pt-2 md:pt-5">
                        {/* Post Card Column - MODIFIED: Increased width */}
                        <div className="lg:w-3/4 w-full relative bottom-6">
                            {posts.map((post) => (
                                <Card
                                    key={post.post_id}
                                    user={post.user}
                                    post_id={post.post_id}
                                    content={post.content}
                                    stats={post.stats}
                                    files={post.files}
                                    className="w-full" // Added full width to card
                                />
                            ))}
                            {loading && (
                                <div className="text-center text-gray-300 animate-pulse">
                                    Loading post...
                                </div>
                            )}
                        </div>

                        {/* Comments Column - MODIFIED: Reduced width */}
                        <div className="w-full lg:w-1/4 mt-6 lg:mt-0 bg-gradient-to-br from-80% from-[#4b207a70] to-[#8c02a170] rounded-lg shadow-md p-4 relative right-16 bottom-1">
                            <h3 className="text-xl font-semibold mb-4 text-white border-b border-gray-700 pb-2">
                                Comments ({commentCount})
                            </h3>

                            {/* Comment input section */}
                            <div className="mb-4">
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) =>
                                            setNewComment(e.target.value)
                                        }
                                        className="w-full bg-[#31144e] font-medium text-white p-2 rounded-full focus:outline-none placeholder-gray-400 pr-10"
                                        placeholder="Add a comment..."
                                    />
                                    <button
                                        onClick={toggleEmojiPicker}
                                        className="absolute right-10 text-gray-400 hover:text-gray-100"
                                        type="button"
                                    >
                                        <FaSmile className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleCommentSubmit}
                                        className="absolute right-2 bg-gradient-to-r from-[#75ccf2] to-[#1a8bc0] rounded-full w-7 h-7 flex items-center justify-center"
                                    >
                                        <svg
                                            className="w-4 h-4 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {showEmojiPicker && (
                                    <div className="absolute z-10 mt-2">
                                        <EmojiPicker
                                            onEmojiClick={handleEmojiClick}
                                            searchDisabled={false}
                                            skinTonesDisabled={false}
                                            width={300}
                                            height={350}
                                            previewConfig={{
                                                showPreview: false,
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Comments list */}
                            <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-4 pr-2">
                                {commentData.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <svg
                                            className="w-10 h-10 mx-auto text-gray-500 mb-2"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={1.5}
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M7 8h10M7 12h4m1 8.5a8.38 8.38 0 004.58-1.34A8.5 8.5 0 1012 20.5z"
                                            />
                                        </svg>
                                        <p className="text-lg font-medium">
                                            No Comments Yet
                                        </p>
                                        <p className="text-sm">
                                            Be the first to share your thoughts!
                                        </p>
                                    </div>
                                ) : (
                                    commentData.map((comment, index) => (
                                        <div
                                            key={index}
                                            className="flex space-x-2"
                                        >
                                            <img
                                                src={comment.profile_path}
                                                alt={comment.username}
                                                className="w-8 h-8 rounded-full mt-1 cursor-pointer"
                                                onClick={() =>
                                                    navigate(
                                                        `/profile/${comment.username}`,
                                                    )
                                                }
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-baseline">
                                                    <span
                                                        className="font-semibold text-white text-sm mr-2 cursor-pointer"
                                                        onClick={() =>
                                                            navigate(
                                                                `/profile/${comment.username}`,
                                                            )
                                                        }
                                                    >
                                                        {comment.username}
                                                    </span>
                                                    <span className="text-gray-300 text-xs">
                                                        {/* Time would go here */}
                                                    </span>
                                                </div>
                                                <p className="text-gray-200 text-sm mt-1">
                                                    {comment.Comments}
                                                </p>
                                                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                                                    <span className="cursor-pointer hover:text-gray-300">
                                                        Like
                                                    </span>
                                                    <span className="cursor-pointer hover:text-gray-300">
                                                        Reply
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
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

export default SinglePost;
