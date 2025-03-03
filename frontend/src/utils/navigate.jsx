import { useNavigate } from "react-router-dom";

const useNavigation = () => {
    const navigate = useNavigate();
    const routes = {
        login: "/",
        register: "/register",
        forgotPassword: "/forgot-password",
        registerUsername: "/register/username",
        registerPassword: "/register/password",
        accountActivation: "/account/activate",
        userPage: "/userpage",
        otp: "/otp",
        resetPassword: "/otp/reset-password",
        completeProfile: "/users/profile",
    };

    const goTo = (path, params = {}) => {
        const url = routes[path];
        const searchParams = new URLSearchParams(params).toString();
        const fullUrl = searchParams ? `${url}?${searchParams}` : url;
        navigate(fullUrl);
    };

    // const navigateTo = (path, params = {}) => {
    //     const url = routes[path];
    //     const searchParams = new URLSearchParams(params).toString();
    //     const fullUrl = searchParams ? `${url}?${searchParams}` : url;

    //     useEffect(() => {
    //         navigate(fullUrl);
    //     }, []);
    // };

    return { goTo, routes };
};

export default useNavigation;
