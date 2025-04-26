import { useState } from "react";
import { handleFormChange } from "../utils/form";
import { validateEmail } from "../validators/user";
import { apiCall } from "../utils/api";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";

const Register = () => {
    const { goTo } = useNavigation();
    const [formData, setFormData] = useState({
        email: "",
    });
    const [loading, setLoading] = useState(false);

    const onSuccess = (response) => {
        goTo("registerUsername", { reg_id: response.reg_id });
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const submissionData = { ...formData };

        try {
            await validateEmail.validate(submissionData.email, {
                abortEarly: true,
            });

            await apiCall(
                "/v1/register/email",
                "PATCH",
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
                    Create Account
                </div>
                <div className="text-lg md:text-xl text-gray-300 mt-3">
                    Already have an account?{" "}
                    <button
                        className="font-bold text-pink-500 hover:text-pink-200 duration-700"
                        onClick={() => goTo("login")}
                    >
                        Log in
                    </button>
                </div>
            </div>

            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mt-6">
                <input
                    type="text"
                    name="email"
                    onChange={handleChange}
                    value={formData.email}
                    placeholder="Email Address"
                    className="w-full px-4 py-2 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-2 mt-5 rounded-lg bg-[#ff24cf] text-gray-100 hover:bg-[#ff24d046] hover:text-gray-400 text-lg font-bold duration-300"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Next"
                    )}
                </button>
            </div>
        </div>
    );
};
export default Register;
