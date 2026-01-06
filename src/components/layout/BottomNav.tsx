import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wallet, ArrowLeftRight, CreditCard, BookOpen } from "lucide-react";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Trang chủ" },
  { path: "/wallet", icon: Wallet, label: "Ví" },
  { path: "/trading", icon: ArrowLeftRight, label: "Giao dịch" },
  { path: "/card", icon: CreditCard, label: "Thẻ" },
  { path: "/learn", icon: BookOpen, label: "Học tập" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative ${isActive ? "animate-pulse-glow rounded-lg p-1.5" : "p-1.5"}`}>
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {isActive && (
                  <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md -z-10" />
                )}
              </div>
              <span className={`text-xs font-medium ${isActive ? "text-primary" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
