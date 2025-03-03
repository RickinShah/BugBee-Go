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
        <div
            className="w-full h-screen bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800
    flex flex-col justify-center items-center"
        >
            <div className="flex flex-col justify-center items-center">
                <div className="text-5xl text-gray-400 font-medium">
                    Activate Your Account
                </div>
            </div>

            <div className="flex flex-col my-10">
                <button
                    onClick={handleSubmit}
                    className="w-96 h-10 rounded-xl my-5 bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 text-lg font-bold duration-700"
                >
                    {" "}
                    Click Here{" "}
                </button>
            </div>
        </div>
    );
};
export default AccountActivation;
