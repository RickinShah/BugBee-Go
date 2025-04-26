import { useRef, useState } from "react";
import { handleFormChange, setToLocalStorage } from "../utils/form";
import { apiCall, getMediaPath } from "../utils/api";
import { validatePassword, validateUsernameOrEmail } from "../validators/user";
import * as yup from "yup";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";
import { Visibility, VisibilityOff } from "@mui/icons-material";


const LoginPage = () => {
    const { goTo } = useNavigation();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const buttonRef = useRef(null)

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const onSuccess = (response) => {
        response.user.profile_path = getMediaPath(response.user.profile_path);
        response.user._id = response.user.user_id;
        setToLocalStorage("user", JSON.stringify(response.user));
        setToLocalStorage("name", response.user.name);
        setToLocalStorage("username", response.user.username);
        setToLocalStorage("profile_path", response.user.profile_path);
        setToLocalStorage("show_nsfw", response.user.show_nsfw);
        goTo("feed");
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const validateLogin = yup.object({
        username: validateUsernameOrEmail,
        password: validatePassword,
    });

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            buttonRef.current.click();
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true)

        try {
            await validateLogin.validate(formData, { abortEarly: true });



            await apiCall(
                "/v1/tokens/authentication",
                "POST",
                formData,
                {},
                "include",
                false,
                (response) => onSuccess(response),
                null,
            );
            setLoading(false);
        } catch (err) {
            validationError(err.errors);
            return;
        }
    };

    return (
        <div className="w-full h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 px-5">
            <div className="text-4xl md:text-5xl text-gray-400 font-medium text-center mb-6">
                Enter Credentials
            </div>
            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg">
                <input
                    type="text"
                    name="username"
                    onKeyDown={handleKeyDown}
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Username or Email"
                    className="w-full text-white px-4 py-2 bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
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

                <div className="text-right mt-2">
                    <button
                        className="text-pink-400 font-semibold hover:text-pink-200 duration-700 text-sm"
                        onClick={() => goTo("forgotPassword")}
                    >
                        Forgot Password?
                    </button>
                </div>
                <button
                    onClick={handleSubmit}
                    ref={buttonRef}
                    disabled={loading}
                    className="w-full py-2 mt-5 rounded-lg bg-[#ff24cf] text-gray-200 hover:bg-[#ff24d046] hover:text-gray-400 text-lg font-bold duration-300 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Login"
                    )}
                </button>
                <div className="text-center text-gray-300 mt-4">
                    Don&apos;t have an account?{" "}
                    <button
                        className="text-pink-400 font-bold hover:text-pink-200 duration-700"
                        onClick={() => goTo("register")}
                    >
                        Sign up
                    </button>
                </div>
            </div>
        </div>
    );
};
export default LoginPage;
