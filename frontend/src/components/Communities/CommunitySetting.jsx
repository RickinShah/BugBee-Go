import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { validationError } from "../../utils/errors";
import { apiCall, getMediaPath } from "../../utils/api";
import { useEffect } from "react";

const CommunitySetting = () => {
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);
    const [members, setMembers] = useState([]);
    const [currentRole, setCurrentRole] = useState();

    const goToCommunities = () => {
        navigate("/communities");
    };

    const [createRole, setcreateRole] = useState(false);

    function createRoleFunction() {
        setcreateRole(!createRole);
    }

    const [toggleOverview, settoggleOverview] = useState(true);
    const [toggleRole, settoggleRole] = useState(false);
    const [toggleBan, settoggleBan] = useState(false);

    function Overview() {
        settoggleOverview(true);
        settoggleBan(false);
        settoggleRole(false);
    }
    function Role() {
        settoggleOverview(false);
        settoggleBan(false);
        settoggleRole(true);
    }
    function Ban() {
        settoggleOverview(false);
        settoggleBan(true);
        settoggleRole(false);
    }
    const Permissions = [
        { Name: "Create Channels", code: "channel:create" },
        { Name: "Create Posts", code: "post:create" },
        { Name: "Ban Members", code: "ban:users" },
        { Name: "Edit Community", code: "community:edit" },
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

    const createRoleSubmit = async () => {
        const handle = "ricki";
        const selectedPermissions = Array.from(
            document.querySelectorAll(".permission-checkbox:checked"),
        ).map((checkbox, index) => Permissions[index].code);

        const roleName = document.getElementById("role_name").value;
        try {
            await apiCall(
                `/v1/community/${handle}/roles`,
                "POST",
                { name: roleName, permissions: selectedPermissions },
                {},
                "include",
                false,
                () => {
                    createRoleFunction();
                    fetchRoles("ricki");
                },
            );
        } catch (err) {
            validationError(err.errors);
            return;
        }
    };

    const fetchMembers = async (handle) => {
        try {
            await apiCall(
                `/v1/community/${handle}/users`,
                "GET",
                null,
                {},
                "include",
                false,
                (response) => {
                    const formattedMembers = response.users.map((user) => ({
                        username: user.username,
                        name: user.name,
                        profile_path: getMediaPath(user.profile_path),
                    }));
                    setMembers(formattedMembers);
                },
            );
        } catch (err) {
            validationError(err.errors);
            return;
        }
    };
    useEffect(() => {
        if (toggleRole) {
            fetchRoles("ricki");
            fetchMembers("ricki");
        }
    }, [toggleRole]);

    const addRoleToUserApi = (e, roleId, username) => {
        const isChecked = e.target.checked;
        const handle = "ricki";
        if (isChecked) {
            const data = {
                role_id: roleId,
                username: username,
            };
            try {
                apiCall(
                    `/v1/community/${handle}/roles/user`,
                    "POST",
                    data,
                    {},
                    "include",
                    false,
                    () => {},
                );
            } catch (err) {
                validationError(err.errors);
                return;
            }
        } else {
            // API call when checkbox is unchecked (false)
        }
    };

    return (
        <div className="bg-gradient-to-br from-[#2c2abf] via-purple-800 to-pink-800 w-full h-screen flex items-center justify-center">
            <div className="w-full h-full bg-[#00000096] flex">
                <div className="w-1/5 h-screen"></div>
                <div className="w-3/5 h-screen flex flex-col">
                    <div className="w-full h-20 flex">
                        <button
                            onClick={goToCommunities}
                            className="w-1/5 h-full rounded-l-xl bg-[#ffffff6b] flex flex-col items-center justify-center text-3xl font-semibold text-blue-900 hover:bg-[#9b9b9b6b] hover:text-blue-950 duration-1000"
                        >
                            Home
                        </button>
                        <button
                            onClick={Overview}
                            className="w-1/5 h-full bg-[#9b9b9b6b] flex flex-col items-center justify-center text-3xl font-semibold text-blue-950 hover:bg-[#ffffff6b] hover:text-blue-900 duration-1000"
                        >
                            Overview
                        </button>
                        <button
                            onClick={Role}
                            className="w-1/5 h-full bg-[#ffffff6b] flex flex-col items-center justify-center text-3xl font-semibold text-blue-900 hover:bg-[#9b9b9b6b] hover:text-blue-950 duration-1000"
                        >
                            Roles
                        </button>
                        <button
                            onClick={Ban}
                            className="w-1/5 h-full bg-[#9b9b9b6b] flex flex-col items-center justify-center text-3xl font-semibold text-blue-950 hover:bg-[#ffffff6b] hover:text-blue-900 duration-1000"
                        >
                            Bans
                        </button>
                        <button className="w-1/5 h-full rounded-r-xl bg-[#ffffff6b] flex flex-col items-center justify-center text-3xl font-semibold text-blue-900 hover:bg-[#9b9b9b6b] hover:text-blue-950 duration-1000">
                            Coming soon
                        </button>
                    </div>
                    <div className="w-full h-full">
                        {toggleOverview && (
                            <div className="w-full h-full flex flex-col">
                                <div className="w-full h-1/3 flex border-y-2 p-2">
                                    <div className="w-full h-full  flex flex-col justify-center items-center">
                                        <p className="text-4xl text-white font-bold p-4">
                                            Bhai aahia image selection nakhi
                                            deje
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full h-2/3 flex flex-col p-10 text-xl font-semibold items-start">
                                    <div className="w-1/2 h-1/2 flex flex-col justify-between">
                                        <div className="">
                                            <p className="text-white text-lg font-medium m-2">
                                                Community Name
                                            </p>
                                            <input
                                                type="text"
                                                placeholder="Name"
                                                className="m-2 w-full h-10 bg-blue-950 text-center placeholder-white text-white text-xl"
                                            />
                                        </div>
                                        <div className="">
                                            <p className="text-white text-lg font-medium m-2">
                                                Community UserID
                                            </p>
                                            <input
                                                type="text"
                                                placeholder="UserID"
                                                className="m-2 w-full h-10 bg-blue-950 text-center placeholder-white text-white text-xl"
                                            />
                                        </div>
                                    </div>

                                    <button className="m-2 my-7 w-1/2 h-16 bg-blue-950 text-white font-semibold rounded-lg p-1 hover:bg-blue-900 duration-1000 ">
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}

                        {toggleRole && (
                            <div className="w-full h-full flex flex-col p-2">
                                <div className="w-full h-24"></div>
                                <div className="w-full h-full flex ">
                                    <div className="w-1/2 h-full  flex flex-col px-5">
                                        <p className="text-2xl text-white font-semibold">
                                            Roles
                                        </p>
                                        <div className="w-full h-full  p-3 bg-[#0000005f] grid-flow-col my-5">
                                            {roles.map((role, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() =>
                                                        setCurrentRole(role.ID)
                                                    }
                                                    className="w-full h-16 p-5 hover:h-14 duration-1000 text-xl text-white font-semibold flex justify-start hover:text-pink-700"
                                                >
                                                    <li>{role.Name}</li>
                                                </button>
                                            ))}
                                        </div>
                                        <button className="w-full h-16 bg-purple-950 text-white font-semibold rounded-lg p-1 hover:bg-pink-900 duration-1000 ">
                                            {" "}
                                            Apply{" "}
                                        </button>
                                        <button
                                            onClick={createRoleFunction}
                                            className="w-full my-2 h-16 bg-purple-950 text-white font-semibold rounded-lg p-1 hover:bg-pink-900 duration-1000 "
                                        >
                                            {" "}
                                            Create Role{" "}
                                        </button>
                                    </div>
                                    <div className="w-1/2 h-full p-10 grid-flow-col bg-[#0000005f]">
                                        {members.map((member, index) => (
                                            <div
                                                className="w-full h-fit flex justify-between"
                                                key={index}
                                            >
                                                <div className="w-10 h-10 my-2 mx-3 rounded-full hover:w-16 hover:h-16 duration-500">
                                                    <div className="w-full h-full flex">
                                                        <div className="flex w-full h-full">
                                                            <img
                                                                src={
                                                                    member.profile_path
                                                                }
                                                                alt="profile"
                                                                className="h-full w-fit rounded-full object-cover"
                                                            />
                                                            <p className="font-semibold text-lg mx-3 text-white">
                                                                {
                                                                    member.username
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <input
                                                        type="checkbox"
                                                        className="w-full h-full accent-pink-600"
                                                        onClick={(e) =>
                                                            addRoleToUserApi(
                                                                e,
                                                                currentRole,
                                                                member.username,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {createRole && (
                                    <div className="fixed left-0 top-0 w-full h-full bg-[#0000005f] ">
                                        <div className="flex w-full h-full">
                                            <div className="w-1/5 h-full"></div>
                                            <div className="w-3/5 h-full bg-[#000000ad] flex flex-col p-5">
                                                <div className="w-full h-10">
                                                    <button
                                                        onClick={
                                                            createRoleFunction
                                                        }
                                                        className="w-20 h-10 bg-pink-800 rounded-md text-white font-medium"
                                                    >
                                                        Back
                                                    </button>
                                                </div>
                                                <div className="w-full h-full my-10">
                                                    <p className="text-2xl text-white font-semibold">
                                                        Create Role
                                                    </p>
                                                    <div className="flex my-5">
                                                        <p className="text-2xl text-white font-semibold">
                                                            Role Name
                                                        </p>
                                                        <input
                                                            type="text"
                                                            id="role_name"
                                                            className="mx-5 bg-pink-950 rounded-lg text-center placeholder-white text-white text-xl"
                                                        />
                                                    </div>
                                                    <div className="w-full h-full my-10">
                                                        <p className="text-2xl text-white font-semibold">
                                                            {" "}
                                                            Select Permissions
                                                        </p>
                                                        <div className="w-full h-96 overflow-y-auto border border-gray-700 rounded-lg bg-[#0000001a]">
                                                            <div className="grid grid-cols-1 gap-2 p-4">
                                                                {Permissions.map(
                                                                    (
                                                                        permission,
                                                                        index,
                                                                    ) => (
                                                                        <label
                                                                            key={
                                                                                index
                                                                            }
                                                                            className="flex items-center justify-between p-3 rounded-md hover:bg-[#ffffff1a] transition-all duration-300 cursor-pointer group"
                                                                        >
                                                                            <span className="text-xl text-white font-semibold group-hover:text-pink-700 transition-colors duration-300">
                                                                                {
                                                                                    permission.Name
                                                                                }
                                                                            </span>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="permission-checkbox w-5 h-5 accent-pink-600 rounded focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                                                            />
                                                                        </label>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                createRoleSubmit()
                                                            }
                                                            className="w-1/2 h-14 my-10 bg-pink-800 rounded-md text-white font-medium"
                                                        >
                                                            Create
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-1/5 h-full"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {toggleBan && <div className="w-full h-full"></div>}
                    </div>
                </div>
                <div className="w-1/5 h-screen"></div>
            </div>
        </div>
    );
};
export default CommunitySetting;
