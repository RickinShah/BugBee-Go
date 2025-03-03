import React from "react";
import Card from "./Cards.jsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Scrollbar from "react-scrollbars-custom";

const UserPage = () =>{
    const [Username,setUsername] = useState("Shubham Patel");
    const [UserId,setUserId] = useState("ShubhamPatel");
    const [Notificationtoggle,setNotificationtoggle] = useState(false);
    const navigate = useNavigate();

    const goToPostPage = () =>{
        navigate('/newpost');
    }
    const Logout = () =>{
        navigate('/');
    }
    
    function toggle(){
        setNotificationtoggle(!Notificationtoggle);
    }
    
    const [SearchToggle,setSearchToggle] = useState(false)
    function SearchSuggestion(event){
        let somethingToRelyOn = event.target.value;
        somethingToRelyOn.trim() == '' ?  setSearchToggle(false) : setSearchToggle(true)
    }

    const CardData = [
        {
            imgSrc: "https://akm-img-a-in.tosshub.com/indiatoday/images/story/202409/shubman-gill-212053558-16x9_0.jpg?VersionId=sTRbbhSAwMkBA9oxYJ7fu7O8ZNu8QfNg&size=690:388",
            Name: "Shubhman Gill",
            ID: "Shubh",
            UserImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStud7QXebx6UWrwFpT2u-GakV8yEaTVv40sMNBoNucJpZKj1VOyi_CZmmBz18q93n3XmjbhXyhDnLrfp-mBDHEuVSUBlKo2OGp_7xkcA",
            description: "Done and Dusted!",
            Title: "Next Gen of Cricket",
        },
        {
            imgSrc: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJ26EsZi7DNtA2wSpvNiySBe2t-AA_M3Y7Wg&s",
            Name: "Virat Kohli",
            ID: "VK",
            UserImage: "data:image/webp;base64,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",
            description: "81st century coming soon!!",
        },
        {
            imgSrc: "https://images.indianexpress.com/2024/09/Chess-olympiad.jpg?w=414",
            Name: "Times of India",
            ID: "TOI",
            UserImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQps8ve-lA2zYqKa6DA_-em5XLdgScm0h24Q&s",
            description: "Chess Olympiad 2024 Round 11 Highlights: Gukesh and Co, Harika and Co make it a historic day as India win Open and Women’s gold medals",
        },
        
    ];
    return(
        <div className="absolute w-full h-screen bg-gradient-to-br from-[#242380] via-blue-950 bg-purple-800 flex text-white">
            <div className=" h-screen w-1/5">
                <div className="h-1/5 w-full ">
                {/* Upper Section */}
                    <div className="w-full h-1/2 p-5">
                    <img src="../src/assets/logo.png" alt="home" className="w-fit h-full " />

                    </div>
                    <div className="w-full h-1/2 bg-gradient-to-r from-[#6767676d]  to-[#9c048596] rounded-3xl flex justify-center items-center">
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

                    </div>
                    
                </div>
                <div className="flex flex-col h-4/5 w-full justify-between py-3.5">
                    {/* Lower Section */}
                    <div className="py-10 text-gray-400 font-semibold">
                        <div className="w-full h-14 my-2 flex items-center rounded-3xl hover:h-16 hover:bg-[#9b9b9b6b] hover:text-gray-300 duration-500">
                            <div className="w-1/3 flex justify-start mx-16">

                                <img src="../src/assets/home.png" alt="home" className="w-7 mx-1" />
                                <button className="text-xl">Home</button>
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
                                    <button className="text-xl">Communities</button>
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
                                    <button className="text-xl">VideoConfrence</button>
                            </div>
                        </div>
                    </div>
                    <div className="">
                        <button onClick={Logout} className="mx-16 my-6 bg-gradient-to-b from-5% from-[#ff599e] to-[#96003e] w-52 h-12 rounded-2xl font-semibold text-lg
                                            duration-700 hover:h-14">Log Out</button>
                    </div>
                </div>
            </div>
            <div className="h-screen w-3/5">
            
                <div className="h-1/6 w-full py-2 flex justify-center">
                {/* Upper Section */}
                    <div className="bg-gradient-to-r from-[#8787872b] via-[#5555554d] to-[#a5a5a53c] w-4/5 h-10 rounded-3xl border border-pink-600">
                        <img className="absolute w-10 z-0" src="../src/assets/search-bar.png" alt="" />
                        <input type="text" className="w-full h-full bg-transparent rounded-3xl px-14 z-10" placeholder="Search"/>
                    </div>

                </div>
                <div className="absolute w-3/5 h-5/6 px-9">
                <div className='static w-full h-full overflow-auto scroll-smooth scrollbar-hide'>  
                    <br /><br />
                    {CardData.map((CardItem, index) => (
                    <Card
                        key={index}
                        imgSrc={CardItem.imgSrc}
                        UserImage={CardItem.UserImage}
                        Name={CardItem.Name}
                        ID={CardItem.ID}
                        description={CardItem.description}
                        title={CardItem.Title}
                    />
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
                         <div className="p-1">
                         <img src="../src/assets/settings.png" alt="home" className="w-10 mx-1 bg-[#9b9b9b6b] rounded-full hover:bg-[#75ccf2c0] duration-700 hover:w-12" />
                         </div>
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

export default UserPage;