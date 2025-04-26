import { useEffect } from "react";
import useNavigation from "../utils/navigate";
import { ArrowLeft } from "lucide-react";
import { apiCall, getMediaPath } from "../utils/api";
import { useState } from "react";
import { handleFormChange } from "../utils/form";
import { validationError } from "../utils/errors";
import { FaSignOutAlt } from "react-icons/fa";

const Settings = () => {
    const { goTo } = useNavigation();
    const [username] = useState(() => localStorage.getItem("username"));
    const [user, setUser] = useState({});
    const [deleteAccountModal, setDeleteAccountModal] = useState(false);
    const [applyLoading, setApplyLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const fetchUser = async () => {
        await apiCall(
            `/v1/users/${username}`,
            "GET",
            null,
            {},
            "include",
            false,
            (response) => {
                setUser(response.user);
                setFormData(() => ({
                    username: response.user.username,
                    show_nsfw: response.user.show_nsfw,
                }));
            },
        );
    };

    const [formData, setFormData] = useState({
        username: "",
        show_nsfw: false,
    });

    const handleChange = (e) => handleFormChange(e, setFormData);

    const deleteAccount = async () => {
        setDeleteLoading(true);
        try {
            await apiCall(
                `/v1/users`,
                "DELETE",
                null,
                {},
                "include",
                false,
                () => {
                    setDeleteAccountModal(false);
                    localStorage.clear;
                    goTo("login");
                },
            );
        } catch (error) {
            validationError(error);
        }
        setDeleteLoading(false);
    };

    const submitData = async () => {
        setApplyLoading(true);
        try {
            await apiCall(
                `/v1/users`,
                "PATCH",
                formData,
                {},
                "include",
                false,
                (response) => {
                    response.user._id = response.user.user_id;
                    response.user.profile_path = getMediaPath(
                        response.user.profile_path,
                    );
                    localStorage.setItem("username", response.user.username);
                    localStorage.setItem("show_nsfw", response.user.show_nsfw);

                    localStorage.setItem("user", JSON.stringify(response.user));
                },
            );
        } catch (error) {
            console.log(error);
            validationError(error);
        }

        setApplyLoading(false);
    };

    useEffect(() => {
        fetchUser();
    }, []);
    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#15145d]  to-[#080a41] flex items-center justify-center text-white font-sans px-4 sm:px-6 pt-20 pb-10 sm:py-0 md:py-10">
            {deleteAccountModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-gradient-to-br from-[#15145d] to-[#080a41] p-6 rounded-xl shadow-xl w-80">
                        <h2 className="text-lg font-semibold mb-4">
                            Are you sure?
                        </h2>
                        <div className="flex justify-end gap-4">
                <button
                    onClick={deleteAccount}
                    disabled={deleteLoading}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-500/50"
                >
                    {deleteLoading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Yes"
                    )}
                </button>

                            <button
                                onClick={() => {
                                    setDeleteAccountModal(false);
                                }}
                                disabled={deleteLoading}
                                className="px-4 py-2 bg-blue-900 rounded hover:bg-blue-900/50"
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <button
                onClick={() => goTo("feed")}
                className="absolute md:fixed top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition duration-300 shadow-md backdrop-blur z-10"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl px-5 sm:px-8 py-8 sm:py-10">
                {/* Avatar */}
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/20 rounded-full overflow-hidden flex items-center justify-center shadow-lg">
                        <img
                            src={getMediaPath(user.profile_path)}
                            alt={user.username}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="text-center text-2xl sm:text-3xl font-semibold text-gray-200 mb-6 sm:mb-8">
                    Settings
                </div>

                {/* Email */}
                <div className="mb-4">
                    <p className="text-sm text-gray-300 mb-1">Email</p>
                    <div className="w-full h-10 bg-white/10 rounded-lg px-4 flex items-center text-gray-400 shadow-inner text-sm sm:text-base">
                        {user.email}
                    </div>
                </div>

                {/* Username */}
                <div className="mb-6">
                    <p className="text-sm text-gray-300 mb-1">Username</p>
                    <input
                        type="text"
                        name="username"
                        onChange={handleChange}
                        value={formData.username}
                        placeholder="Insert username"
                        className="w-full h-10 bg-white/10 rounded-lg px-4 text-white placeholder:text-gray-400 outline-none shadow-md text-sm sm:text-base"
                    />
                </div>

                {/* NSFW Toggle */}
                <div className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-lg mb-6 shadow-inner text-sm sm:text-base">
                    <p className="text-gray-200 font-medium">
                        Show NSFW Content
                    </p>
                    <input
                        type="checkbox"
                        name="show_nsfw"
                        className="w-5 h-5 accent-red-700"
                        onChange={handleChange}
                        checked={formData.show_nsfw}
                    />
                </div>

                {/* Apply Button */}
                <button
                    onClick={submitData}
                    disabled={applyLoading}
                    className="w-full h-12 bg-[#ff24d0cb] text-gray-200 hover:bg-[#7a0f6385] hover:text-gray-400 font-semibold rounded-xl shadow-md transition mb-6 text-sm sm:text-base"
                >
                    {applyLoading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Apply Changes"
                    )}
                </button>

                {/* Bottom Buttons */}
                <div className="flex flex-col gap-3 text-sm sm:text-base">
                    <button
                        className="w-full h-12 bg-white/10 hover:bg-white/20 rounded-lg px-4 text-left font-semibold text-gray-200 transition"
                        onClick={() => goTo("completeProfile")}
                    >
                        Update Profile
                    </button>
                    <button
                        className="w-full h-12 bg-white/10 hover:bg-white/20 rounded-lg px-4 text-left font-semibold text-gray-200 transition"
                        onClick={() => goTo("changePassword")}
                    >
                        Change Password
                    </button>
                    <button className="w-full h-12 bg-white/10 hover:bg-white/20 rounded-lg px-4 text-left font-semibold text-gray-200 transition">
                        About Us
                    </button>
                    <button
                        className="w-full h-12 bg-red-500 hover:bg-red-500/50 rounded-lg px-4 text-left font-semibold text-gray-200 transition"
                        onClick={() => setDeleteAccountModal(true)}
                    >
                        Delete Account
                    </button>

                <button
                        onClick={() => {
                            setLogoutLoading(true)
                            localStorage.clear();
                            apiCall(
                                `/v1/users/logout`,
                                "POST",
                                null,
                                {},
                                "include",
                                false,
                                () => goTo("login"),
                                null,
                            );
                            setLogoutLoading(false)
                        }}
                    disabled={logoutLoading}
                        className="bg-gradient-to-b from-[#ff599e] to-[#96003e] w-full h-11 rounded-xl font-semibold text-base hover:from-[#ff85b3] hover:to-[#b00052] transition-all duration-300 flex items-center justify-center shadow-md"
                >
                    {logoutLoading ? (
                        <div className="flex items-center justify-center">
                            <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        "Log Out"
                    )}
                </button>

                    <button
                    >
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
