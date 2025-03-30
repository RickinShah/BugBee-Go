import { useState } from "react";
import {
    FaArrowUp,
    FaArrowDown,
    FaComment,
    FaShare,
    FaReply,
    FaArrowLeft,
    FaArrowRight,
} from "react-icons/fa";
import { apiCall, getMediaPath } from "../utils/api";

const Card = ({ user, post_id, content, stats, files }) => {
    const [username] = useState(() => localStorage.getItem("username"));
    const [profile_path] = useState(() => localStorage.getItem("profile_path"));
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [commentData, setCommentData] = useState([]);
    const [like, setLike] = useState(stats.upvote_count);
    const [dislike, setDislike] = useState(stats.downvote_count);
    const [commentCount, setCommentCount] = useState(stats.comment_count);
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [commentToggle, setCommentToggle] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isPortrait, setIsPortrait] = useState(false); // New state for orientation
    const [postId, setPostId] = useState(() => post_id);

    const handleLike = () => {
        if (isLiked) {
            setLike(like - 1);
            setIsLiked(false);
            handleVote(false, isDisliked);
        } else {
            setLike(like + 1);
            setIsLiked(true);
            if (isDisliked) {
                setDislike(dislike - 1);
                setIsDisliked(false);
                handleVote(true, false);
            } else {
                handleVote(true, isDisliked);
            }
        }
    };

    const handleVote = (upvote, downvote) => {
        let vote = 0;
        if (upvote === true) {
            vote = 1;
        } else if (downvote === true) {
            vote = -1;
        }

        const data = { vote_type: vote };
        apiCall(
            `/v1/posts/${postId}/votes`,
            "POST",
            data,
            {},
            "include",
            false,
            () => {},
            null,
        );
    };

    const handleDislike = () => {
        if (isDisliked) {
            setDislike(dislike - 1);
            setIsDisliked(false);
            handleVote(isLiked, false);
        } else {
            setDislike(dislike + 1);
            setIsDisliked(true);
            if (isLiked) {
                setLike(like - 1);
                setIsLiked(false);
                handleVote(false, true);
            } else {
                handleVote(isLiked, true);
            }
        }
    };

    const handleCommentLike = (index) => {
        const updatedComments = [...commentData];
        if (updatedComments[index].isLiked) {
            updatedComments[index].likes -= 1;
            updatedComments[index].isLiked = false;
        } else {
            updatedComments[index].likes += 1;
            updatedComments[index].isLiked = true;
            if (updatedComments[index].isDisliked) {
                updatedComments[index].dislikes -= 1;
                updatedComments[index].isDisliked = false;
            }
        }
        setCommentData(updatedComments);
    };

    const handleCommentDislike = (index) => {
        const updatedComments = [...commentData];
        if (updatedComments[index].isDisliked) {
            updatedComments[index].dislikes -= 1;
            updatedComments[index].isDisliked = false;
        } else {
            updatedComments[index].dislikes += 1;
            updatedComments[index].isDisliked = true;
            if (updatedComments[index].isLiked) {
                updatedComments[index].likes -= 1;
                updatedComments[index].isLiked = false;
            }
        }
        setCommentData(updatedComments);
    };

    const toggleComments = () => {
        setCommentToggle(!commentToggle);
    };

    const getComments = () => {
        apiCall(
            `/v1/posts/${postId}/comments`,
            "GET",
            null,
            {},
            "include",
            false,
            (response) => {
                const comments = response.comments;
                console.log(comments);
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
        const data = {
            content: "",
        };
        if (newComment.trim()) {
            data.content = newComment;
            setCommentData([
                ...commentData,
                {
                    profile_path: profile_path,
                    username: username,
                    Comments: newComment,
                    Reply: "",
                    likes: 0,
                    dislikes: 0,
                    isLiked: false,
                    isDisliked: false,
                },
            ]);
            setCommentCount(commentCount + 1);
            setNewComment("");
        }

        apiCall(
            `/v1/posts/${postId}/comments`,
            "POST",
            data,
            {},
            "include",
            false,
            () => {},
        );
    };

    const handleNextMedia = () => {
        if (currentMediaIndex < files.length - 1) {
            setCurrentMediaIndex(currentMediaIndex + 1);
            setIsPortrait(false); // Reset orientation for new media
        }
    };

    const handlePrevMedia = () => {
        if (currentMediaIndex > 0) {
            setCurrentMediaIndex(currentMediaIndex - 1);
            setIsPortrait(false); // Reset orientation for new media
        }
    };

    const renderMedia = () => {
        const currentFile = files[currentMediaIndex];
        if (!currentFile) return null;

        const mediaPath = getMediaPath(currentFile.path);

        const mediaClasses = `rounded-md max-w-full max-h-[80vh] object-contain ${
            isPortrait ? "max-w-[50%] sm:max-w-[60%]" : ""
        }`; // Reduce width for portrait

        if (currentFile.type === "video" || mediaPath.endsWith(".mp4")) {
            return (
                <video
                    src={mediaPath}
                    controls
                    className={mediaClasses}
                    onLoadedMetadata={(e) => {
                        const { videoWidth, videoHeight } = e.target;
                        setIsPortrait(videoHeight > videoWidth);
                    }}
                />
            );
        }
        return (
            <img
                src={mediaPath}
                alt="Post"
                className={mediaClasses}
                onLoad={(e) => {
                    const { naturalWidth, naturalHeight } = e.target;
                    setIsPortrait(naturalHeight > naturalWidth);
                }}
            />
        );
    };

    return (
        <div className="relative bg-gradient-to-br from-80% from-[#4b207a70] to-[#8c02a170] w-full max-w-2xl mx-auto rounded-lg p-2 sm:p-4 my-5 shadow-md">
            {/* Header */}
            <div className="h-10 flex items-center flex-wrap gap-2">
                <img
                    src={getMediaPath(user.profile_path)}
                    alt="Profile"
                    className="rounded-full w-6 h-6 sm:w-8 sm:h-8"
                />
                <h3 className="mx-2 sm:mx-3 font-semibold text-white text-sm sm:text-base">
                    {user.name}
                </h3>
                <h2 className="text-gray-400 text-xs sm:text-sm">
                    @{user.username}
                </h2>
            </div>

            {/* Content with Navigation */}
            <div className="mt-3 w-full relative">
                <div className="bg-[#1a072cbf] w-full rounded-2xl flex items-center justify-center overflow-hidden">
                    {renderMedia()}
                    {files.length > 1 && (
                        <>
                            <button
                                onClick={handlePrevMedia}
                                disabled={currentMediaIndex === 0}
                                className={`absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 text-white ${currentMediaIndex === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-opacity-75"}`}
                            >
                                <FaArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                                onClick={handleNextMedia}
                                disabled={
                                    currentMediaIndex === files.length - 1
                                }
                                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 text-white ${currentMediaIndex === files.length - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-opacity-75"}`}
                            >
                                <FaArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                {files.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`w-2 h-2 rounded-full ${index === currentMediaIndex ? "bg-white" : "bg-gray-400"}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Description */}
            <div className="mt-2 sm:mt-3">
                <p className="text-gray-300 text-xs sm:text-sm">{content}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between mt-3 sm:mt-4 px-1 sm:px-2 flex-wrap gap-2">
                <button
                    onClick={handleLike}
                    className="flex items-center space-x-1 sm:space-x-2 group"
                >
                    <div
                        className={`p-1 sm:p-2 rounded-full bg-gradient-to-r ${isLiked ? "from-[#ff599e] to-[#96003e]" : "from-[#ff599e70] to-[#96003e70]"} group-hover:scale-110 transition-all duration-300`}
                    >
                        <FaArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        {like}
                    </span>
                </button>

                <button
                    onClick={handleDislike}
                    className="flex items-center space-x-1 sm:space-x-2 group"
                >
                    <div
                        className={`p-1 sm:p-2 rounded-full bg-gradient-to-r ${isDisliked ? "from-[#7793f7] to-[#2f59f3]" : "from-[#7793f770] to-[#2f59f370]"} group-hover:scale-110 transition-all duration-300`}
                    >
                        <FaArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        {dislike}
                    </span>
                </button>

                <button
                    onClick={() => {
                        toggleComments();
                        getComments();
                    }}
                    className="flex items-center space-x-1 sm:space-x-2 group"
                >
                    <div className="p-1 sm:p-2 rounded-full bg-gradient-to-r from-[#75ccf2] to-[#1a8bc0] group-hover:scale-110 transition-all duration-300">
                        <FaComment className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        {commentCount}
                    </span>
                </button>

                <button className="flex items-center space-x-1 sm:space-x-2 group">
                    <div className="p-1 sm:p-2 rounded-full bg-gradient-to-r from-[#f5c71f] to-[#c78f00] group-hover:scale-110 transition-all duration-300">
                        <FaShare className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        Share
                    </span>
                </button>
            </div>

            {/* Comments Section */}
            {commentToggle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
                    <div className="w-full max-w-md bg-[#230a36] rounded-lg p-3 sm:p-4 shadow-lg max-h-[90vh] flex flex-col">
                        <div className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto space-y-3 sm:space-y-4">
                            {commentData.map((comment, index) => (
                                <div
                                    key={index}
                                    className="flex items-start space-x-2"
                                >
                                    <img
                                        src={comment.profile_path}
                                        alt="User"
                                        className="rounded-full w-6 h-6 sm:w-8 sm:h-8 mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-semibold text-white text-xs sm:text-sm">
                                                {comment.username}
                                            </h3>
                                            <span className="text-gray-400 text-xs"></span>
                                        </div>
                                        <p className="text-white text-xs sm:text-sm mt-1">
                                            {comment.Comments}
                                        </p>
                                        {/* { <div className="flex items-center space-x-3 sm:space-x-4 mt-2">
                                            <button
                                                onClick={() =>
                                                    handleCommentLike(index)
                                                }
                                                className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <FaArrowUp
                                                    className={`w-3 h-3 sm:w-4 sm:h-4 ${comment.isLiked ? "text-[#ff599e]" : ""}`}
                                                />
                                                <span className="text-xs">
                                                    {comment.likes}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleCommentDislike(index)
                                                }
                                                className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <FaArrowDown
                                                    className={`w-3 h-3 sm:w-4 sm:h-4 ${comment.isDisliked ? "text-[#7793f7]" : ""}`}
                                                />
                                                <span className="text-xs">
                                                    {comment.dislikes}
                                                </span>
                                            </button>
                                            <button className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors">
                                                <FaReply className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span className="text-xs">
                                                    Reply
                                                </span>
                                            </button>
                                        </div> */}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 sm:mt-4 flex items-center space-x-2 shrink-0">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="flex-1 bg-[#31144e] text-white p-2 rounded-full focus:outline-none placeholder-gray-400 text-xs sm:text-sm"
                                placeholder="Add a comment..."
                            />
                            <button
                                onClick={() => handleCommentSubmit()}
                                className="bg-gradient-to-r from-[#75ccf2] to-[#1a8bc0] px-3 py-1 sm:px-4 sm:py-2 rounded-full text-white font-semibold text-xs sm:text-sm hover:from-[#1a8bc0] hover:to-[#75ccf2] transition-all duration-300"
                            >
                                Post
                            </button>
                            <button
                                onClick={toggleComments}
                                className="text-gray-400 hover:text-white text-xs sm:text-sm font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Card;
