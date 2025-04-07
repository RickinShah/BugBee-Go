import { useEffect, useRef, useState } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { handleFormChange, validationError } from "@/lib/utils";
import {
    validateCommunityHandle,
    validateCommunityName,
} from "@/lib/validators/community";
import * as yup from "yup";
import { apiCall } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { FaCog } from "react-icons/fa";

const Overview = ({ goBack, goToNextStep }) => {
    const [formData, setFormData] = useState({
        communityName: "",
        communityHandle: "",
    });
    const [image, setImage] = useState(null);
    const [croppedImage, setCroppedImage] = useState(null);
    const [imageBlob, setImageBlob] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
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

    const cropImage = () => {
        if (cropperRef.current) {
            const cropper = cropperRef.current.cropper;
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 500,
                height: 500,
                fillColor: "#ffffff",
            });
            croppedCanvas.toBlob((blob) => {
                const previewURL = URL.createObjectURL(blob);
                if (croppedImage) URL.revokeObjectURL(croppedImage);
                setCroppedImage(previewURL);
                setImageBlob(blob);
                setShowCropper(false);
            }, "image/jpeg");
        }
    };

    const removeImage = () => {
        if (croppedImage) URL.revokeObjectURL(croppedImage);
        setImage(null);
        setCroppedImage(null);
        setShowCropper(false);
    };

    const validateInfo = yup.object({
        communityName: validateCommunityName,
        communityHandle: validateCommunityHandle,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (showCropper) {
            validationError(["Crop or remove the profile picture first"]);
            return;
        }

        try {
            await validateInfo.validate(formData, { abortEarly: false });

            const formDataObj = new FormData();
            formDataObj.append("name", formData.communityName);
            formDataObj.append("handle", formData.communityHandle);
            if (imageBlob) {
                const file = new File([imageBlob], "community.jpg", {
                    type: "image/jpeg",
                });
                formDataObj.append("profile_pic", file);
            }

            await apiCall(
                "/v1/community",
                "POST",
                formDataObj,
                {},
                "include",
                true,
                (response) => {
                    goToNextStep(response); // callback from parent to proceed
                },
            );
        } catch (err) {
            validationError(err.errors);
        }
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 p-4 relative">
            <button
                onClick={goBack}
                className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition duration-300 shadow-md backdrop-blur z-10"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="bg-[#ffffff1a] p-6 sm:p-8 rounded-lg shadow-lg flex flex-col gap-6 w-full max-w-[700px]">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="flex flex-col items-center w-full md:w-1/2">
                        {!image && !croppedImage && (
                            <label
                                htmlFor="fileInput"
                                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white flex items-center justify-center bg-gray-300 text-gray-500 text-lg"
                            >
                                Upload Image
                            </label>
                        )}

                        {croppedImage && !showCropper && (
                            <div
                                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white"
                                onClick={() => setShowCropper(true)}
                            >
                                <img
                                    src={croppedImage}
                                    alt="Community"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full">
                                    <span className="text-white font-bold text-sm">
                                        Edit
                                    </span>
                                </div>
                            </div>
                        )}

                        {showCropper && image && (
                            <div className="flex flex-col items-center mt-4">
                                <div className="w-52 h-52 rounded-lg overflow-hidden border">
                                    <Cropper
                                        src={image}
                                        style={{
                                            height: "100%",
                                            width: "100%",
                                        }}
                                        aspectRatio={1}
                                        viewMode={1}
                                        background={false}
                                        autoCropArea={1}
                                        responsive={true}
                                        ref={cropperRef}
                                        dragMode="move"
                                        cropBoxMovable
                                        cropBoxResizable
                                    />
                                </div>
                                <div className="flex space-x-4 mt-4">
                                    <button
                                        onClick={cropImage}
                                        className="w-28 h-10 rounded-xl bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 font-bold duration-700"
                                    >
                                        Crop
                                    </button>
                                    <button
                                        onClick={removeImage}
                                        className="w-28 h-10 rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold duration-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}

                        <input
                            id="fileInput"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </div>

                    <div className="flex flex-col w-full md:w-1/2">
                        <h2 className="text-white text-lg font-bold mb-4 text-center">
                            Create Community
                        </h2>
                        <input
                            type="text"
                            name="communityName"
                            placeholder="Community Name"
                            value={formData.communityName}
                            onChange={(e) => handleFormChange(e, setFormData)}
                            className="text-white px-4 py-3 w-full bg-[#ffffff49] mb-4 rounded-xl focus:outline-none"
                        />
                        <input
                            type="text"
                            name="communityHandle"
                            placeholder="Handle (e.g., my_community)"
                            value={formData.communityHandle}
                            onChange={(e) => handleFormChange(e, setFormData)}
                            className="text-white px-4 py-3 w-full bg-[#ffffff49] rounded-xl focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex justify-center mt-6">
                    <button
                        onClick={handleSubmit}
                        className="w-40 h-12 rounded-xl bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 text-lg font-bold duration-700"
                    >
                        Submit
                    </button>
                </div>
            </div>

            <button
                className="absolute top-4 right-4 p-2 bg-[#9b9b9b6b] rounded-full hover:bg-[#75ccf2c0] transition-all duration-300 shadow-md z-10"
                onClick={() => goTo("settings")}
            >
                <FaCog className="w-5 h-5 hover:w-6 hover:h-6 transition-all" />
            </button>
        </div>
    );
};

export default Overview;
