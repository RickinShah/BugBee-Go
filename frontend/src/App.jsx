import Feed from "./components/Feed";
import PostUpload from "./components/PostUpload";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CompleteProfile from "./components/CompleteProfile";
import LoginPage from "./components/LoginPage";
import RegisterUsername from "./components/RegisterUsername";
import RegisterPassword from "./components/RegisterPassword";
import Register from "./components/Register";
import AccountActivation from "./components/AccountActivation";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import SubmitOtp from "./components/SubmitOtp";
import CreateCommunity from "./components/Communities/CreateCommunity";
import Communities from "./components/Communities/Communities";
import CommunitySetting from "./components/Communities/CommunitySetting";

const App = () => {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/register/username"
                        element={<RegisterUsername />}
                    />
                    <Route
                        path="/register/password"
                        element={<RegisterPassword />}
                    />
                    <Route path="/feed" element={<Feed />} />
                    <Route
                        path="/users/profile"
                        element={<CompleteProfile />}
                    />
                    <Route
                        path="/users/activate"
                        element={<AccountActivation />}
                    />
                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                    />
                    <Route path="/otp" element={<SubmitOtp />} />
                    <Route
                        path="/otp/reset-password"
                        element={<ResetPassword />}
                    />

                    <Route path="/post/upload" element={<PostUpload />} />
                    <Route
                        path="/profile/update"
                        element={<CompleteProfile />}
                    />
                    <Route
                        path="/community/create"
                        element={<CreateCommunity />}
                    />
                    <Route path="/communities" element={<Communities />} />

                    <Route path="/cs" element={<CommunitySetting />} />
                </Routes>
            </Router>
        </>
    );
};

export default App;
