import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
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
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
