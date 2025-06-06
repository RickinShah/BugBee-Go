import { useState } from "react";
import { handleFormChange } from "../utils/form";
import * as yup from "yup";
import { validateConfirmPassword, validatePassword } from "../validators/user";
import { validationError } from "../utils/errors";
import { apiCall } from "../utils/api";
import useNavigation from "../utils/navigate";
import { ArrowLeft } from "lucide-react";
import { useRef } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const ChangePassword = () => {
    const { goTo } = useNavigation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const buttonRef = useRef(null)

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            buttonRef.current.click();
        }
    }
    const [loading, setLoading] = useState(false);

    const onSuccess = () => {
        alert(
            "Password Updated Successfully!",
        );
        goTo("settings");
    };

    const [formData, setFormData] = useState({
        old_password: "",
        password: "",
        confirm_password: "",
    });

    const handleChange = (e) => handleFormChange(e, setFormData);

    const validateNewPassword = yup.object({
        old_password: validatePassword,
        password: validatePassword,
        confirm_password: validateConfirmPassword,
    });

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();

        try {
            await validateNewPassword.validate(formData, {
                abortEarly: true,
            });

            await apiCall(
                "/v1/users/password",
                "PATCH",
                formData,
                {},
                "include",
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
        <div className="w-full h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 px-5 relative">
            {/* Back Button */}
            <button
                onClick={() => goTo("settings")}
                className="absolute top-6 left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition duration-300 shadow-md backdrop-blur"
            >
                <ArrowLeft size={24} />
            </button>

            {/* Title */}
            <div className="text-center">
                <div className="text-4xl md:text-5xl text-gray-400 font-medium">
                    Change Password
                </div>
            </div>

            {/* Form */}
            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mt-6">
                <div className="relative mt-4">
                    <input
                        type={showOldPassword ? "text" : "password"}
                        name="old_password"
                        value={formData.old_password}
                        onKeyDown={handleKeyDown}
                        onChange={handleChange}
                        placeholder="Old Password"
                        className="w-full text-white px-4 py-2 bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowOldPassword((prev) => !prev)}
                        className="absolute top-1/2 right-3 transform -translate-y-1/2 text-pink-300 text-sm"
                    >
                        {showOldPassword ? <VisibilityOff fontSize="2" /> : <Visibility fontSize="2" />}
                    </button>
                </div>
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
                    className="w-full py-2 mt-5 rounded-lg bg-[#ff24d0d2] text-gray-200 hover:bg-[#ff24d046] hover:text-gray-400 text-lg font-bold duration-300 "
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Update"
                    )}
                </button>
            </div>
        </div>
    );
};
export default ChangePassword;
