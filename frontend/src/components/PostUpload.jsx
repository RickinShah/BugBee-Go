import { useState, useRef, useEffect } from "react";
import { apiCall } from "../utils/api";
import useNavigation from "../utils/navigate";
import { ArrowLeft } from "lucide-react";
import "./PostUpload.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faPlus } from "@fortawesome/free-solid-svg-icons";

const PostUpload = () => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [content, setContent] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mediaHeight, setMediaHeight] = useState(256); // Dynamic height for media container
    const mediaContainerRef = useRef(null);
    const { goTo } = useNavigation();

    const processImage = async (file) => {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                let width = img.width;
                let height = img.height;

                if (width > 1920 || height > 1080) {
                    const aspectRatio = width / height;
                    if (aspectRatio > 1) {
                        width = 1920;
                        height = Math.round(1920 / aspectRatio);
                    } else {
                        height = 1080;
                        width = Math.round(1080 * aspectRatio);
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(
                        new File(
                            [blob],
                            file.name.replace(/\.[^.]+$/, ".jpg"),
                            { type: "image/jpeg" },
                        ),
                    );
                }, "image/jpeg");
            };
        });
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (selectedFiles.length + files.length > 10) {
            alert("You can upload a maximum of 10 files.");
            return;
        }

        const validFiles = [];
        setIsProcessing(true);

        for (const file of files) {
            if (file.type.startsWith("image")) {
                validFiles.push(await processImage(file));
            } else if (
                file.type.startsWith("video") ||
                file.type.startsWith("audio")
            ) {
                validFiles.push(file);
            }
        }

        if (validFiles.length !== files.length) {
            alert(
                "Some files were not added because they are not supported media formats.",
            );
        }

        if (validFiles.length > 0) {
            setSelectedFiles([...selectedFiles, ...validFiles]);
            setCurrentIndex(selectedFiles.length);
        }
        setIsProcessing(false);
    };

    const removeFile = (index) => {
        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
        if (currentIndex >= selectedFiles.length - 1) {
            setCurrentIndex(Math.max(0, currentIndex - 1));
        }
    };

    const handlePost = async () => {
        if (!content.trim()) {
            alert("Content is required.");
            return;
        }

        const formDataObj = new FormData();
        formDataObj.append("content", content);
        selectedFiles.forEach((file) => {
            formDataObj.append("files", file);
        });

        try {
            await apiCall(
                "/v1/posts",
                "POST",
                formDataObj,
                {},
                "include",
                true,
                (data) => {
                    console.log("Post created successfully:", data);
                    goTo("feed");
                },
            );
        } catch (error) {
            console.error("Error creating post:", error);
            alert(
                error.message || "An error occurred while creating the post.",
            );
        }
    };

    const nextMedia = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % selectedFiles.length);
    };

    const prevMedia = () => {
        setCurrentIndex(
            (prevIndex) =>
                (prevIndex - 1 + selectedFiles.length) % selectedFiles.length,
        );
    };

    const openModal = () => {
        if (selectedFiles[currentIndex].type.startsWith("image")) {
            setIsModalOpen(true);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    // Dynamically adjust media container height based on image aspect ratio
    useEffect(() => {
        if (
            selectedFiles.length > 0 &&
            selectedFiles[currentIndex].type.startsWith("image")
        ) {
            const img = new Image();
            img.src = URL.createObjectURL(selectedFiles[currentIndex]);
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const containerWidth =
                    mediaContainerRef.current?.offsetWidth || 0;
                const calculatedHeight = containerWidth / aspectRatio;
                setMediaHeight(
                    Math.min(calculatedHeight, window.innerHeight * 0.5),
                ); // Cap at 50% of viewport height
            };
        } else {
            setMediaHeight(0); // Reset for non-image media
        }
    }, [selectedFiles, currentIndex]);

    return (
        <div className="bg-gradient-to-br from-[#15145d]  to-[#080a41] w-full min-h-screen flex justify-center items-center px-4 sm:px-6 py-20 sm:py-20">
            <button
                onClick={() => goTo("feed")}
                className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition duration-300 shadow-md backdrop-blur z-10"
            >
                <ArrowLeft size={24} />
            </button>
            <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col items-center shadow-xl border border-white border-opacity-20">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-6 sm:mb-8 md:mb-10 tracking-tight">
                    Create a New Post
                </h1>
                <div className="w-full space-y-6 sm:space-y-8">
                    <div className="w-full">
                        <textarea
                            placeholder="Type here..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full p-3 sm:p-4 rounded-xl bg-white bg-opacity-10 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-200 resize-none text-base sm:text-lg"
                            rows={4}
                        />
                    </div>
                    <div
                        ref={mediaContainerRef}
                        className="w-full rounded-xl flex justify-center items-center bg-white bg-opacity-10 cursor-pointer hover:bg-opacity-20 transition duration-300 relative overflow-hidden"
                        style={{
                            height:
                                mediaHeight > 0
                                    ? `${mediaHeight}px`
                                    : "16rem /* 256px */ sm:20rem /* 320px */ md:24rem /* 384px */",
                        }}
                        onClick={() =>
                            document.getElementById("fileInput").click()
                        }
                    >
                        {isProcessing ? (
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-white mt-3 sm:mt-4 text-base sm:text-lg">
                                    Processing media...
                                </p>
                            </div>
                        ) : selectedFiles.length > 0 ? (
                            <div className="relative w-full h-full flex justify-center items-center rounded-xl overflow-hidden">
                                {selectedFiles[currentIndex].type.startsWith(
                                    "image",
                                ) ? (
                                    <img
                                        src={URL.createObjectURL(
                                            selectedFiles[currentIndex],
                                        )}
                                        alt="Preview"
                                        className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 hover:scale-105"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openModal();
                                        }}
                                    />
                                ) : selectedFiles[currentIndex].type.startsWith(
                                      "video",
                                  ) ? (
                                    <video
                                        src={URL.createObjectURL(
                                            selectedFiles[currentIndex],
                                        )}
                                        controls
                                        className="w-full h-full object-contain rounded-xl"
                                    />
                                ) : selectedFiles[currentIndex].type.startsWith(
                                      "audio",
                                  ) ? (
                                    <audio
                                        controls
                                        className="w-full p-3 sm:p-4 bg-white bg-opacity-10 rounded-xl"
                                    >
                                        <source
                                            src={URL.createObjectURL(
                                                selectedFiles[currentIndex],
                                            )}
                                            type={
                                                selectedFiles[currentIndex].type
                                            }
                                        />
                                    </audio>
                                ) : null}
                                <button
                                    className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-red-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex justify-center items-center text-lg sm:text-xl hover:bg-red-600 transition duration-200 shadow-md"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(currentIndex);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center cursor-pointer text-white">
                                <span className="relative text-5xl">
                                    <FontAwesomeIcon icon={faImage} />
                                    <FontAwesomeIcon
                                        icon={faPlus}
                                        className="absolute bottom-0 right-0 text-xs bg-indigo-600 rounded-full p-1"
                                    />
                                </span>
                                <p className="text-base sm:text-lg md:text-xl font-medium mt-2 text-center">
                                    Click here to Upload Media
                                </p>
                            </div>
                        )}
                        {selectedFiles.length > 1 && (
                            <>
                                <button
                                    className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 text-white p-2 sm:p-3 rounded-full hover:shadow-lg transition duration-200"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevMedia();
                                    }}
                                >
                                    ❮
                                </button>
                                <button
                                    className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 text-white p-2 sm:p-3 rounded-full  hover:shadow-lg transition duration-200"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextMedia();
                                    }}
                                >
                                    ❯
                                </button>
                            </>
                        )}
                    </div>
                    <input
                        id="fileInput"
                        type="file"
                        accept="image/*,video/*,audio/*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {selectedFiles.length > 0 && (
                        <button
                            className="w-full mt-4 sm:mt-6 px-4 sm:px-6 py-2 sm:py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition duration-200 text-base sm:text-lg font-medium"
                            onClick={() =>
                                document.getElementById("fileInput").click()
                            }
                        >
                            + Add More Media
                        </button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row justify-center mt-8 sm:mt-10 w-full space-y-4 sm:space-y-0 sm:space-x-6">
                    <button
                        className="w-full sm:w-40 md:w-48 h-12 sm:h-14 bg-[#185ce4] rounded-xl text-white text-base sm:text-lg font-semibold hover:bg-[#0051ff98] transition duration-200 shadow-md"
                        onClick={handlePost}
                    >
                        Share Post
                    </button>
                </div>
            </div>

            {/* Modal for Larger Image */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 animate-fade-in"
                    onClick={closeModal}
                >
                    <div className="relative w-full max-w-[90vw] sm:max-w-[80vw] md:max-w-5xl max-h-[90vh]">
                        <img
                            src={URL.createObjectURL(
                                selectedFiles[currentIndex],
                            )}
                            alt="Full Size Preview"
                            className="w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                        <button
                            className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-red-500 text-white rounded-full w-10 sm:w-12 h-10 sm:h-12 flex justify-center items-center text-xl sm:text-2xl hover:bg-red-600 transition duration-200 shadow-md"
                            onClick={closeModal}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostUpload;
