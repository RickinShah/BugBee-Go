import { useState } from "react";
import { handleFormChange } from "../utils/form";
import { validateUsernameOrEmail } from "../validators/user";
import { apiCall } from "../utils/api";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";

const ForgotPassword = () => {
    const { goTo } = useNavigation();
    const [formData, setFormData] = useState({
        username: "",
    });

    const onSuccess = (response) => {
        goTo("otp", { username: response.username });
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const handleSubmit = async (e) => {
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
    };

    return (
        <div
            className="w-full h-screen bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800
    flex flex-col justify-center items-center"
        >
            <div className="flex flex-col justify-center items-center">
                <div className="text-5xl text-gray-400 font-medium">
                    Forgot Password
                </div>
            </div>

            <div className="flex flex-col my-10">
                <input
                    type="text"
                    name="username"
                    onChange={handleChange}
                    value={formData.username}
                    placeholder="Username or Email"
                    className="px-5 w-96 h-10 bg-[#ffffff49] rounded-xl"
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
export default ForgotPassword;
