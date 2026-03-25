import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const MyBatches = lazy(() => import("./pages/MyBatches"));
const NewBatch = lazy(() => import("./pages/NewBatch"));
const F1Recipes = lazy(() => import("./pages/F1Recipes"));
const F1Vessels = lazy(() => import("./pages/F1Vessels"));
const BatchDetail = lazy(() => import("./pages/BatchDetail"));
const BatchLineage = lazy(() => import("./pages/BatchLineage"));
const F2Setup = lazy(() => import("./pages/F2Setup"));
const Guides = lazy(() => import("./pages/Guides"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Settings = lazy(() => import("./pages/Settings"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/guides" element={<Guides />} />
                <Route path="/guides/:slug" element={<GuideDetail />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/batches" element={<ProtectedRoute><MyBatches /></ProtectedRoute>} />
                <Route path="/new-batch" element={<ProtectedRoute><NewBatch /></ProtectedRoute>} />
                <Route path="/f1-recipes" element={<ProtectedRoute><F1Recipes /></ProtectedRoute>} />
                <Route path="/f1-vessels" element={<ProtectedRoute><F1Vessels /></ProtectedRoute>} />
                <Route path="/batch/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
                <Route path="/batch/:id/f2/setup" element={<ProtectedRoute><F2Setup /></ProtectedRoute>} />
                <Route path="/batch/:id/lineage" element={<ProtectedRoute><BatchLineage /></ProtectedRoute>} />
                <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
