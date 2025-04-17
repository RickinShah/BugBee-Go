import { useState } from "react";
import { handleFormChange } from "../utils/form";
import * as yup from "yup";
import { validateConfirmPassword, validatePassword } from "../validators/user";
import { validationError } from "../utils/errors";
import { apiCall } from "../utils/api";
import useNavigation from "../utils/navigate";
import { ArrowLeft } from "lucide-react";

const ChangePassword = () => {
    const { goTo } = useNavigation();

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
                <input
                    type="password"
                    name="old_password"
                    onChange={handleChange}
                    value={formData.old_password}
                    placeholder="Old Password"
                    className="w-full px-4 py-2 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <input
                    type="password"
                    name="password"
                    onChange={handleChange}
                    value={formData.password}
                    placeholder="New Password"
                    className="w-full px-4 py-2 mt-4 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <input
                    type="password"
                    name="confirm_password"
                    onChange={handleChange}
                    value={formData.confirm_password}
                    placeholder="Confirm Password"
                    className="w-full px-4 py-2 mt-4 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                    onClick={handleSubmit}
                    className="w-full py-2 mt-5 rounded-lg bg-[#ff24d0d2] text-gray-200 hover:bg-[#ff24d046] hover:text-gray-400 text-lg font-bold duration-300 "
                >
                    Update
                </button>
            </div>
        </div>
    );
};
export default ChangePassword;
