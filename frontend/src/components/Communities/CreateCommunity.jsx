import * as yup from "yup";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { apiCall } from "../../utils/api";
import { validationError } from "../../utils/errors";
import { validateName, validateUsername } from "../../validators/user";

const CreateCommunity = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        handle: "",
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
        setImageBlob(null);
    };

    const cropImage = () => {
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
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

    const handleFormChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const validateInfo = yup.object({
        name: validateName,
        handle: validateUsername,
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (showCropper) {
            validationError(["either crop or remove the profile picture"]);
            return;
        }
        let submissionData = { ...formData };
        try {
            validateInfo.validate(submissionData, { abortEarly: true });
            const formDataObj = new FormData();
            formDataObj.append("name", submissionData.name);
            formDataObj.append("handle", submissionData.handle);
            let file = null;
            if (imageBlob)
                file = new File([imageBlob], "profile.jpg", {
                    type: "image/jpeg",
                });
            formDataObj.append("profile_pic", file);
            apiCall(
                "/v1/communities",
                "POST",
                formDataObj,
                {},
                "include",
                true,
                () => {
                    navigate("/communities");
                },
            );
        } catch (error) {
            validationError(error.errors);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-indigo-900 p-4">
            <div className="bg-black bg-opacity-30 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 hover:shadow-3xl">
                <h2 className="text-white text-2xl font-bold text-center mb-6">
                    Create a Community
                </h2>

                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Profile Image Section */}
                    <div className="w-full md:w-1/2 flex flex-col items-center">
                        {!image && !croppedImage && (
                            <label
                                htmlFor="fileInput"
                                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white flex items-center justify-center bg-black bg-opacity-50 text-gray-400 text-sm sm:text-lg transition-all duration-300 hover:bg-opacity-70"
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
                                <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-lg overflow-hidden border-2 border-white shadow-md">
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
                                        type="button"
                                        className="w-24 sm:w-32 h-10 rounded-md bg-blue-700 text-white hover:bg-blue-800 font-semibold transition-all duration-300"
                                    >
                                        Crop
                                    </button>
                                    <button
                                        onClick={removeImage}
                                        type="button"
                                        className="w-24 sm:w-32 h-10 rounded-md bg-red-600 text-white hover:bg-red-700 font-semibold transition-all duration-300"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}

                        {croppedImage && !showCropper && (
                            <div
                                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white shadow-lg"
                                onClick={editImage}
                            >
                                <img
                                    src={croppedImage}
                                    alt="Community Preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full">
                                    <span className="text-white font-semibold text-sm sm:text-base">
                                        Edit
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form Section */}
                    <div className="w-full md:w-1/2 flex flex-col gap-4">
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleFormChange}
                            placeholder="Community Name"
                            className="w-full p-3 bg-black bg-opacity-50 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                        />
                        <input
                            type="text"
                            name="handle"
                            placeholder="Community Handle (must be unique)"
                            value={formData.handle}
                            onChange={handleFormChange}
                            className="w-full p-3 bg-black bg-opacity-50 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center mt-8">
                    <button
                        onClick={handleSubmit}
                        className="w-40 sm:w-48 h-12 rounded-md bg-blue-700 text-white hover:bg-blue-800 text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateCommunity;
