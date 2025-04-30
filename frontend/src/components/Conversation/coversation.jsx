import React, { useEffect, useState } from "react";
import "./conversation.css";
import DeleteIcon from "@mui/icons-material/Delete";
import { getDefaultProfilePath, getMediaPath } from "../../utils/api";

const Conversation = (props) => {
    const [friendItem, setFriendItem] = useState([]);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [lastMessage, setLastMessage] = useState("");
    const [showDeleteButton, setShowDeleteButton] = useState(false);

    useEffect(() => {
        let username = JSON.parse(localStorage.getItem("user")).username;
        // props.members.filter((item) => console.log(item.username));
        let friendItem = props.members.filter(
            (item) => item.username !== username,
        );
        setFriendItem(friendItem);

        // Set last message if it exists
        if (props.lastMessage) {
            setLastMessage(props.lastMessage);
        }

        // Check if there's a new unread message
        if (props.unread) {
            setHasNewMessage(true);
        }
    }, [props.members, props.lastMessage, props.unread]);


    const name = friendItem[0]?.name ? friendItem[0].name : "Deleted User";
    const username = friendItem[0]?.username ? friendItem[0]?.username : "deleted_user";

    const profileSrc = friendItem[0]?.profile_path
        ? getMediaPath(friendItem[0]?.profile_path)
        : getDefaultProfilePath();
    const handleOnClick = () => {
        // Reset the notification when the conversation is clicked
        setHasNewMessage(false);
        props.handleSelectedUser(props.id, friendItem);
    };

    const handleDelete = (e) => {
        // Stop the click event from propagating to the parent div
        e.stopPropagation();

        // Call the delete function passed from parent
        props.handleDeleteConversation(props.id);
    };

    return (
        <div
            className={`conv ${props.active ? "active-class" : null}`}
            onClick={handleOnClick}
            onMouseEnter={() => setShowDeleteButton(true)}
            onMouseLeave={() => setShowDeleteButton(false)}
        >
            <div className="conv-profile-img">
                <img
                    className="profile-img-conv"
                    src={profileSrc}
                    alt="display"
                />
            </div>
            <div className="conv-name">
                <div className="conv-profile-name">{username}</div>
                <div className="conv-last-message">
                    {lastMessage.split("").slice(0, 23).join("") + (lastMessage.split("").length > 23 ? "..." : "")}

                </div>


            </div>
            {hasNewMessage && <div className="new-message-dot"></div>}

            {showDeleteButton && (
                <div className="delete-conversation" onClick={handleDelete}>
                    <DeleteIcon sx={{ fontSize: "20px", color: "#f44336" }} />
                </div>
            )}
        </div>
    );
};

export default Conversation;
