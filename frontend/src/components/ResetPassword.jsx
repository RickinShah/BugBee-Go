import { useState } from "react";
import { handleFormChange } from "../utils/form";
import * as yup from "yup";
import { validateConfirmPassword, validatePassword } from "../validators/user";
import { validationError } from "../utils/errors";
import { getValueFromURL, apiCall } from "../utils/api";
import useNavigation from "../utils/navigate";
import { useRef } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const ResetPassword = () => {
    const { goTo } = useNavigation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const buttonRef = useRef(null)
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            buttonRef.current.click();
        }
    }

    const onSuccess = () => {
        alert("Password changed successfully!");
        goTo("login");
    };

    const [formData, setFormData] = useState({
        reset_token: getValueFromURL("reset_token"),
        password: "",
        confirm_password: "",
    });

    const handleChange = (e) => handleFormChange(e, setFormData);

    const validateNewPassword = yup.object({
        password: validatePassword,
        confirm_password: validateConfirmPassword,
    });

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();
        let submissionData = { ...formData };

        try {
            await validateNewPassword.validate(submissionData, {
                abortEarly: true,
            });

            await apiCall(
                "/v1/users/reset-password",
                "PATCH",
                submissionData,
                {},
                null,
                false,
                () => onSuccess(),
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
                    Enter Password
                </div>
            </div>

            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mt-6">

                <div className="relative mt-4">
                    <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onKeyDown={handleKeyDown}
                        onChange={handleChange}
                        placeholder="Password"
                        className="w-full text-white px-4 py-2 bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute top-1/2 right-3 transform -translate-y-1/2 text-pink-300 text-sm"
                    >
                        {showPassword ? <VisibilityOff fontSize="2" /> : <Visibility fontSize="2" />}
                    </button>
                </div>
                <div className="relative mt-4">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirm_password"
                        value={formData.confirm_password}
                        onKeyDown={handleKeyDown}
                        onChange={handleChange}
                        placeholder="Confirm Password"
                        className="w-full text-white px-4 py-2 bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute top-1/2 right-3 transform -translate-y-1/2 text-pink-300 text-sm"
                    >
                        {showConfirmPassword ? <VisibilityOff fontSize="2" /> : <Visibility fontSize="2" />}
                    </button>
                </div>
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
                        "Submit"
                    )}
                </button>
            </div>
        </div>
    );
};
export default ResetPassword;
