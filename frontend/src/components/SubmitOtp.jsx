import { useState } from "react";
import { handleFormChange } from "../utils/form";
import { getValueFromURL, apiCall } from "../utils/api";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";
import { validateOTP } from "../validators/user";
import { useRef } from "react";

const SubmitOtp = () => {
    const { goTo } = useNavigation();
    const [formData, setFormData] = useState({
        username: getValueFromURL("username"),
        otp: "",
    });
    const [loading, setLoading] = useState(false)
    const buttonRef = useRef(null)
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            buttonRef.current.click();
        }
    }

    const onSuccess = (response) => {
        goTo("resetPassword", {
            reset_token: response.reset_token.token,
        });
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();
        const submissionData = { ...formData };

        try {
            await validateOTP.validate(submissionData.otp);

            await apiCall(
                "/v1/otp/validate",
                "POST",
                submissionData,
                {},
                null,
                false,
                (response) => onSuccess(response),
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
                    name="otp"
                    onKeyDown={handleKeyDown}
                    onChange={handleChange}
                    value={formData.otp}
                    placeholder="OTP"
                    className="w-full px-4 py-2 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />

                <button
                    onClick={handleSubmit}
                    ref={buttonRef}
                    disabled={loading}
                    className="w-full py-2 mt-5 rounded-lg bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 text-lg font-bold duration-700"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Submit"
                    )}
                </button>
            </div>
        </div>
    );
};
export default SubmitOtp;
