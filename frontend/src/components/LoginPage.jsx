import { useState } from "react";
import { handleFormChange, setToLocalStorage } from "../utils/form";
import { apiCall } from "../utils/api";
import { validatePassword, validateUsernameOrEmail } from "../validators/user";
import * as yup from "yup";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";

const LoginPage = () => {
    const { goTo } = useNavigation();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const onSuccess = (response) => {
        setToLocalStorage("name", response.user.name);
        setToLocalStorage("username", response.user.username);
        setToLocalStorage("profile_pic", response.user.profile_pic);
        setToLocalStorage("show_nsfw", response.user.show_nsfw);
        goTo("completeProfile");
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const validateLogin = yup.object({
        username: validateUsernameOrEmail,
        password: validatePassword,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        let submissionData = { ...formData };
        try {
            await validateLogin.validate(submissionData, { abortEarly: true });

            await apiCall(
                "/v1/tokens/authentication",
                "POST",
                submissionData,
                {},
                "include",
                false,
                (response) => onSuccess(response),
                null,
            );
        } catch (err) {
            validationError(err.errors);
        }
    };

    return (
        <div
            className="w-full h-screen bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800
    flex flex-col justify-center items-center"
        >
            <div className="flex flex-col justify-center items-center">
                <div className="text-5xl text-gray-400 font-medium">
                    Enter Credentials
                </div>
            </div>

            <div className="flex flex-col my-10">
                <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Username or Email"
                    className="text-white px-5 w-96 h-10 bg-[#ffffff49] rounded-xl"
                />
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="text-white my-5 px-5 w-96 h-10 bg-[#ffffff49] rounded-xl"
                />
                <a
                    href=""
                    className="font-bold text-pink-500 hover:text-pink-200 duration-700"
                    onClick={() => goTo("forgotPassword")}
                >
                    Forgot Password?{" "}
                </a>
                <button
                    onClick={handleSubmit}
                    className="w-96 h-10 rounded-xl my-5 bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 text-lg font-bold duration-700"
                >
                    {" "}
                    Login{" "}
                </button>
                <div className="text-xl text-gray-300 my-0">
                    Create an account?{" "}
                    <a
                        href=""
                        className="font-bold text-pink-500 hover:text-pink-200 duration-700"
                        onClick={() => goTo("register")}
                    >
                        Sign up
                    </a>
                </div>
            </div>
        </div>
    );
};
export default LoginPage;
