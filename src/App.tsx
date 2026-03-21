import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import Index from "./pages/Index";
import MyBatches from "./pages/MyBatches";
import NewBatch from "./pages/NewBatch";
import BatchDetail from "./pages/BatchDetail";
import Guides from "./pages/Guides";
import GuideDetail from "./pages/GuideDetail";
import Assistant from "./pages/Assistant";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route path="/batches" element={<MyBatches />} />
            <Route path="/new-batch" element={<NewBatch />} />
            <Route path="/batch/:id" element={<BatchDetail />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/guides/:slug" element={<GuideDetail />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
