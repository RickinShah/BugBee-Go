import { useState } from "react";
import { handleFormChange } from "../utils/form";
import { getValueFromURL, apiCall } from "../utils/api";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";
import { validateOTP } from "../validators/user";

const SubmitOtp = () => {
    const { goTo } = useNavigation();
    const [formData, setFormData] = useState({
        username: getValueFromURL("username"),
        otp: "",
    });

    const onSuccess = (response) => {
        goTo("resetPassword", {
            reset_token: response.reset_token.token,
        });
    };

    const handleChange = (e) => handleFormChange(e, setFormData);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const submissionData = { ...formData };

        try {
            await validateOTP.validate(submissionData.otp);

            await apiCall(
                "/v1/otp/validate",
                "POST",
                submissionData,
                {},
                null,
                false,
                (response) => onSuccess(response),
                null,
            );
        } catch (error) {
            validationError(error.errors);
        }
    };

    // return (
    //     <div
    //         className="w-full h-screen bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800
    // flex flex-col justify-center items-center"
    //     >
    //         <div className="flex flex-col justify-center items-center">
    //             <div className="text-5xl text-gray-400 font-medium">
    //                 Enter OTP
    //             </div>
    //         </div>

    //         <div className="flex flex-col my-10">
    //             <input
    //                 type="text"
    //                 name="otp"
    //                 onChange={handleChange}
    //                 value={formData.otp}
    //                 placeholder="OTP"
    //                 className="px-5 w-96 h-10 bg-[#ffffff49] rounded-xl"
    //             />
    //             <button
    //                 onClick={handleSubmit}
    //                 className="w-96 h-10 rounded-xl my-5 bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 text-lg font-bold duration-700"
    //             >
    //                 {" "}
    //                 Submit{" "}
    //             </button>
    //         </div>
    //     </div>
    // );

    return (
        <div className="w-full h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 px-5">
            <div className="text-center">
                <div className="text-4xl md:text-5xl text-gray-400 font-medium">
                    Forgot Password
                </div>
            </div>

            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mt-6">
                <input
                    type="text"
                    name="otp"
                    onChange={handleChange}
                    value={formData.otp}
                    placeholder="OTP"
                    className="w-full px-4 py-2 text-white bg-[#ffffff49] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                    onClick={handleSubmit}
                    className="w-full py-2 mt-5 rounded-lg bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 text-lg font-bold duration-700"
                >
                    Submit
                </button>
            </div>
        </div>
    );
};
export default SubmitOtp;
