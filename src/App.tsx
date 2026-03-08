import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Home from "./pages/Home";
import CreateChallenge from "./pages/CreateChallenge";
import ChallengeDetail from "./pages/ChallengeDetail";
import ProofDetail from "./pages/ProofDetail";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import MyProfile from "./pages/MyProfile";
import MyChallenges from "./pages/MyChallenges";
import CreatedChallenges from "./pages/CreatedChallenges";
import DeletedChallenges from "./pages/DeletedChallenges";
import ChallengeHistory from "./pages/ChallengeHistory";
import JoinChallenge from "./pages/JoinChallenge";
import Admin from "./pages/Admin";
import Badges from "./pages/Badges";
import Notifications from "./pages/Notifications";
import Store from "./pages/Store";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import CreateCommunity from "./pages/CreateCommunity";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/create-challenge" element={<CreateChallenge />} />
            <Route path="/challenge/:id" element={<ChallengeDetail />} />
            <Route path="/proof/:id" element={<ProofDetail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/settings" element={<Profile />} />
            <Route path="/my-challenges" element={<MyChallenges />} />
            <Route path="/created-challenges" element={<CreatedChallenges />} />
            <Route path="/deleted-challenges" element={<DeletedChallenges />} />
            <Route path="/challenge-history" element={<ChallengeHistory />} />
            <Route path="/join/:challengeId" element={<JoinChallenge />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/store" element={<Store />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
