import { useState, useRef } from "react";
import Cropper from "react-cropper";
import { useNavigate } from "react-router-dom";
import { validationError } from "../../utils/errors";
import { apiCall, getMediaPath } from "../../utils/api";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import closeButton from "../../assets/close.png";
import { ArrowLeft } from "lucide-react";
import { handleFormChange } from "../../utils/form";

const CommunitySetting = () => {
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);
    const [members, setMembers] = useState([]);
    const [currentRole, setCurrentRole] = useState();
    const [communityHandle] = useState(useParams().handle);
    const [community, setCommunity] = useState({});
    const [formData, setFormData] = useState({
        name: "",
        handle: "",
    });

    // State for navigation toggles
    const [toggleOverview, setToggleOverview] = useState(true);
    const [toggleRole, setToggleRole] = useState(false);
    const [toggleBan, setToggleBan] = useState(false);

    // State for Create Role modal
    const [createRole, setCreateRole] = useState(false);
    const [roleName, setRoleName] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    const goToCommunities = () => {
        navigate("/communities");
    };

    const Permissions = [
        { Name: "Create Channels", code: "channel:create" },
        { Name: "Create Posts", code: "post:create" },
        { Name: "Ban Members", code: "ban:users" },
        { Name: "Edit Community", code: "community:edit" },
    ];

    // Navigation toggle functions
    const handleOverview = () => {
        setToggleOverview(true);
        setToggleBan(false);
        setToggleRole(false);
    };

    const handleRole = () => {
        setToggleOverview(false);
        setToggleBan(false);
        setToggleRole(true);
    };

    const handleBan = () => {
        setToggleOverview(false);
        setToggleBan(true);
        setToggleRole(false);
    };

    const fetchCommunity = async () => {
        try {
            apiCall(
                `/v1/communities/${communityHandle}`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    setCommunity(response.community);
                },
            );
        } catch (err) {
            validationError(err);
        }
    };

    useEffect(() => {
        fetchCommunity();
        setFormData(() => ({
            handle: community.community_handle,
            name: community.name,
        }));
    }, []);

    // Fetch roles from API
    const fetchRoles = async () => {
        try {
            await apiCall(
                `/v1/community/${communityHandle}/roles`,
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
        }
    };

    // Fetch members from API
    const fetchMembers = async () => {
        try {
            await apiCall(
                `/v1/community/${communityHandle}/members`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    const formattedMembers = response.members.map((user) => ({
                        username: user.username,
                        name: user.name,
                        profile_path: getMediaPath(user.profile_path),
                    }));
                    setMembers(formattedMembers);
                },
            );
        } catch (err) {
            validationError(err.errors);
        }
    };

    // Toggle Create Role modal
    const toggleCreateRole = () => {
        setCreateRole(!createRole);
        if (createRole) {
            setRoleName(""); // Reset form when closing
            setSelectedPermissions([]);
        }
    };

    // Handle permission checkbox changes
    const handlePermissionChange = (permissionCode) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionCode)
                ? prev.filter((code) => code !== permissionCode)
                : [...prev, permissionCode],
        );
    };

    // Submit new role creation
    const handleCreateRoleSubmit = async () => {
        console.log(selectedPermissions);
        try {
            await apiCall(
                `/v1/community/${communityHandle}/roles`,
                "POST",
                { name: roleName, permissions: selectedPermissions },
                {},
                "include",
                false,
                () => {
                    toggleCreateRole();
                    fetchRoles();
                },
            );
        } catch (err) {
            validationError(err.errors);
        }
    };

    // Add or remove role from user
    const addRoleToUserApi = async (e, roleId, username) => {
        const isChecked = e.target.checked;
        const data = { role_id: roleId, username: username };
        try {
            await apiCall(
                `/v1/community/${communityHandle}/roles/user`,
                isChecked ? "POST" : "DELETE", // POST to add, DELETE to remove
                data,
                {},
                "include",
                false,
                () => {},
            );
        } catch (err) {
            validationError(err.errors);
        }
    };

    // Fetch data when Roles tab is active
    useEffect(() => {
        if (toggleRole) {
            fetchRoles();
            fetchMembers();
        }
    }, [toggleRole]);

    const [image, setImage] = useState(null);
    const [croppedImage, setCroppedImage] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [imageBlob, setImageBlob] = useState(null);
    const [profilePath] = useState();
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

    const removeImage = () => {
        if (croppedImage) URL.revokeObjectURL(croppedImage);
        setImage(null);
        setCroppedImage(null);
        setShowCropper(false);
    };

    const editImage = () => {
        setShowCropper(true);
    };

    return (
        <div className="bg-gradient-to-br from-[#1e3a8a] via-[#0f172a] to-[#1e40af] w-full h-screen flex items-center justify-center font-sans">
            <div className="w-full h-full bg-black/60 flex flex-col">
                {/* Top bar */}
                <div className="w-full h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-blue-950/30 shadow-md">
                    {/* Back Button */}
                    <button
                        onClick={goToCommunities}
                        className="text-white hover:bg-blue-700/70 p-2 rounded-full transition-all duration-300"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>

                    {/* Community Name */}
                    <h1 className="text-xl md:text-2xl font-semibold text-white text-center">
                        {community.name}
                    </h1>

                    {/* Spacer to balance layout */}
                    <div className="w-8 md:w-10" />
                </div>

                {/* Section Tabs */}
                <div className="w-full flex justify-center mt-4 px-4">
                    <div className="w-full max-w-3xl grid grid-cols-3 gap-2">
                        {[
                            { name: "Edit Community", onClick: handleOverview },
                            { name: "Roles", onClick: handleRole },
                            { name: "Bans", onClick: handleBan },
                        ].map((item, index) => (
                            <button
                                key={index}
                                onClick={item.onClick}
                                className="h-12 text-lg font-semibold text-white bg-blue-700/80 hover:bg-blue-600 rounded-xl transition-all duration-300"
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto mt-4 px-4 md:px-8 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                    {/* Overview */}
                    {toggleOverview && (
                        <div className="w-full h-full flex flex-col items-center justify-start p-4 md:p-8">
                            {/* Image selection section */}
                            <div className="mt-6 flex flex-col items-center">
                                {!image &&
                                    !croppedImage &&
                                    !community.profile_path && (
                                        <div
                                            className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white flex items-center justify-center bg-gray-300"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        "communityImageInput",
                                                    )
                                                    .click()
                                            }
                                        >
                                            <img
                                                src={getMediaPath(
                                                    "/bugbee/profiles/default.jpg",
                                                )}
                                                alt="Default Profile"
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Overlay with "Upload" text */}
                                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                Upload
                                            </div>
                                        </div>
                                    )}
                                <input
                                    id="communityImageInput"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </div>

                            {!image &&
                                !croppedImage &&
                                community.profile_path && (
                                    <div
                                        className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden cursor-pointer group border-4 border-white"
                                        onClick={() =>
                                            document
                                                .getElementById("fileInput")
                                                .click()
                                        }
                                    >
                                        <img
                                            src={getMediaPath(
                                                community.profile_path,
                                            )}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                        <div
                                            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0
                                    group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                                        >
                                            <span className="text-white font-bold text-sm">
                                                Change
                                            </span>
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
                                            className="w-28 sm:w-32 h-10 rounded-xl bg-[#ff24d046] text-gray-500 hover:bg-[#ff24cf] hover:text-gray-300 font-bold duration-700"
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

                            {/* Inputs for community name and handle */}
                            <div className="w-full max-w-3xl mt-6 space-y-6">
                                <div>
                                    <label className="text-white text-lg font-medium">
                                        Community Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            handleFormChange(e, setFormData)
                                        }
                                        placeholder="e.g. Indus Tech Club"
                                        className="mt-2 w-full h-12 bg-blue-900/40 text-white text-center text-lg placeholder-blue-300 rounded-xl border border-blue-800/50 focus:outline-none focus:border-blue-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-white text-lg font-medium">
                                        Community Handle
                                    </label>
                                    <input
                                        type="text"
                                        name="handle"
                                        value={formData.handle}
                                        onChange={(e) =>
                                            handleFormChange(e, setFormData)
                                        }
                                        placeholder="e.g. @industech"
                                        className="mt-2 w-full h-12 bg-blue-900/40 text-white text-center text-lg placeholder-blue-300 rounded-xl border border-blue-800/50 focus:outline-none focus:border-blue-600"
                                    />
                                </div>

                                <button className="w-full h-12 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all duration-300 hover:scale-105">
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                    );
                    {toggleRole && (
                        <div className="w-full h-full flex flex-col items-center justify-start p-4 md:p-8">
                            <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">
                                {/* Roles List */}
                                <div className="w-full md:w-1/2 flex flex-col">
                                    <p className="text-xl md:text-2xl text-white font-semibold mb-4 text-center md:text-left">
                                        Roles
                                    </p>
                                    <div className="flex-1 bg-blue-900/20 rounded-xl p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                        {roles.map((role, index) => (
                                            <button
                                                key={index}
                                                onClick={() =>
                                                    setCurrentRole(role.ID)
                                                }
                                                className="w-full text-left p-3 bg-blue-800/50 rounded-lg text-white font-medium hover:bg-blue-700/70 hover:scale-102 transition-all duration-300"
                                            >
                                                {role.Name}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="w-full mt-4 h-12 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 hover:scale-105">
                                        Apply
                                    </button>
                                    <button
                                        onClick={toggleCreateRole}
                                        className="w-full mt-2 h-12 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 hover:scale-105"
                                    >
                                        Create Role
                                    </button>
                                </div>

                                {/* Members */}
                                <div className="w-full md:w-1/2 p-4 bg-blue-900/20 rounded-xl overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                    {members.map((member, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between my-2 p-2 hover:bg-blue-800/30 rounded-lg transition-all duration-200"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={member.profile_path}
                                                    alt="profile"
                                                    className="h-10 w-10 rounded-full object-cover hover:scale-110 transition-transform duration-300"
                                                />
                                                <p className="text-white text-lg font-medium">
                                                    {member.username}
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 accent-blue-500 rounded focus:ring-blue-600"
                                                onChange={(e) =>
                                                    addRoleToUserApi(
                                                        e,
                                                        currentRole,
                                                        member.username,
                                                    )
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Create Role Modal */}
                            {createRole && (
                                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                                    <div className="w-full max-w-2xl bg-gradient-to-b from-blue-950 to-blue-900 rounded-2xl p-6 md:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
                                        <div className="flex justify-between items-center mb-6">
                                            <p className="text-2xl md:text-3xl text-white font-semibold">
                                                Create Role
                                            </p>
                                            <button
                                                onClick={toggleCreateRole}
                                                className="hover:scale-110 transition-transform duration-200"
                                            >
                                                <img
                                                    src={closeButton}
                                                    alt="close"
                                                    className="w-6 h-6 invert"
                                                />
                                            </button>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-white text-lg md:text-xl font-medium mb-2">
                                                    Role Name
                                                </p>
                                                <input
                                                    type="text"
                                                    value={roleName}
                                                    onChange={(e) =>
                                                        setRoleName(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full h-12 bg-blue-900/40 text-white text-lg rounded-xl px-4 placeholder-blue-300 border border-blue-800/50 focus:outline-none focus:border-blue-600"
                                                    placeholder="Enter role name"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-white text-lg md:text-xl font-medium mb-2">
                                                    Select Permissions
                                                </p>
                                                <div className="h-64 overflow-y-auto bg-blue-900/40 rounded-xl p-4 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                                    {Permissions.map(
                                                        (permission) => (
                                                            <label
                                                                key={
                                                                    permission.code
                                                                }
                                                                className="flex justify-between items-center py-2 px-4 hover:bg-blue-800/30 rounded-md transition-colors duration-200 cursor-pointer"
                                                            >
                                                                <span className="text-white text-base md:text-lg">
                                                                    {
                                                                        permission.Name
                                                                    }
                                                                </span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPermissions.includes(
                                                                        permission.code,
                                                                    )}
                                                                    onChange={() =>
                                                                        handlePermissionChange(
                                                                            permission.code,
                                                                        )
                                                                    }
                                                                    className="w-5 h-5 accent-blue-500 rounded focus:ring-blue-600"
                                                                />
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleCreateRoleSubmit}
                                                className="w-full h-12 bg-blue-700 text-white rounded-xl font-medium hover:bg-blue-600 transition-all duration-300 hover:scale-105"
                                            >
                                                Create
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {toggleRole && (
                        <div className="w-full h-full flex flex-col items-center justify-start p-4 md:p-8">
                            <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">
                                {/* Roles List */}
                                <div className="w-full md:w-1/2 flex flex-col">
                                    <p className="text-xl md:text-2xl text-white font-semibold mb-4 text-center md:text-left">
                                        Roles
                                    </p>
                                    <div className="flex-1 bg-blue-900/20 rounded-xl p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                        {roles.map((role, index) => (
                                            <button
                                                key={index}
                                                onClick={() =>
                                                    setCurrentRole(role.ID)
                                                }
                                                className="w-full text-left p-3 bg-blue-800/50 rounded-lg text-white font-medium hover:bg-blue-700/70 hover:scale-102 transition-all duration-300"
                                            >
                                                {role.Name}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="w-full mt-4 h-12 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 hover:scale-105">
                                        Apply
                                    </button>
                                    <button
                                        onClick={toggleCreateRole}
                                        className="w-full mt-2 h-12 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 hover:scale-105"
                                    >
                                        Create Role
                                    </button>
                                </div>

                                {/* Members */}
                                <div className="w-full md:w-1/2 p-4 bg-blue-900/20 rounded-xl overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                    {members.map((member, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between my-2 p-2 hover:bg-blue-800/30 rounded-lg transition-all duration-200"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={member.profile_path}
                                                    alt="profile"
                                                    className="h-10 w-10 rounded-full object-cover hover:scale-110 transition-transform duration-300"
                                                />
                                                <p className="text-white text-lg font-medium">
                                                    {member.username}
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 accent-blue-500 rounded focus:ring-blue-600"
                                                onChange={(e) =>
                                                    addRoleToUserApi(
                                                        e,
                                                        currentRole,
                                                        member.username,
                                                    )
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Create Role Modal */}
                            {createRole && (
                                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                                    <div className="w-full max-w-2xl bg-gradient-to-b from-blue-950 to-blue-900 rounded-2xl p-6 md:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
                                        <div className="flex justify-between items-center mb-6">
                                            <p className="text-2xl md:text-3xl text-white font-semibold">
                                                Create Role
                                            </p>
                                            <button
                                                onClick={toggleCreateRole}
                                                className="hover:scale-110 transition-transform duration-200"
                                            >
                                                <img
                                                    src={closeButton}
                                                    alt="close"
                                                    className="w-6 h-6 invert"
                                                />
                                            </button>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-white text-lg md:text-xl font-medium mb-2">
                                                    Role Name
                                                </p>
                                                <input
                                                    type="text"
                                                    value={roleName}
                                                    onChange={(e) =>
                                                        setRoleName(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full h-12 bg-blue-900/40 text-white text-lg rounded-xl px-4 placeholder-blue-300 border border-blue-800/50 focus:outline-none focus:border-blue-600"
                                                    placeholder="Enter role name"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-white text-lg md:text-xl font-medium mb-2">
                                                    Select Permissions
                                                </p>
                                                <div className="h-64 overflow-y-auto bg-blue-900/40 rounded-xl p-4 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                                    {Permissions.map(
                                                        (permission) => (
                                                            <label
                                                                key={
                                                                    permission.code
                                                                }
                                                                className="flex justify-between items-center py-2 px-4 hover:bg-blue-800/30 rounded-md transition-colors duration-200 cursor-pointer"
                                                            >
                                                                <span className="text-white text-base md:text-lg">
                                                                    {
                                                                        permission.Name
                                                                    }
                                                                </span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPermissions.includes(
                                                                        permission.code,
                                                                    )}
                                                                    onChange={() =>
                                                                        handlePermissionChange(
                                                                            permission.code,
                                                                        )
                                                                    }
                                                                    className="w-5 h-5 accent-blue-500 rounded focus:ring-blue-600"
                                                                />
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleCreateRoleSubmit}
                                                className="w-full h-12 bg-blue-700 text-white rounded-xl font-medium hover:bg-blue-600 transition-all duration-300 hover:scale-105"
                                            >
                                                Create
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {toggleBan && (
                        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-semibold">
                            Bans feature coming soon.
                        </div>
                    )}
                </div>
            </div>
            {/* </div> */}
            {/* Create Role Modal */}
            {createRole && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="w-11/12 md:w-3/5 bg-gradient-to-b from-blue-950 to-blue-900 rounded-2xl p-6 md:p-8 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-2xl text-white font-semibold">
                                Create Role
                            </p>
                            <button
                                onClick={toggleCreateRole}
                                className="hover:scale-110 transition-transform duration-200"
                            >
                                <img
                                    src={closeButton}
                                    alt="close"
                                    className="w-6 h-6 invert"
                                />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-white text-lg font-medium mb-2 block">
                                    Role Name
                                </label>
                                <input
                                    type="text"
                                    value={roleName}
                                    onChange={(e) =>
                                        setRoleName(e.target.value)
                                    }
                                    className="w-full h-12 bg-blue-900/40 text-white text-lg rounded-xl px-4 placeholder-blue-300 border border-blue-800/50 focus:outline-none focus:border-blue-600"
                                    placeholder="Enter role name"
                                />
                            </div>
                            <div>
                                <label className="text-white text-lg font-medium mb-2 block">
                                    Select Permissions
                                </label>
                                <div className="h-64 overflow-y-auto bg-blue-900/40 rounded-xl p-4 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/20">
                                    {Permissions.map((permission) => (
                                        <label
                                            key={permission.code}
                                            className="flex justify-between items-center py-2 px-4 hover:bg-blue-800/30 rounded-md transition-colors duration-200 cursor-pointer"
                                        >
                                            <span className="text-white">
                                                {permission.Name}
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.includes(
                                                    permission.code,
                                                )}
                                                onChange={() =>
                                                    handlePermissionChange(
                                                        permission.code,
                                                    )
                                                }
                                                className="w-5 h-5 accent-blue-500"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleCreateRoleSubmit}
                                className="w-full h-12 bg-blue-700 text-white rounded-xl font-medium hover:bg-blue-600 transition-all duration-300 hover:scale-105"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunitySetting;
