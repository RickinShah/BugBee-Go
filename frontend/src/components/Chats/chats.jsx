import React from "react";
import "./chats.css";
import SendIcon from "@mui/icons-material/Send";
import ImageIcon from "@mui/icons-material/Image";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../../socket";
import { getDefaultProfilePath, getMediaPath } from "../../utils/api";
import { appHost } from "../../utils/api";
import EmojiPicker from "emoji-picker-react";

// Helper function to format dates and times
const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

// Compare if two dates are from the same day
const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
};

const Chats = (props) => {
    const [content, setContent] = useState("");
    const [chats, setChats] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const ownId = JSON.parse(localStorage.getItem("user"))._id;
    const ref = useRef();
    const messageContainerRef = useRef();
    const fileInputRef = useRef();
    const emojiPickerRef = useRef();
    const inputRef = useRef();

    // Get mobile view props
    const { isMobileView, onBackClick } = props;

    const fetchMessages = async () => {
        try {
            const response = await axios.get(
                `https://${appHost}/chat/api/chat/get-message-chat/${props.selectedId}`,
                { withCredentials: true },
            );

            // Enhance messages with display time property
            const messagesWithDisplayProps = response.data.message.map(
                (msg) => ({
                    ...msg,
                    displayTime: formatMessageTime(msg.createdAt || new Date()),
                }),
            );

            setChats(messagesWithDisplayProps);

            // Update last message in parent component
            if (messagesWithDisplayProps.length > 0) {
                const lastMsg =
                    messagesWithDisplayProps[
                    messagesWithDisplayProps.length - 1
                    ];
                if (props.updateLastMessage) {
                    props.updateLastMessage(lastMsg.message);
                }
            }
        } catch (err) {
            console.log(err);
        }
    };

    const handleSendMessage = async () => {
        if (!content.trim() && !imageFile)
            return alert("Please enter message or select an image");

        try {
            const formData = new FormData();
            formData.append("conversation", props.selectedId);

            if (content.trim()) {
                formData.append("content", content);
            }

            if (imageFile) {
                formData.append("image", imageFile);
            }

            const response = await axios.post(
                `https://${appHost}/chat/api/chat/post-message-chat`,
                formData,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                },
            );

            socket.emit("sendMessage", props.selectedId, response.data);
            console.log(response.data)
            setContent("");
            setImageFile(null);
            setImagePreview(null);

            // Update the last message in parent component
            const displayText = imageFile ? "📷 Image" : content;
            if (props.updateLastMessage) {
                props.updateLastMessage(displayText);
            }
        } catch (err) {
            console.log(err);
        }
    };

    // Handle emoji selection - add to input instead of sending immediately
    const onEmojiClick = (emojiData) => {
        setContent(prevContent => prevContent + emojiData.emoji);

        // Focus back on input after emoji selection
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                alert("Please select an image file");
                return;
            }

            setImageFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const cancelImageUpload = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleImageClick = () => {
        fileInputRef.current.click();
    };

    // Close emoji picker when clicking outside
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

    useEffect(() => {
        socket.on("receiveMessage", (response) => {
            if (response.conversation === props.selectedId) {
                // Add display time to the new message
                const messageWithTime = {
                    ...response,
                    displayTime: formatMessageTime(
                        response.createdAt || new Date(),
                    ),
                };

                setChats((prevChats) => [...prevChats, messageWithTime]);

                // Update last message in parent component
                if (props.updateLastMessage) {
                    const displayText = response.imageUrl
                        ? "📷 Image"
                        : response.message;
                    props.updateLastMessage(displayText);
                }
            }
        });

        return () => {
            socket.off("receiveMessage");
        };
    }, [props.selectedId]);

    useEffect(() => {
        fetchMessages();
        setContent("");
        setImageFile(null);
        setImagePreview(null);
        setShowEmojiPicker(false);
    }, [props.selectedId]);

    useEffect(() => {
        // Scroll to the bottom when new messages arrive
        messageContainerRef.current?.scrollTo(
            0,
            messageContainerRef.current.scrollHeight,
        );
    }, [chats]);

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    };

    // Determine when to show date headers
    const shouldShowDateHeader = (currentMsg, index) => {
        if (index === 0) return true;

        const currentDate = new Date(currentMsg.createdAt || new Date());
        const prevMsg = chats[index - 1];
        const prevDate = new Date(prevMsg.createdAt || new Date());

        return !isSameDay(currentDate, prevDate);
    };

    const selectedUserProfile = props?.selectedUserDetails[0]?.profile_path
        ? getMediaPath(props?.selectedUserDetails[0]?.profile_path)
        : getDefaultProfilePath();

    const selectedUserName = props?.selectedUserDetails[0]?.name ? props?.selectedUserDetails[0].name : "Deleted User";

    return (
        <div className="dashboard-chats">
            <div className="chatNameBlock">
                {isMobileView && (
                    <div className="backer" onClick={onBackClick}>
                        <ArrowBackIcon sx={{

                            fontSize: "24px",
                            color: "#fff",
                            marginRight: "1px",
                            background: "transparent"

                        }} />


                    </div>
                )}
                <div className="chat-profile-img">
                    <img
                        className="dp"
                        src={selectedUserProfile}
                        alt="Profile"
                    />
                </div>
                <div className="chat-name">
                    {selectedUserName}
                </div>
            </div>

            <div className="chats-block" ref={messageContainerRef}>
                {chats.map((item, index) => (
                    <React.Fragment key={item._id || index}>
                        {shouldShowDateHeader(item, index) && (
                            <div className="date-divider">
                                <span className="date-content">
                                    {formatMessageDate(
                                        item.createdAt || new Date(),
                                    )}
                                </span>
                            </div>
                        )}

                        <div
                            className={`chat ${ownId === item?.sender?._id ? "chat-message-me" : null}`}
                        >
                            <div className="chat-send-rev_image">
                                <img
                                    className="dp"
                                    src={getMediaPath(
                                        item.sender?.profile_path,
                                    )}
                                    alt="Profile"
                                />
                            </div>
                            <div className="message-container">
                                <div className="message">
                                    {item.imageUrl && (
                                        <div className="message-image-container">
                                            <img
                                                src={`https://${appHost}/chat/image/${item.imageUrl}`}
                                                alt="Message image"
                                                className="message-image"
                                            />
                                        </div>
                                    )}
                                    {item.message && <div>{item.message}</div>}
                                </div>
                                <div className="message-timestamp">
                                    {item.displayTime}
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                ))}
            </div>

            {imagePreview && (
                <div className="image-preview-container">
                    <div className="image-preview">
                        <img src={imagePreview} alt="Upload preview" />
                        <button
                            className="cancel-upload"
                            onClick={cancelImageUpload}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className="message-box">
                <div className="message-input-box">
                    <input
                        ref={inputRef}
                        value={content}
                        onChange={(event) => {
                            setContent(event.target.value);
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Type Your Message Here"
                        className="searchBox messageBox"
                    />
                </div>
                <div className="message-actions">
                    <div className="emoji-picker-container" ref={emojiPickerRef}>
                        <EmojiEmotionsIcon
                            onClick={toggleEmojiPicker}
                            sx={{
                                fontSize: isMobileView ? "28px" : "32px",
                                margin: isMobileView ? "8px" : "10px",
                                cursor: "pointer",
                                color: "#098bc8",
                            }}
                        />
                        {showEmojiPicker && (
                            <div className="emoji-picker-dropdown">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    autoFocusSearch={false}
                                    theme="dark"
                                />
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                    />
                    <ImageIcon
                        onClick={handleImageClick}
                        sx={{
                            fontSize: isMobileView ? "28px" : "32px",
                            margin: isMobileView ? "8px" : "10px",
                            cursor: "pointer",
                            color: "#098bc8",
                        }}
                    />
                    <SendIcon
                        onClick={handleSendMessage}
                        sx={{
                            fontSize: isMobileView ? "28px" : "32px",
                            margin: isMobileView ? "8px" : "10px",
                            cursor: "pointer",
                            color: "#098bc8",
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Chats;