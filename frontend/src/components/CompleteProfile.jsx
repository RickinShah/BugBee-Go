import * as yup from "yup";
import { useState, useRef, useEffect } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { apiCall, getDefaultProfilePath, getMediaPath } from "../utils/api";
import { handleFormChange, setToLocalStorage } from "../utils/form";
import { validateBio, validateName } from "../validators/user";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";
import { ArrowLeft } from "lucide-react";
import { FaCog } from "react-icons/fa";

const CompleteProfile = () => {
    const { goTo } = useNavigation();
    const [user] = useState(() => JSON.parse(localStorage.getItem("user")))
    const [loading, setLoading] = useState(false);
    const buttonRef = useRef(null);
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            buttonRef.current.click();
        }
    }

    const [profilePath, setProfilePath] = useState(() =>
        localStorage.getItem("profile_path"),
    );
    const [name] = useState(() => localStorage.getItem("name"));
    // const [username] = useState(() => localStorage.getItem("username"));
    const [formData, setFormData] = useState({
        bio: user?.bio,
        name: name,
    });
    const [image, setImage] = useState(null);
    const [croppedImage, setCroppedImage] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [imageBlob, setImageBlob] = useState(null);
    const cropperRef = useRef(null);
    const [removedProfile, setRemovedProfile] = useState(false);

    useEffect(() => {
        if (image && !croppedImage) {
            setShowCropper(true);
        }
    }, [image]);

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result);
                setCroppedImage(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        if (croppedImage) URL.revokeObjectURL(croppedImage);
        setImage(null);
        setCroppedImage(null);
        setShowCropper(false);
    };

    const cropImage = () => {
        if (cropperRef.current) {
            const cropper = cropperRef.current.cropper;
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 500,
                height: 500,
                fillColor: "#ffffff",
            });

            if (croppedCanvas) {
                croppedCanvas.toBlob((blob) => {
                    if (blob) {
                        const previewURL = URL.createObjectURL(blob);
                        if (croppedImage) URL.revokeObjectURL(croppedImage);
                        setCroppedImage(previewURL);
                        setImageBlob(blob);
                        setShowCropper(false);
                    }
                }, "image/jpeg");
            }
        }
    };

    const editImage = () => {
        setShowCropper(true);
    };

    const validateInfo = yup.object({
        name: validateName,
        bio: validateBio,
    });

    const handleSubmit = async (e) => {
        setLoading(true)
        e.preventDefault();
        if (showCropper) {
            validationError(["either crop or remove the profile picture"]);
            return;
        }
        let submissionData = { ...formData };
        try {
            await validateInfo.validate(submissionData, { abortEarly: true });

            const formDataObj = new FormData();
            formDataObj.append("bio", submissionData.bio);
            formDataObj.append("name", submissionData.name);
            formDataObj.append("removedProfile", removedProfile);
            let file = null;
            if (imageBlob)
                file = new File([imageBlob], "profile.jpg", {
                    type: "image/jpeg",
                });
            formDataObj.append("profile_pic", file);
            await apiCall(
                "/v1/profile",
                "POST",
                formDataObj,
                {},
                "include",
                true,
                (response) => {
                    response.user._id = response.user.user_id;
                    response.user.profile_path = getMediaPath(
                        response.user.profile_path,
                    );
                    setToLocalStorage("name", response.user.name);
                    setToLocalStorage("bio", submissionData.bio);
                    setToLocalStorage(
                        "profile_path",
                        response.user.profile_path,
                    );
                    setToLocalStorage("user", JSON.stringify(response.user));
                    goTo("feed");
                },
            );
        } catch (error) {
            validationError(error.errors);
        }
        setLoading(false)
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-[#15145d]  to-[#080a41] p-4 relative">
            <button
                onClick={() => goTo("feed")}
                className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition duration-300 shadow-md backdrop-blur z-10"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="bg-[#ffffff1a] p-6 sm:p-8 rounded-lg shadow-lg flex flex-col gap-6 w-full max-w-[700px]">
                {/* Profile Image & Bio Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Profile Image Section */}
                    <div className="flex flex-col items-center w-full md:w-1/2">
                        {!image && !croppedImage && !profilePath && (
                            <label
                                htmlFor="fileInput"
                                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white flex items-center justify-center bg-gray-300 text-gray-500 text-lg"
                            >
                                Upload Image
                            </label>
                        )}

                        {!image && !croppedImage && profilePath && (
                            <div
                                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white"
                                onClick={() =>
                                    document.getElementById("fileInput").click()
                                }
                            >
                                <img
                                    src={profilePath}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />

                                {/* Center overlay for 'Change' */}
                                <div
                                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center 
    opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                                >
                                    <span className="text-white font-bold text-sm">
                                        Change
                                    </span>
                                </div>

                                {/* Top-right overlay button for 'Remove' */}
                                {profilePath !== getDefaultProfilePath() && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProfilePath(getDefaultProfilePath());
                                            setRemovedProfile(true);
                                        }}
                                        className="absolute top-5 right-5 hover:bg-white hover:bg-opacity-10 text-white text-xs font-semibold px-2 py-1 rounded-xl 
      opacity-100 md:opacity-0 md:group-hover:opacity-90 transition-opacity duration-300"
                                    >
                                        x
                                    </button>
                                )}
                            </div>
                        )}

                        <input
                            id="fileInput"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />

                        {showCropper && image && (
                            <div className="flex flex-col items-center">
                                <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-lg overflow-hidden border">
                                    <Cropper
                                        src={image}
                                        style={{
                                            height: "100%",
                                            width: "100%",
                                        }}
                                        aspectRatio={1}
                                        guides={false}
                                        viewMode={1}
                                        background={false}
                                        autoCropArea={1}
                                        responsive={true}
                                        ref={cropperRef}
                                        dragMode="move"
                                        cropBoxMovable={true}
                                        cropBoxResizable={true}
                                        center={true}
                                        modal={true}
                                    />
                                </div>
                                <div className="flex space-x-4 mt-4">
                                    <button
                                        onClick={cropImage}
                                        className="w-28 sm:w-32 h-10 rounded-xl bg-[#ff24cf] text-gray-200 hover:bg-[#ff24d046] hover:text-gray-400 font-bold duration-300"
                                    >
                                        Crop
                                    </button>
                                    <button
                                        onClick={removeImage}
                                        className="w-28 sm:w-32 h-10 rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold duration-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}

                        {croppedImage && !showCropper && (
                            <div
                                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white"
                                onClick={editImage}
                            >
                                <img
                                    src={croppedImage}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                                <div
                                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0
                                    group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                                >
                                    <span className="text-white font-bold text-sm">
                                        Edit
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bio Section */}
                    <div className="flex flex-col items-center w-full md:w-1/2">
                        <h2 className="text-white text-lg font-bold mb-2 text-center">
                            Update Profile
                        </h2>

                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={(e) => handleFormChange(e, setFormData)}
                            onKeyDown={handleKeyDown}
                            placeholder="Name"
                            className="text-white px-4 py-3 w-full bg-[#ffffff49] mb-4 rounded-xl resize-none focus:outline-none"
                        />
                        <textarea
                            name="bio"
                            placeholder="Write your bio..."
                            onKeyDown={handleKeyDown}
                            value={formData.bio}
                            onChange={(e) => handleFormChange(e, setFormData)}
                            className="text-white px-4 py-3 w-full h-28 bg-[#ffffff49] rounded-xl resize-none focus:outline-none"
                        />
                    </div>
                </div>

                {/* Submit Button Centered */}

                <div className="flex justify-center mt-4">

                    <button
                        onClick={handleSubmit}
                        ref={buttonRef}
                        disabled={loading}
                        className="w-40 sm:w-48 h-12 rounded-xl bg-[#ff24cf] text-gray-200 hover:bg-[#ff24d046] hover:text-gray-400 text-lg font-bold duration-300"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="h-5 w-5 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            "Submit"
                        )}
                    </button>
                </div>
            </div>
            <button
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-[#9b9b9b6b] rounded-full hover:bg-[#75ccf2c0] transition-all duration-300 shadow-md z-10"
                onClick={() => goTo("settings")}
            >
                <FaCog className="w-5 h-5  transition-all" />
            </button>
        </div>
    );
};

export default CompleteProfile;
