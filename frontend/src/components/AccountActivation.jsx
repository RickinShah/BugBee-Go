import { getValueFromURL, apiCall } from "../utils/api";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";

const AccountActivation = () => {
    const { goTo } = useNavigation();
    const onSuccess = () => {
        alert("Account activated successfully!");
        goTo("login");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const submissionData = {
            token: getValueFromURL("token"),
        };

        try {
            await apiCall(
                `/v1/users/activated?${getValueFromURL("token")}`,
                "PUT",
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
        <div className="w-full h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 px-5">
            <div className="w-full max-w-md bg-white bg-opacity-10 p-6 rounded-xl shadow-lg text-center">
                <div className="text-4xl md:text-3xl text-gray-400 font-medium mb-6 animate-fade-in">
                    Activate Your Account
                </div>
                <button
                    onClick={handleSubmit}
                    className="w-full px-8 py-3 text-lg font-bold text-white bg-pink-500 rounded-full shadow-lg hover:bg-pink-400 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-300 animate-bounce"
                >
                    Click Here
                </button>
            </div>
        </div>
    );
};
export default AccountActivation;
