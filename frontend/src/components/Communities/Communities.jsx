import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Scrollbar from "react-scrollbars-custom";
import Card from "./Card.jsx";
import Announcement from "./Announcement.jsx";
import { apiCall } from "../../utils/api.js";
import { validationError } from "../../utils/errors.js";
import { useEffect } from "react";

const Communities = () => {
    const [toggleChannel, settoggleChannel] = useState(false);
    const [toggleCreateCommunity, settoggleCreateCommunity] = useState(false);
    const [roles, setRoles] = useState([]);
    const [members, setMembers] = useState([]);

    // New state variables for channel creation
    const [channelName, setChannelName] = useState("");
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [communityHandle, setCommunityHandle] = useState(""); // Store current community handle

    function CreateCommunity() {
        settoggleCreateCommunity(!toggleCreateCommunity);
    }

    function JoinedCommunity() {
        alert("Search bar");
        CreateCommunity();
    }

    function ChannelToggleFunction() {
        // Reset form state when toggling the modal
        if (!toggleChannel) {
            setChannelName("");
            setSelectedRoles([]);
        }
        settoggleChannel(!toggleChannel);
    }

    const navigate = useNavigate();

    const goToUserPage = () => {
        navigate("/feed");
    };
    const goToCommunitySetting = () => {
        navigate("/cs");
    };
    const goToCreateCommunity = () => {
        navigate("/createcommunity");
    };

    const JoinedCommunities = [
        {
            img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVNN58XFDLxdqtwwWRSE924NjtuSryXFGxjg&s",
            name: "Community1",
            handle: "community1", // Added handle property for API calls
        },
        {
            img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoBuMvSuYezLE9rwI-zOJeIOmcIGfDPqOvFA&s",
            name: "Community2",
            handle: "community2", // Added handle property for API calls
        },
    ];

    // Function to handle community click and store in localStorage
    const handleCommunityClick = (community) => {
        localStorage.setItem("currentCommunity", JSON.stringify(community));
        setCommunityHandle(community.handle); // Store handle for API calls
        console.log(
            `Selected community: ${community.name} stored in localStorage`,
        );
    };

    const [CardData, setCardData] = useState([
        { Name: "Announcement", TextChannel: "ISAC Announcement" },
        { Name: "ISAC PANNEL", TextChannel: "ISAC messages" },
        { Name: "Rhapsody", TextChannel: "Event details" },
        { Name: "Badminton", TextChannel: "Tournament details" },
    ]);

    let CardDatas = [
        {
            imgSrc: "https://akm-img-a-in.tosshub.com/indiatoday/images/story/202409/shubman-gill-212053558-16x9_0.jpg?VersionId=sTRbbhSAwMkBA9oxYJ7fu7O8ZNu8QfNg&size=690:388",
            Name: "Shubhman Gill",
            ID: "Shubh",
            UserImage:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStud7QXebx6UWrwFpT2u-GakV8yEaTVv40sMNBoNucJpZKj1VOyi_CZmmBz18q93n3XmjbhXyhDnLrfp-mBDHEuVSUBlKo2OGp_7xkcA",
            description: "Done and Dusted!",
            Title: "Next Gen of Cricket",
        },
    ];

    const fetchRoles = async (handle) => {
        try {
            await apiCall(
                `/v1/community/${handle}/roles`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    const formattedRoles = response.roles.map((role) => ({
                        ID: role.role_id,
                        Name: role.name,
                    }));
                    setRoles(formattedRoles);
                },
            );
        } catch (err) {
            validationError(err.errors);
            return;
        }
    };

    // Handle checkbox changes for role selection
    const handleRoleSelection = (roleId) => {
        // If role is already selected, remove it; otherwise, add it
        if (selectedRoles.includes(roleId)) {
            setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
        } else {
            setSelectedRoles([...selectedRoles, roleId]);
        }
    };

    // Updated createChannel function to use the collected data
    const createChannel = async () => {
        // Validate input
        if (!channelName.trim()) {
            alert("Please enter a channel name");
            return;
        }

        if (selectedRoles.length === 0) {
            alert("Please select at least one role");
            return;
        }

        // Get current community handle
        const handle = communityHandle || "ricki"; // Fallback to "ricki" if no handle is set

        try {
            await apiCall(
                `/v1/community/${handle}/channels`,
                "POST",
                {
                    name: channelName,
                    roles: selectedRoles,
                },
                {},
                "include",
                false,
                (response) => {
                    console.log("Channel created successfully:", response);
                    // Close the modal after successful creation
                    ChannelToggleFunction();
                    // setCardData(...CardData, { Name: channelName });
                    // CardData = [...CardData, { Name: channelName }];
                    // Optionally refresh the channel list
                    // fetchChannels(handle);
                },
            );
        } catch (err) {
            validationError(err.errors);
            return;
        }
    };

    // useEffect(() => {
    //     // Load stored community handle from localStorage on component mount
    //     const storedCommunity = localStorage.getItem("currentCommunity");
    //     if (storedCommunity) {
    //         const { handle } = JSON.parse(storedCommunity);
    //         setCommunityHandle(handle);
    //     }
    // }, []);

    return (
        <div className="bg-gradient-to-br from-[#242380] via-blue-950 to-purple-800 w-full h-screen flex flex-row">
            <div className="bg-[#242380] w-[90px] h-full flex flex-col justify-between">
                <div className="w-full h-20">
                    <div className="w-fit h-fit bg-[#fffffffe] rounded-full mx-2 p-1">
                        <img
                            src="../src/assets/user.png"
                            alt="home"
                            className="p-1"
                        />
                    </div>
                </div>
                <div className="w-full h-[650px] p-1 overflow-scroll grid-flow-col justify-center scrollbar-hide rounded-2xl bg-[#0000008e]">
                    {JoinedCommunities.map((JC, index) => (
                        <div
                            key={index}
                            className="w-20 h-20 my-5 rounded-full flex justify-center border-[4px] hover:w-16 hover:h-16 duration-500"
                        >
                            <button
                                className="w-full h-full"
                                onClick={() => handleCommunityClick(JC)} // Add click handler here
                            >
                                <img
                                    src={JC.img}
                                    alt="home"
                                    className="h-full w-fit rounded-full object-cover"
                                />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={CreateCommunity}
                        className="w-20 h-20 my-5 rounded-full flex justify-center border-[4px] hover:w-16 hover:h-16 duration-500"
                    >
                        <img
                            src="../src/assets/add (4).png"
                            alt="home"
                            className="h-full w-fit rounded-full object-cover"
                        />
                    </button>

                    {toggleCreateCommunity && (
                        <div className="w-full h-full fixed top-0 left-0 bg-[#00000070] z-10">
                            <div className="w-full h-full flex flex-col justify-center items-center">
                                <div className="w-1/3 border border-blue-900 h-2/3 rounded-lg bg-[#10163e] flex flex-col justify-center items-center">
                                    <button
                                        onClick={goToCreateCommunity}
                                        className="my-3 rounded-sm w-1/2 h-12 bg-blue-950 text-gray-400 hover:text-gray-300 font-semibold text-xl"
                                    >
                                        Create Community
                                    </button>
                                    <button
                                        onClick={JoinedCommunity}
                                        className="my-3 rounded-sm w-1/2 h-12 bg-blue-950 text-gray-400 hover:text-gray-300 font-semibold text-xl"
                                    >
                                        Join Community
                                    </button>
                                    <button
                                        onClick={CreateCommunity}
                                        className="my-3 rounded-sm w-1/2 h-12 bg-blue-950 text-gray-400 hover:text-gray-300 font-semibold text-xl"
                                    >
                                        Go Back
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="w-full h-20">
                    <div className="w-full h-full flex justify-center items-center">
                        <button
                            className="font-semibold text-lg text-white bg-gradient-to-b from-5% from-[#7793f7] to-[#2f59f3] w-4/5 h-1/2 rounded-3xl hover:w-1/2 duration-1000"
                            onClick={goToUserPage}
                        >
                            Back
                        </button>
                    </div>
                </div>
            </div>

            {/* Main section */}
            <div className="w-full h-full bg-[#521789] flex">
                <div className="w-1/6 h-full bg-[#521789] flex flex-col justify-start items-center">
                    <div className="w-full h-16 flex justify-between items-center p-1 font-semibold bg-[#00000061]">
                        <button
                            className="w-full h-full text-gray-300 hover:text-white font-bold text-xl"
                            onClick={goToCommunitySetting}
                        >
                            ISAC
                        </button>
                    </div>
                    {toggleChannel && (
                        <div className="fixed left-0 w-full h-full bg-[#0000008e]">
                            <div className="w-full h-full flex justify-center items-center">
                                <div className="w-1/2 h-1/2 bg-blue-950 flex flex-col">
                                    <div className="flex justify-between p-3">
                                        <div className="font-semibold text-white text-3xl">
                                            Create Channel
                                        </div>
                                        <div>
                                            <button className="w-7 h-7 hover:w-8 hover:h-8 duration-1000">
                                                <img
                                                    src="../src/assets/back.png"
                                                    alt=""
                                                    className="w-7 h-7 hover:w-8 hover:h-8 duration-1000 rotate-180"
                                                    onClick={
                                                        ChannelToggleFunction
                                                    }
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 grid overflow-scroll scrollbar-hide">
                                        <input
                                            type="text"
                                            placeholder="Title"
                                            className="text-center text-xl text-white w-full h-14 bg-[#00000069] rounded-lg my-2"
                                            value={channelName}
                                            onChange={(e) =>
                                                setChannelName(e.target.value)
                                            }
                                        />
                                        <div className="text-center text-xl text-white w-full h-fit bg-[#00000069] rounded-lg my-2">
                                            {roles.map((role, key) => (
                                                <div className="my-3" key={key}>
                                                    <div className="flex justify-between px-5">
                                                        <p>{role.Name}</p>
                                                        <input
                                                            type="checkbox"
                                                            className="accent-pink-600"
                                                            checked={selectedRoles.includes(
                                                                role.ID,
                                                            )}
                                                            onChange={() =>
                                                                handleRoleSelection(
                                                                    role.ID,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-center text-xl text-white w-full h-14 font-bold rounded-lg my-2">
                                            <button
                                                className="hover:text-2xl duration-1000"
                                                onClick={createChannel}
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="w-full h-full grid overflow-scroll scrollbar-hide">
                        <div className="flex flex-col justify-start border-y">
                            <div className="w-full h-12 flex justify-between items-center p-1 font-semibold text-white">
                                <p>Channels</p>
                                <button
                                    className="w-7 h-7 hover:w-8 hover:h-8 duration-1000"
                                    onClick={() => {
                                        ChannelToggleFunction();
                                        fetchRoles("ricki");
                                    }}
                                >
                                    <img
                                        src="../src/assets/plus (1).png"
                                        alt=""
                                        className="w-7 h-7 hover:w-8 hover:h-8 duration-1000"
                                    />
                                </button>
                            </div>
                            {CardData.map((CardItem, index) => (
                                <Card
                                    key={index}
                                    Name={CardItem.Name}
                                    TextChannel={CardItem.TextChannel}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-4/6 h-full bg-gradient-to-br from-[#060615] via-[#00004e] to-purple-950">
                    <div className="static w-full h-full overflow-auto scroll-smooth scrollbar-hide p-10">
                        <div className="fixed left-0 w-full my-2 h-10">
                            <div className="flex w-full h-full justify-center items-center">
                                <div className="w-1/2 h-full flex justify-between">
                                    <input
                                        type="text"
                                        placeholder="Search"
                                        className="text-lg text-white placeholder-white text-center w-full mx-1 bg-[#bebebe6e] rounded-3xl border border-pink-400 px-14 z-10"
                                    />
                                    <button className="mx-1 w-10 h-10 rounded hover:w-11 hover:h-11 duration-700">
                                        <img
                                            src="../src/assets/add (3).png"
                                            alt="home"
                                            className=""
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <br />
                        <br />
                        {CardDatas.map((CardItem, index) => (
                            <Announcement
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

                <div className="w-1/6 h-full bg-[#521789] flex flex-col justify-start items-center">
                    <div className="w-full h-16 flex justify-between items-center p-1 font-semibold bg-[#00000061]"></div>
                    <div className="w-full h-full grid overflow-scroll scrollbar-hide">
                        <div className="flex flex-col justify-start border-y">
                            <div className="w-full h-12 flex justify-between items-center p-1 font-semibold text-white">
                                <p>Members</p>
                            </div>
                            {members.map((member, index) => (
                                <div
                                    key={index}
                                    className="w-10 h-10 my-2 mx-3 rounded-full hover:w-16 hover:h-16 duration-500"
                                >
                                    <button className="w-full h-full flex items-center">
                                        <img
                                            src={member.img}
                                            alt="home"
                                            className="h-full w-fit rounded-full object-cover"
                                        />
                                        <p className="font-semibold text-lg mx-3 text-white">
                                            {member.Name}
                                        </p>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Communities;
