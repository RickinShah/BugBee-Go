import * as yup from "yup";
import { useState, useRef, useEffect } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { apiCall, getMediaPath } from "../utils/api";
import { handleFormChange, setToLocalStorage } from "../utils/form";
import { validateBio, validateName } from "../validators/user";
import { validationError } from "../utils/errors";
import useNavigation from "../utils/navigate";

const CompleteProfile = () => {
    const { goTo } = useNavigation();

    const [formData, setFormData] = useState({
        bio: "",
        name: localStorage.getItem("name"),
    });
    const [image, setImage] = useState(null);
    const [croppedImage, setCroppedImage] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [imageBlob, setImageBlob] = useState(null);
    const cropperRef = useRef(null);

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
                    setToLocalStorage("name", response.user.name);
                    setToLocalStorage("bio", submissionData.bio);
                    setToLocalStorage(
                        "profile_path",
                        getMediaPath(response.user.profile_path),
                    );
                    goTo("feed");
                },
            );
        } catch (error) {
            validationError(error.errors);
        }
    };

    return (
        <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800">
            <div className="bg-[#ffffff1a] p-8 rounded-lg shadow-lg flex flex-col gap-6 w-[700px]">
                {/* Profile Image & Bio Section */}
                <div className="flex items-center justify-between">
                    {/* Profile Image Section */}
                    <div className="flex flex-col items-center w-1/2">
                        {!image && !croppedImage && (
                            <label
                                htmlFor="fileInput"
                                className="relative w-40 h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white flex items-center justify-center bg-gray-300 text-gray-500 text-lg"
                            >
                                Upload Image
                            </label>
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
                                <div className="w-64 h-64 rounded-lg overflow-hidden border">
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
                                        className="w-32 h-10 rounded-xl bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 font-bold duration-700"
                                    >
                                        Crop
                                    </button>
                                    <button
                                        onClick={removeImage}
                                        className="w-32 h-10 rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold duration-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}

                        {croppedImage && !showCropper && (
                            <div
                                className="relative w-40 h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white"
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
                    <div className="flex flex-col items-center w-1/2">
                        <h2 className="text-white text-lg font-bold mb-2">
                            Complete Your Profile
                        </h2>

                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={(e) => handleFormChange(e, setFormData)}
                            placeholder="Name"
                            className="text-white px-4 py-3 w-full h-10 bg-[#ffffff49] mb-4 rounded-xl resize-none focus:outline-none"
                        />
                        <textarea
                            name="bio"
                            placeholder="Write your bio..."
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
                        className="w-48 h-12 rounded-xl bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 text-lg font-bold duration-700"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompleteProfile;
