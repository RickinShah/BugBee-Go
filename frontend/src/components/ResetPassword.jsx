import { useState } from "react";
import { handleFormChange } from "../utils/form";
import * as yup from "yup";
import { validateConfirmPassword, validatePassword } from "../validators/user";
import { validationError } from "../utils/errors";
import { getValueFromURL, apiCall } from "../utils/api";
import useNavigation from "../utils/navigate";

const ResetPassword = () => {
    const { goTo } = useNavigation();

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
    };

    return (
        <div
            className="w-full h-screen bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800
    flex flex-col justify-center items-center"
        >
            <div className="flex flex-col justify-center items-center">
                <div className="text-5xl text-gray-400 font-medium">
                    Enter Password
                </div>
            </div>

            <div className="flex flex-col my-10">
                <input
                    type="password"
                    name="password"
                    onChange={handleChange}
                    value={formData.password}
                    placeholder="Password"
                    className="text-white px-5 w-96 h-10 bg-[#ffffff49] rounded-xl"
                />
                <input
                    type="password"
                    name="confirm_password"
                    onChange={handleChange}
                    value={formData.confirm_password}
                    placeholder="Confirm Password"
                    className="text-white my-5 px-5 w-96 h-10 bg-[#ffffff49] rounded-xl"
                />
                <button
                    onClick={handleSubmit}
                    className="w-96 h-10 rounded-xl my-5 bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 text-lg font-bold duration-700"
                >
                    {" "}
                    Next{" "}
                </button>
            </div>
        </div>
    );
};
export default ResetPassword;
