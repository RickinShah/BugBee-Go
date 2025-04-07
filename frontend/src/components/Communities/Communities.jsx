import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "./Card.jsx";
import Announcement from "./Announcement.jsx";
import { apiCall, getMediaPath } from "../../utils/api.js";
import { validationError } from "../../utils/errors.js";
import { useEffect } from "react";
import useNavigation from "../../utils/navigate.jsx";
import addButton from "../../assets/plus-community.png";
import backButton from "../../assets/back-1.png";
import toggleChannelsButton from "../../assets/channels.png";
import toggleMembersButton from "../../assets/members.png";
import searchIcon from "../../assets/search-1.png";
import closeButton from "../../assets/close.png";

const Communities = () => {
    const [toggleChannel, settoggleChannel] = useState(false);
    const [channels, setChannels] = useState([]);
    const [toggleCreateCommunity, settoggleCreateCommunity] = useState(false);
    const [roles, setRoles] = useState([]);
    const [members, setMembers] = useState([]);
    const [joinedCommunities, setJoinedCommunities] = useState([]);
    const [toggleChannels, setToggleChannels] = useState(false);
    const [toggleMembers, setToggleMembers] = useState(false);
    const [profilePath] = useState(() => localStorage.getItem("profile_path"));
    const [isSelected, setSelected] = useState(false);
    const [selectedCommunityId, setSelectedCommunityId] = useState();
    const { goTo } = useNavigation();
    const [currentCommunity, setCurrentCommunity] = useState({});

    const [channelName, setChannelName] = useState("");
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedCommunityHandle, setSelectedCommunityHandle] = useState(""); // Store current community handle

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
        navigate(`/community/${currentCommunity.community_handle}/settings`);
    };
    const goToCreateCommunity = () => {
        navigate("/community/create");
    };

    const handleCommunityClick = (community) => {
        localStorage.setItem("currentCommunity", JSON.stringify(community));
        setSelected(true);
        setToggleChannels(true);
        setSelectedCommunityHandle(community.community_handle); // Store handle for API calls
        setSelectedCommunityId(community.community_id);
        fetchMembers(community.community_handle);
        setCurrentCommunity(community);
        fetchChannels(community.community_handle);
    };

    const fetchChannels = async (handle) => {
        try {
            await apiCall(
                `/v1/community/${handle}/channels`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    console.log(response.channels);
                    setChannels(response.channels);
                },
            );
        } catch (err) {
            validationError(err);
        }
    };

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
        const handle = selectedCommunityHandle;

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
                    ChannelToggleFunction();
                    console.log(response.channel);
                    setChannels((prevChannels) => [
                        ...(prevChannels || []),
                        response.channel,
                    ]);
                },
            );
        } catch (err) {
            validationError(err.errors);
            return;
        }
    };

    const fetchMembers = async (community_handle) => {
        await apiCall(
            `/v1/community/${community_handle}/members`,
            "GET",
            null,
            {},
            "include",
            false,
            (response) => {
                setMembers(response.members);
            },
        );
    };

    const fetchJoinedCommunities = async () => {
        await apiCall(
            "/v1/communities/joined",
            "GET",
            null,
            {},
            "include",
            false,
            (response) => {
                setJoinedCommunities(response.communities);
            },
        );
    };

    useEffect(() => {
        fetchJoinedCommunities();
    }, []);

    // useEffect(() => {
    //     // Load stored community handle from localStorage on component mount
    //     const storedCommunity = localStorage.getItem("currentCommunity");
    //     if (storedCommunity) {
    //         const { handle } = JSON.parse(storedCommunity);
    //         setCommunityHandle(handle);
    //     }
    // }, []);

    return (
        <div className="bg-gradient-to-br from-[#1e3a8a] via-[#0f172a] to-[#1e40af] w-full h-screen flex flex-col md:flex-row font-sans">
            {/* Sidebar (Mobile Navbar / Desktop Sidebar) */}
            <div className="bg-[#1e3a8a] w-full md:w-20 h-16 md:h-full flex flex-row md:flex-col justify-between items-center md:items-stretch shadow-2xl fixed top-0 left-0 z-20">
                <div className="p-2 md:p-3">
                    <div className="bg-blue-950 rounded-full p-2 shadow-md hover:scale-110 transition-transform duration-300">
                        <img
                            src={profilePath}
                            alt="profile"
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full"
                            onClick={() => goTo("profile")}
                        />
                    </div>
                </div>

                <div className="flex md:flex-1 p-1 overflow-x-auto md:overflow-y-auto scrollbar-hide flex-row md:flex-col">
                    {joinedCommunities != null &&
                        joinedCommunities.map((community) => (
                            <div
                                key={community.community_id}
                                className={`w-12 h-12 md:w-12 md:h-12 flex-shrink-0 md:my-2 mx-1 md:mx-auto rounded-full border-2 transition-all duration-300
                        ${
                            selectedCommunityId == community.community_id
                                ? "border-blue-600 bg-blue-100 shadow-lg ring-4 ring-blue-500 ring-offset-2 scale-110"
                                : "border-blue-500/50 hover:border-blue-400 hover:scale-110"
                        }
                    `}
                            >
                                <button
                                    className="w-full h-full"
                                    onClick={() =>
                                        handleCommunityClick(community)
                                    }
                                >
                                    <img
                                        src={getMediaPath(
                                            community.profile_path,
                                        )}
                                        alt={community.name}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                </button>
                            </div>
                        ))}
                    <button
                        onClick={CreateCommunity}
                        className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 md:my-2 mx-1 md:mx-auto rounded-full bg-blue-800/50 hover:bg-blue-700/70 transition-colors duration-300 flex items-center justify-center"
                    >
                        <img
                            src={addButton}
                            alt="add community"
                            className="w-6 h-6 md:w-7 md:h-7 invert"
                        />
                    </button>
                </div>
                <div className="p-4 md:p-4 hidden md:block">
                    <div className="w-full h-auto bg-blue-700/80 text-white rounded-xl font-medium flex flex-col items-center justify-center space-y-4 py-4">
                        <button
                            className="w-1/2 h-full p-1 bg-blue-700/80 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center"
                            onClick={() => setToggleChannels(!toggleChannels)}
                        >
                            <img
                                src={toggleChannelsButton}
                                alt="channels"
                                className="w-4 h-4 invert"
                            />
                        </button>
                        <button
                            className="w-1/2 h-full p-1 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center"
                            onClick={() => setToggleMembers(!toggleMembers)}
                        >
                            <img
                                src={toggleMembersButton}
                                alt="members"
                                className="w-4 h-4 invert"
                            />
                        </button>
                    </div>
                </div>

                <div className="p-4 md:p-6 hidden md:block">
                    <button
                        className="w-full h-6 md:h-8 bg-blue-700/80 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center gap-0"
                        onClick={goToUserPage}
                    >
                        <img
                            src={backButton}
                            alt="back"
                            className="w-3 h-3 invert"
                        />
                        <span className="text-sm font-semibold"></span>
                    </button>
                </div>
            </div>

            {/* Mobile Community Toggle */}
            {toggleCreateCommunity && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="w-11/12 max-w-sm md:max-w-md bg-gradient-to-b from-blue-950 to-blue-900 rounded-2xl p-6 shadow-xl transform transition-all duration-300">
                        <button
                            onClick={goToCreateCommunity}
                            className="w-full my-2 h-12 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                        >
                            Create Community
                        </button>
                        <button
                            onClick={JoinedCommunity}
                            className="w-full my-2 h-12 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                        >
                            Join Community
                        </button>
                        <button
                            onClick={CreateCommunity}
                            className="w-full my-2 h-12 bg-blue-800/50 hover:bg-blue-700/70 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Container */}
            <div className="flex-1 h-[calc(100vh-4rem)] md:h-full flex flex-col md:flex-row mt-16 md:mt-0 md:pl-20">
                {/* Mobile Toggle Buttons */}
                <div className="flex justify-between px-4 py-2 bg-blue-950/30 md:hidden">
                    <button
                        onClick={() => setToggleChannels(!toggleChannels)}
                        className="flex items-center gap-2 text-white font-medium"
                    >
                        <img
                            src={toggleChannelsButton}
                            alt="channels"
                            className="w-5 h-5 invert"
                        />
                        Channels
                    </button>
                    <button
                        onClick={() => setToggleMembers(!toggleMembers)}
                        className="flex items-center gap-2 text-white font-medium"
                    >
                        <img
                            src={toggleMembersButton}
                            alt="members"
                            className="w-5 h-5 invert"
                        />
                        Members - {currentCommunity.member_count || 0}
                    </button>
                </div>

                {/* Channels Overlay (Mobile) / Sidebar (Desktop) */}
                {toggleChannels && window.innerWidth >= 768 && (
                    <div
                        className={`fixed md:static top-16 md:top-0 left-0 md:left-0 w-3/4 md:w-60 h-[calc(100vh-4rem)] md:h-full bg-blue-900/20 flex flex-col backdrop-blur-sm z-30 md:z-10 transition-transform duration-300 ${toggleChannels ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 shadow-md md:shadow-lg`}
                    >
                        <div className="h-16 md:h-20 bg-blue-950/30 flex items-center justify-between px-4 border-b border-blue-800/50">
                            <button
                                className="w-full text-white font-semibold text-lg md:text-xl hover:text-blue-200 transition-colors duration-200 text-left"
                                onClick={goToCommunitySetting}
                            >
                                {currentCommunity.name}
                            </button>
                            <button
                                onClick={() => setToggleChannels(false)}
                                className="md:hidden"
                            >
                                <img
                                    src={closeButton}
                                    alt="close"
                                    className="w-6 h-6 invert"
                                />
                            </button>
                        </div>

                        <div className="flex-1 p-1 md:p-3 space-y-2 md:space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                            <div className="flex justify-between items-center text-white">
                                <span className="font-semibold text-base md:text-lg">
                                    Channels
                                </span>
                                <button
                                    onClick={() => {
                                        ChannelToggleFunction();
                                        fetchRoles(
                                            currentCommunity.community_handle,
                                        );
                                    }}
                                    className="hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-blue-800/30"
                                >
                                    <img
                                        src={addButton}
                                        alt="add"
                                        className="w-6 h-6 invert"
                                    />
                                </button>
                            </div>
                            <div className="flex flex-col items-center">
                                {channels &&
                                    channels.map((channel) => (
                                        <Card
                                            key={channel.channel_id}
                                            name={channel.name}
                                            community_id={channel.community_id}
                                        />
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {toggleChannel && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                        <div className="w-11/12 max-w-sm md:w-[30rem] bg-blue-950/95 rounded-2xl p-6 md:p-8 shadow-xl transform scale-100 transition-all duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-white text-lg md:text-2xl font-semibold">
                                    Create Channel
                                </h2>
                                <button
                                    onClick={ChannelToggleFunction}
                                    className="hover:scale-110 transition-transform duration-200"
                                >
                                    <img
                                        src={closeButton}
                                        alt="close"
                                        className="w-6 h-6 invert"
                                    />
                                </button>
                            </div>
                            <div className="space-y-4 md:space-y-6">
                                <input
                                    type="text"
                                    placeholder="Channel Name"
                                    className="w-full h-12 bg-blue-900/40 rounded-lg text-white text-center border border-blue-800/50 focus:outline-none focus:border-blue-600 placeholder-blue-300 text-sm md:text-base"
                                    value={channelName}
                                    onChange={(e) =>
                                        setChannelName(e.target.value)
                                    }
                                />
                                <div className="bg-blue-900/40 rounded-lg p-4 max-h-40 md:max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                    {roles.map((role) => (
                                        <div
                                            key={role.ID}
                                            className="flex justify-between items-center py-2 px-3 text-white hover:bg-blue-800/30 rounded-md transition-colors duration-200"
                                        >
                                            <span className="text-sm md:text-base">
                                                {role.Name}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 md:w-5 md:h-5 accent-blue-500 rounded focus:ring-blue-600"
                                                checked={selectedRoles.includes(
                                                    role.ID,
                                                )}
                                                onChange={() =>
                                                    handleRoleSelection(role.ID)
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className="w-full h-12 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                                    onClick={createChannel}
                                >
                                    Create Channel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 bg-gradient-to-br from-blue-950 via-[#0f172a] to-blue-900 p-4 md:p-8 h-full">
                    <div className="w-full h-14 mb-4 md:h-16 md:mb-8 flex justify-center">
                        <div className="w-full md:w-11/12 flex items-center gap-2 md:gap-4">
                            <div className="relative flex-1">
                                <img
                                    src={searchIcon}
                                    alt="search"
                                    className="w-4 md:w-6 h-4 md:h-6 invert absolute left-3 md:left-4 top-1/2 -translate-y-1/2"
                                />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    className="w-full h-10 md:h-14 bg-blue-900/30 text-white placeholder-blue-300 rounded-xl pl-10 md:pl-12 pr-4 border border-blue-800/50 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/50 text-sm md:text-base shadow-sm"
                                />
                            </div>
                            <button className="w-10 md:w-14 h-10 md:h-14 bg-blue-700 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-md">
                                <img
                                    src={addButton}
                                    alt="add"
                                    className="w-5 md:w-7 h-5 md:h-7 invert"
                                />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-3.5rem)] md:h-[calc(100%-5rem)] scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20 space-y-4 md:space-y-6">
                        {isSelected &&
                            CardDatas.map((CardItem, index) => (
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

                {/* Members Overlay (Mobile) / Sidebar (Desktop) */}
                {toggleMembers && (
                    <div
                        className={`fixed md:static inset-0 md:inset-auto w-3/4 md:w-60 h-full bg-blue-900/20 flex flex-col backdrop-blur-sm z-30 md:z-10 transition-transform duration-300 ${toggleMembers ? "translate-x-0" : "translate-x-full"} md:translate-x-0 shadow-md md:shadow-lg`}
                    >
                        <div className="h-16 md:h-20 bg-blue-950/30 flex items-center justify-between px-6 border-b border-blue-800/50">
                            <span className="text-white font-semibold text-base md:text-lg">
                                Members - {currentCommunity.member_count || 0}
                            </span>
                            <button
                                onClick={() => setToggleMembers(false)}
                                className="md:hidden"
                            >
                                <img
                                    src={toggleMembersButton}
                                    alt="members"
                                    className="w-5 h-5 invert"
                                />
                            </button>
                        </div>
                        <div className="flex-1 p-4 md:p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                            {members.map((member, index) => (
                                <div
                                    key={index}
                                    className="flex items-center p-2 hover:bg-blue-800/20 rounded-lg transition-all duration-200 group"
                                >
                                    <img
                                        src={getMediaPath(member.profile_path)}
                                        alt={member.username}
                                        className="w-8 md:w-12 h-8 md:h-12 rounded-full object-cover mr-2 md:mr-4 shadow-sm"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium text-sm md:text-base group-hover:text-blue-200 transition-colors">
                                            {member.name}
                                        </span>
                                        <span className="text-white font-medium text-xs md:text-sm group-hover:text-blue-200 transition-colors">
                                            @{member.username}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default Communities;
