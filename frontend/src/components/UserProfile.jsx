import React from "react";
import Card from "./Cards.jsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Scrollbar from "react-scrollbars-custom";

const UserProfile = () =>{
    const [Username,setUsername] = useState("Shubham Patel");
    const [UserId,setUserId] = useState("ShubhamPatel");
    const [Notificationtoggle,setNotificationtoggle] = useState(false);
    const UserImage = ""

    const userPosts = [
        {
        URL:"data:image/jpeg;base64,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"
        },
        {
        URL:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRanWZcVavoZI2gUcn6tcLa5JKSBbyJZ2OKEA&s"
        },
        {
        URL:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIwGUmNgCh1ZgzJnEQ0dsA17i9zdYJGG7DLg&s"
        },
        {
        URL:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRT8FTG7nvJRQuxu_KvzPBZj1XzA9nq9H8TlA&s"
        },
        {
        URL:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGL1adRiiqE4hwmLjeDeYULkksyLaaZ_N-Sw&s"
        },
    ]
    const navigate = useNavigate();

    const goToPostPage = () =>{
        navigate('/newpost');
    }
    const goToUserProfile = () =>{
        navigate('/userprofile');
    }
    const goToUserPage = () =>{
        navigate('/userpage');
    }
    const Logout = () =>{
        navigate('/');
    }
    const VC = () =>{
        navigate('/vc');
    }
    const communities = () =>{
        navigate('/communities');
    }
    const settings = () =>{
        navigate('/settings');
    }


    return(
        <div className="absolute w-full h-screen bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 flex text-white">
            <div className=" h-screen w-1/5">
                <div className="h-1/5 w-full ">
                {/* Upper Section */}
                    <div className="w-full h-1/2 p-5">
                    <img src="../src/assets/logo.png" alt="home" className="w-fit h-full " />

                    </div>
                    <button onClick={goToUserProfile} className="w-full h-1/2 bg-gradient-to-r from-[#6767676d]  to-[#9c048596] rounded-3xl flex justify-center items-center">
                        <div className="w-12 h-12 bg-[#ffffff86] rounded-full mx-2 p-1">
                        <img src="../src/assets/user.png" alt="home" className="" />
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

                    </button>

                </div>
                <div className="flex flex-col h-4/5 w-full justify-between py-3.5">
                    {/* Lower Section */}
                    <div className="py-10 text-gray-400 font-semibold">
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">

                                <img src="../src/assets/home.png" alt="home" className="w-7 mx-1" />
                                <button onClick={goToUserPage} className="text-xl">Home</button>
                            </div>
                        </div>
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                <img src="../src/assets/search.png" alt="home" className="w-7 mx-1" />
                                <button className="text-xl">Explore</button>
                            </div>
                        </div>
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                    <img src="../src/assets/people.png" alt="home" className="w-7 mx-1" />
                                    <button className="text-xl" onClick={communities}>Communities</button>
                            </div>
                        </div>
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                    <img src="../src/assets/chat.png" alt="home" className="w-7 mx-1" />
                                    <button className="text-xl">Messages</button>
                            </div>
                        </div>
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">
                                    <img src="../src/assets/video-camera.png" alt="home" className="w-7 mx-1" />
                                    <button className="text-xl" onClick={VC}>VideoConfrence</button>
                            </div>
                        </div>
                    </div>
                    <div className="">
                        <button onClick={Logout} className="mx-16 my-6 bg-gradient-to-b from-5% from-[#ff599e] to-[#96003e] w-52 h-12 rounded-2xl font-semibold text-lg
                                            duration-700 hover:h-14">Log Out</button>
                    </div>
                </div>
            </div>
            <div className="h-screen w-3/5 px-2">

                <div className="h-full w-full  grid-flow-col overflow-scroll scrollbar-hide bg-white rounded-lg">
                {/* Upper Section */}
                   <div className="w-full h-2/5 flex flex-col">
                        <div className="absolute w-3/5 h-2/5 text-black">
                                <div className="flex flex-col w-full h-full justify-center items-center">
                                    <div className="w-52 h-52 rounded-full border-8 my-2">
                                    <button className="w-full h-full">
                                        <img src={UserImage} alt="home" className="h-full w-full rounded-full object-cover" />
                                    </button>
                                    </div>
                                    <p className=" font-bold text-3xl">UserName</p>
                                    <p className="text-gray-500">@UserID</p>
                                </div>
                        </div>

                        <div className="w-full h-1/2 bg-gradient-to-br from-pink-600 via-purple-800 to-emerald-600">
                        </div>
                        <div className="w-full h-1/2 flex justify-between bg-gray-200">
                                <div className="w-1/5 h-full p-3 text-gray-700 font-medium ">
                                        Insert Bio Here
                                </div>
                                <div className="w-1/5 h-full flex justify-center items-center">
                                <button className="mx-16 bg-gradient-to-b from-5% from-[#7793f7] to-[#2f59f3] w-52 h-12 rounded-2xl font-semibold text-lg
                                            duration-700 hover:h-16 z-10" >Follow
                                </button>
                                </div>
                        </div>

                   </div>
                   <div className="w-full h-3/5 grid grid-cols-4 overflow-y-auto scrollbar-hide">
                        {userPosts.map((Posts,index) =>(
                            <button className="w-60 h-60 m-2 border-4 flex items-center justify-center shadow-lg">
                                <img src={Posts.URL} alt="" className="w-full h-full object-cover"/>
                            </button>
                        ))}
                   </div>

                </div>

            </div>
            <div className=" w-1/5">
                    <div className="h-1/6 w-full flex justify-end items-start p-3">
                    {/* Upper Section */}
                         <div className="p-1">
                         <img src="../src/assets/bell.png" alt="home" className="w-10 mx-1 bg-[#9b9b9b6b] rounded-full hover:bg-[#f5c71fc0] duration-700 hover:w-12" />
                         </div>
                         <button onClick={settings} className="p-1">
                         <img src="../src/assets/settings.png" alt="home" className="w-10 mx-1 bg-[#9b9b9b6b] rounded-full hover:bg-[#75ccf2c0] duration-700 hover:w-12" />
                         </button>
                    </div>
                    <div className="flex flex-col items-center justify-between h-4/5">
                        <div className="my-3 w-full h-96 bg-[#1a072cbf]">

                        </div>
                        <div className="">
                            <button className="mx-16 bg-gradient-to-b from-5% from-[#7793f7] to-[#2f59f3] w-52 h-12 rounded-2xl font-semibold text-lg
                                            duration-700 hover:h-14" onClick={goToPostPage}>Post</button>
                        </div>
                    </div>
            </div>



        </div>
    )
}

export default UserProfile;
