import { useState } from "react";
import { handleFormChange } from "../utils/form";
import { validateUsernameOrEmail } from "../validators/user";
import { apiCall } from "../utils/api";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";
import { useRef } from "react";

const ForgotPassword = () => {
    const { goTo } = useNavigation();
    const [formData, setFormData] = useState({
        username: "",
    });
    const [loading, setLoading] = useState(false)
    const buttonRef = useRef(null)
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            buttonRef.current.click();
        }
    }

    const onSuccess = (response) => {
        goTo("otp", { username: response.username });
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();
        const submissionData = { ...formData };

        try {
            await validateUsernameOrEmail.validate(submissionData.username, {
                abortEarly: true,
            });

            await apiCall(
                "/v1/otp",
                "POST",
                submissionData,
                {},
                null,
                false,
                onSuccess,
                null,
            );
        } catch (error) {
            validationError(error.errors);
        }
        setLoading(false);
    };

    return (
        <div className="w-full h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 px-5">
            <div className="text-center">
                <div className="text-4xl md:text-5xl text-gray-400 font-medium">
                    Forgot Password
                </div>
            </div>

            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mt-6">
                <input
                    type="text"
                    name="username"
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    value={formData.username}
                    placeholder="Username or Email"
                    className="w-full px-4 py-2 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                    onClick={handleSubmit}
                    ref={buttonRef}
                    disabled={loading}
                    className="w-full py-2 mt-5 rounded-lg bg-[#ff24cf] text-gray-100 hover:bg-[#ff24d046] hover:text-gray-400 text-lg font-bold duration-300"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Send OTP"
                    )}
                </button>
            </div>
        </div>
    );
};
export default ForgotPassword;
