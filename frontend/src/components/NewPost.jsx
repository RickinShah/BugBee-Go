import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const NewPost = () => {
    const [selectedImage, setSelectedImage] = useState(""); // Fixed setter name
    const [Username, setUsername] = useState("Shubham Patel");
    const [UserId, setUserId] = useState("ShubhamPatel");
    const [Notificationtoggle, setNotificationtoggle] = useState(false);
    const navigate = useNavigate();

    const goToUserPage = () => {
        navigate("/userpage");
    };
    function toggle() {
        setNotificationtoggle(!Notificationtoggle);
    }

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        setSelectedImage(file ? URL.createObjectURL(file) : undefined);
    };

    return (
        <div className="bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800 w-full h-screen flex ">
            <div className=" h-screen w-1/5 text-white">
                <div className="h-1/5 w-full ">
                    {/* Upper Section */}
                    <div className="w-full h-1/2 p-5">
                        <img
                            src="../src/assets/logo.png"
                            alt="home"
                            className="w-fit h-full "
                        />
                    </div>
                    <div className="w-full h-1/2 bg-gradient-to-r from-[#6767676d]  to-[#9c048596] rounded-3xl flex justify-center items-center">
                        <div className="w-12 h-12 bg-[#ffffff86] rounded-full mx-2 p-1">
                            <img
                                src="../src/assets/user.png"
                                alt="home"
                                className=""
                            />
                        </div>
                        <div className="flex flex-col mx-2">
                            <div className="font-medium">{Username}</div>
                            <div className="text-gray-400">@{UserId}</div>
                        </div>
                        <div className="border border-x-2 h-2/5 mx-4 border-pink-600"></div>
                        <div className="mx-2 flex items-center:">
                            <button className="flex h-3">
                                <div className="rounded-full mx-0.5 w-1.5 h-1.5 bg-blue-500 hover:bg-blue-800"></div>
                                <div className="rounded-full mx-0.5 w-1.5 h-1.5 bg-blue-500 hover:bg-blue-800"></div>
                                <div className="rounded-full mx-0.5 w-1.5 h-1.5 bg-blue-500 hover:bg-blue-800"></div>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col h-4/5 w-full justify-between py-3.5">
                    {/* Lower Section */}
                    <div className="py-10 text-gray-400 font-semibold">
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                <img
                                    src="../src/assets/home.png"
                                    alt="home"
                                    className="w-7 mx-1"
                                />
                                <button className="text-xl">Home</button>
                            </div>
                        </div>
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                <img
                                    src="../src/assets/search.png"
                                    alt="home"
                                    className="w-7 mx-1"
                                />
                                <button className="text-xl">Explore</button>
                            </div>
                        </div>
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                <img
                                    src="../src/assets/people.png"
                                    alt="home"
                                    className="w-7 mx-1"
                                />
                                <button className="text-xl">Communities</button>
                            </div>
                        </div>
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                <img
                                    src="../src/assets/chat.png"
                                    alt="home"
                                    className="w-7 mx-1"
                                />
                                <button className="text-xl">Messages</button>
                            </div>
                        </div>
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                <img
                                    src="../src/assets/video-camera.png"
                                    alt="home"
                                    className="w-7 mx-1"
                                />
                                <button className="text-xl">
                                    VideoConfrence
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="">
                        <button
                            className="mx-16 my-6 bg-gradient-to-b from-5% from-[#ff599e] to-[#96003e] w-52 h-12 rounded-2xl font-semibold text-lg
                                            duration-700 hover:h-14"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
            <div className="absolute right-0 w-4/5 h-screen ">
                <div className="flex flex-col w-full h-screen ">
                    <div className="w-full h-full flex flex-col">
                        <div className="w-full h-3/4  rounded-lg flex flex-col justify-center items-center">
                            <div className="w-1/2 h-1/6 flex justify-center items-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="bg-white my-10"
                                />
                            </div>
                            <div className="bg-[#1a072cbf] w-1/2 h-[700px] rounded-lg flex justify-center items-center p-10">
                                {selectedImage && (
                                    <img
                                        src={selectedImage}
                                        width={400}
                                        height={400}
                                        alt="Selected avatar"
                                        className="h-full w-fit object-contain"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex justify-center my-10">
                            <button
                                className="w-52 h-20 bg-[#9b9b9b6b] rounded-full hover:bg-gradient-to-b from-[#7793f7] to-[#2f59f3] duration-700 hover:w-20 hover:h-20 mx-20 text-gray-300 text-3xl hover:text-xl hover:text-gray-200"
                                onClick={goToUserPage}
                            >
                                Post
                            </button>
                            <button
                                className="w-52 h-20 bg-[#9b9b9b6b] rounded-full hover:bg-gradient-to-b from-[#f68080c0] to-50% to-[#ec0808c0] duration-700 hover:w-20 hover:h-20 mx-20 text-gray-300 text-3xl hover:text-xl hover:text-gray-200"
                                onClick={goToUserPage}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewPost;
