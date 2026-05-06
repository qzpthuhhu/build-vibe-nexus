import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import AppDetail from "./pages/AppDetail";
import Submit from "./pages/Submit";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Ranking from "./pages/Ranking";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";
import Contact from "./pages/Contact";
import Unsubscribe from "./pages/Unsubscribe";
import TokenServiceHome from "./pages/token-service/TokenServiceHome";
import TokenServicePricing from "./pages/token-service/TokenServicePricing";
import TokenServiceDocs from "./pages/token-service/TokenServiceDocs";
import TokenServiceDashboard from "./pages/token-service/TokenServiceDashboard";
import TokenServiceApiKeys from "./pages/token-service/TokenServiceApiKeys";
import TokenServicePlayground from "./pages/token-service/TokenServicePlayground";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/app/:id" element={<AppDetail />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/submit/:id" element={<Submit />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/token-service" element={<TokenServiceHome />} />
            <Route path="/token-service/pricing" element={<TokenServicePricing />} />
            <Route path="/token-service/docs" element={<TokenServiceDocs />} />
            <Route path="/token-service/dashboard" element={<TokenServiceDashboard />} />
            <Route path="/token-service/api-keys" element={<TokenServiceApiKeys />} />
            <Route path="/token-service/playground" element={<TokenServicePlayground />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
