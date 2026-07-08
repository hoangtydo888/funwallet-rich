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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] border-t border-border/40 backdrop-blur-2xl"
      style={{ background: "hsl(var(--background) / 0.75)" }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-300 ease-out-quart ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-gradient-to-r from-primary to-secondary shadow-glow" />
              )}
              <div
                className={`relative flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-primary/15 to-secondary/15 scale-110"
                    : "hover:bg-muted/60"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight transition-all ${
                  isActive ? "opacity-100" : "opacity-70"
                }`}
              >
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
