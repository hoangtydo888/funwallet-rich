import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChainProvider } from "@/contexts/ChainContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WalletSecurityProvider } from "@/contexts/WalletSecurityContext";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import Admin from "./pages/Admin";
import AdminBulkTransfer from "./pages/AdminBulkTransfer";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Wallet from "./pages/Wallet";
import Trading from "./pages/Trading";
import Earn from "./pages/Earn";
import Transfer from "./pages/Transfer";
import FunCard from "./pages/Card";
import QRPayment from "./pages/QRPayment";
import History from "./pages/History";
import Learn from "./pages/Learn";
import KYC from "./pages/KYC";
import PlatformDocs from "./pages/PlatformDocs";

const queryClient = new QueryClient();

// Component to handle realtime notifications within auth context
function RealtimeNotificationsProvider({ children }: { children: React.ReactNode }) {
  useRealtimeNotifications();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <WalletSecurityProvider>
          <ChainProvider>
            <ThemeProvider>
              <RealtimeNotificationsProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/trading" element={<Trading />} />
                    <Route path="/earn" element={<Earn />} />
                    <Route path="/transfer" element={<Transfer />} />
                    <Route path="/card" element={<FunCard />} />
                    <Route path="/qr-payment" element={<QRPayment />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/learn" element={<Learn />} />
                    <Route path="/kyc" element={<KYC />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/bulk-transfer" element={<AdminBulkTransfer />} />
                    <Route path="/docs/platform" element={<PlatformDocs />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </RealtimeNotificationsProvider>
            </ThemeProvider>
          </ChainProvider>
        </WalletSecurityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
