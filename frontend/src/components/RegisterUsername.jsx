import { useState } from "react";
import { handleFormChange, removeFieldIfEmpty } from "../utils/form";
import * as yup from "yup";
import { validateName, validateUsername } from "../validators/user";
import { validationError } from "../utils/errors";
import { getValueFromURL, apiCall } from "../utils/api";
import useNavigation from "../utils/navigate";
import { useRef } from "react";

const RegisterUsername = () => {
    const { goTo } = useNavigation();
    const [loading, setLoading] = useState(false);
    const buttonRef = useRef(null)
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            buttonRef.current.click();
        }
    }

    const [formData, setFormData] = useState({
        reg_id: getValueFromURL("reg_id"),
        name: "",
        username: "",
    });

    const onSuccess = (reg_id) => {
        goTo("registerPassword", { reg_id: reg_id });
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const validateCredentials = yup.object({
        username: validateUsername,
        name: validateName,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let submissionData = { ...formData };

        submissionData = removeFieldIfEmpty(submissionData, "name");

        try {
            await validateCredentials.validate(submissionData, {
                abortEarly: true,
            });

            await apiCall(
                "/v1/register/username",
                "PATCH",
                submissionData,
                {},
                null,
                false,
                () => onSuccess(submissionData.reg_id, null),
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
                    Enter Credentials
                </div>
            </div>

            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mt-6">
                <input
                    type="name"
                    name="name"
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    value={formData.name}
                    placeholder="Name"
                    className="w-full px-4 py-2 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <input
                    type="name"
                    name="username"
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    value={formData.username}
                    placeholder="Username"
                    className="w-full px-4 py-2 mt-4 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
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
                        "Next"
                    )}
                </button>
            </div>
        </div>
    );
};
export default RegisterUsername;
