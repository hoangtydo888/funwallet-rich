import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  CreditCard,
  Image,
  TrendingUp,
  LogOut,
  Plus,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Đã đăng xuất",
      description: "Hẹn gặp lại bạn!",
    });
    navigate("/");
  };

  const copyAddress = () => {
    navigator.clipboard.writeText("0x1234...abcd");
    toast({
      title: "Đã sao chép",
      description: "Địa chỉ ví đã được sao chép vào clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-heading text-xl font-bold gradient-text">
            FUN Wallet
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold mb-2">
            Xin chào, {user.user_metadata?.display_name || user.email?.split("@")[0]} 👋
          </h1>
          <p className="text-muted-foreground">Quản lý tài sản Web3 của bạn</p>
        </div>

        {/* Wallet Card */}
        <div className="glass-card rounded-3xl p-6 mb-8 gradient-border">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tổng tài sản</p>
              <h2 className="font-heading text-4xl font-bold">$0.00</h2>
              <p className="text-sm text-success mt-1">+0.00% (24h)</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>

          {/* Wallet address */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 mb-6">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Địa chỉ ví BNB Chain</p>
              <p className="text-sm font-mono">Chưa có ví - Tạo ví để bắt đầu</p>
            </div>
            <Button variant="ghost" size="icon" onClick={copyAddress} disabled>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-3">
            <QuickAction icon={<ArrowUpRight />} label="Gửi" />
            <QuickAction icon={<ArrowDownLeft />} label="Nhận" />
            <QuickAction icon={<RefreshCw />} label="Swap" />
            <QuickAction icon={<Plus />} label="Mua" />
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <FeatureCard
            icon={<Wallet />}
            title="Tạo Ví Mới"
            description="Tạo ví Web3 mới trên BNB Chain"
            action="Tạo ví"
            gradient="from-primary to-secondary"
          />
          <FeatureCard
            icon={<CreditCard />}
            title="FUN Card"
            description="Kích hoạt thẻ đa năng của bạn"
            action="Sắp ra mắt"
            gradient="from-secondary to-primary"
            disabled
          />
          <FeatureCard
            icon={<Image />}
            title="NFT Gallery"
            description="Xem và quản lý NFT của bạn"
            action="Xem NFT"
            gradient="from-accent to-warning"
          />
        </div>

        {/* Recent transactions */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-lg">Giao dịch gần đây</h3>
            <Button variant="ghost" size="sm">
              Xem tất cả
            </Button>
          </div>
          
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có giao dịch nào</p>
            <p className="text-sm">Giao dịch của bạn sẽ hiển thị ở đây</p>
          </div>
        </div>
      </main>
    </div>
  );
};

const QuickAction = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
      {icon}
    </div>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  action, 
  gradient,
  disabled 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  action: string;
  gradient: string;
  disabled?: boolean;
}) => (
  <div className="glass-card rounded-2xl p-6 flex flex-col">
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-primary-foreground mb-4`}>
      {icon}
    </div>
    <h3 className="font-heading font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground mb-4 flex-1">{description}</p>
    <Button 
      variant={disabled ? "secondary" : "default"} 
      className={disabled ? "" : `bg-gradient-to-r ${gradient} hover:opacity-90`}
      disabled={disabled}
    >
      {action}
    </Button>
  </div>
);

export default Dashboard;
