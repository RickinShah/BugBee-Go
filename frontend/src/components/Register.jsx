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

    const onSuccess = (response) => {
        goTo("registerUsername", { reg_id: response.reg_id });
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const handleSubmit = async (e) => {
        e.preventDefault();
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
    };

    return (
        <div
            className="w-full h-screen bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800
    flex flex-col justify-center items-center"
        >
            <div className="flex flex-col justify-center items-center">
                <div className="text-5xl text-gray-400 font-medium">
                    Create Account
                </div>
                <div className="text-xl text-gray-300 my-5">
                    Already have an account?{" "}
                    <a
                        href=""
                        className="font-bold text-pink-500 hover:text-pink-200 duration-700"
                        onClick={() => goTo("login")}
                    >
                        Log in
                    </a>
                </div>
            </div>

            <div className="flex flex-col my-10">
                <input
                    type="text"
                    name="email"
                    onChange={handleChange}
                    value={formData.email}
                    placeholder="Email Address"
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
export default Register;
