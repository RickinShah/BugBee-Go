import { useState } from "react";
import { handleFormChange, removeFieldIfEmpty } from "../utils/form";
import * as yup from "yup";
import { validateName, validateUsername } from "../validators/user";
import { validationError } from "../utils/errors";
import { getValueFromURL, apiCall } from "../utils/api";
import useNavigation from "../utils/navigate";

const RegisterUsername = () => {
    const { goTo } = useNavigation();

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
                    type="name"
                    name="name"
                    onChange={handleChange}
                    value={formData.name}
                    placeholder="Name"
                    className="text-white px-5 w-96 h-10 bg-[#ffffff49] rounded-xl"
                />
                <input
                    type="name"
                    name="username"
                    onChange={handleChange}
                    value={formData.username}
                    placeholder="Username"
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
export default RegisterUsername;
