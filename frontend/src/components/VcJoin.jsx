import { useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom"
import { apiCall, vcHost } from "../utils/api";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";

const VcJoin = () => {
    const [meetingCode] = useState(useParams().roomId);
    const { goTo } = useNavigation();

    const handleJoinMeeting = (user) => {
        if (meetingCode.trim()) {
            console.log(user.username)
            console.log(`Joining meeting with code: ${meetingCode}`);
            window.location.href = `https://${vcHost}/join?room=${meetingCode}&roomPassword=0&name=${user.username}&avatar=${user.profile_path}&audio=0&video=0&screen=0&hide=0&notify=0&duration=unlimited`;
        }
    };

    const checkUser = (user) => {
        try {
            apiCall(
                "/v1/user/check",
                "GET",
                null,
                {},
                "include",
                false,
                () => {
                    handleJoinMeeting(user);
                },
            )
        } catch (err) {
            validationError(err);
        }
    }

    useEffect(() => {
        const tempUser = localStorage.getItem("user")
        if (tempUser === null) {
            goTo("login");
        }
        const user = JSON.parse(tempUser);
        checkUser(user);
    }, [])

    return <p>Redirecting...</p>
}
export default VcJoin;
