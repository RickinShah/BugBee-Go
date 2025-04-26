import { useState } from "react";
import { handleFormChange } from "../utils/form";
import * as yup from "yup";
import { validateConfirmPassword, validatePassword } from "../validators/user";
import { validationError } from "../utils/errors";
import { getValueFromURL, apiCall } from "../utils/api";
import useNavigation from "../utils/navigate";

const RegisterPassword = () => {
    const { goTo } = useNavigation();
    const [loading, setLoading] = useState(false);

    const onSuccess = () => {
        alert(
            "Account created! Check your email for the activation link to verify your account.",
        );
        goTo("login");
    };

    const [formData, setFormData] = useState({
        reg_id: getValueFromURL("reg_id"),
        password: "",
        confirm_password: "",
    });

    const handleChange = (e) => handleFormChange(e, setFormData);

    const validateNewPassword = yup.object({
        password: validatePassword,
        confirm_password: validateConfirmPassword,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let submissionData = { ...formData };

        try {
            await validateNewPassword.validate(submissionData, {
                abortEarly: true,
            });

            await apiCall(
                "/v1/users",
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
                    Enter Password
                </div>
            </div>

            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mt-6">
                <input
                    type="password"
                    name="password"
                    onChange={handleChange}
                    value={formData.password}
                    placeholder="Password"
                    className="w-full px-4 py-2 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                    disabled={loading}
                    className="w-full py-2 mt-5 rounded-lg bg-[#ff24cf] text-gray-100 hover:bg-[#ff24d046] hover:text-gray-400 text-lg font-bold duration-300 "
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Create Account"
                    )}
                </button>
            </div>
        </div>
    );
};
export default RegisterPassword;
