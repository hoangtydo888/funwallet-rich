import { WalletSecurityPanel } from "@/components/wallet/WalletSecurityPanel";
import { useWalletSecurity } from "@/contexts/WalletSecurityContext";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useChain } from "@/contexts/ChainContext";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Wallet,
  Globe,
  Shield,
  Bell,
  Palette,
  Smartphone,
  Key,
  Trash2,
  Download,
  Upload,
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import { ThemeCard } from "@/components/settings/ThemeCard";

interface Settings {
  language: string;
  currency: string;
  theme: "light" | "dark" | "system";
  notifications: boolean;
  biometricAuth: boolean;
  autoLock: number;
  hideBalance: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  language: "vi",
  currency: "USD",
  theme: "system",
  notifications: true,
  biometricAuth: false,
  autoLock: 5,
  hideBalance: false,
};

const LANGUAGES = [
  { code: "vi", name: "Tiếng Việt" },
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: "1 phút" },
  { value: 5, label: "5 phút" },
  { value: 15, label: "15 phút" },
  { value: 30, label: "30 phút" },
  { value: 60, label: "1 giờ" },
  { value: 0, label: "Không bao giờ" },
];

const Settings = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentChain, setCurrentChain, availableChains } = useChain();
  const { currentTheme, setTheme, themes } = useTheme();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem("fun_wallet_settings");
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  });

  const is2FAEnabled = false; // No simulated account-MFA state.

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    localStorage.setItem("fun_wallet_settings", JSON.stringify(settings));
  }, [settings]);

  const walletSecurity = useWalletSecurity();
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (key === "autoLock" && typeof value === "number") walletSecurity.setSessionTimeout(value);
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast({
      title: "Đã lưu",
      description: "Cài đặt đã được cập nhật",
    });
  };





  const handleExportData = () => {
    const data = {
      settings,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `funwallet-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Đã xuất dữ liệu",
      description: "File cài đặt đã được tải xuống",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold">Cài đặt</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4 hidden sm:block" />
              Giao diện
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-2">
              <Wallet className="h-4 w-4 hidden sm:block" />
              Ví
            </TabsTrigger>
            <TabsTrigger value="language" className="gap-2">
              <Globe className="h-4 w-4 hidden sm:block" />
              Ngôn ngữ
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4 hidden sm:block" />
              Bảo mật
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4 hidden sm:block" />
              Thông báo
            </TabsTrigger>
          </TabsList>

          {/* Appearance / Theme Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-lg">Màu chủ đạo</h2>
                  <p className="text-sm text-muted-foreground">
                    Chọn theme phù hợp với phong cách của bạn
                  </p>
                </div>
              </div>

              {/* Current theme indicator */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl animate-pulse-glow"
                    style={{ background: currentTheme.preview }}
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">Theme hiện tại</p>
                    <p className="font-heading font-semibold">{currentTheme.name}</p>
                  </div>
                </div>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(themes).map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isActive={currentTheme.id === theme.id}
                    onSelect={() => {
                      setTheme(theme.id);
                      toast({
                        title: "Đã đổi theme",
                        description: `Theme "${theme.name}" đã được áp dụng`,
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Wallet Settings */}
          <TabsContent value="wallet" className="space-y-6">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <h2 className="font-heading font-semibold text-lg">Cài đặt ví</h2>

              {/* Default Chain */}
              <div className="space-y-2">
                <Label>Mạng mặc định</Label>
                <Select
                  value={currentChain.chainId.toString()}
                  onValueChange={(v) => {
                    const chain = availableChains.find((c) => c.chainId === parseInt(v));
                    if (chain) setCurrentChain(chain);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChains.map((chain) => (
                      <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                        <span className="flex items-center gap-2">
                          <span>{chain.logo}</span>
                          <span>{chain.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label>Tiền tệ hiển thị</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(v) => updateSetting("currency", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hide Balance */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ẩn số dư</Label>
                  <p className="text-sm text-muted-foreground">
                    Ẩn số dư trên màn hình chính
                  </p>
                </div>
                <Switch
                  checked={settings.hideBalance}
                  onCheckedChange={(v) => updateSetting("hideBalance", v)}
                />
              </div>
            </div>

            {/* Data Management */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="font-heading font-semibold text-lg">Quản lý dữ liệu</h2>

              <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Xuất cài đặt
              </Button>

              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa tất cả dữ liệu cục bộ
              </Button>
            </div>
          </TabsContent>

          {/* Language Settings */}
          <TabsContent value="language" className="space-y-6">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <h2 className="font-heading font-semibold text-lg">Ngôn ngữ và vùng</h2>

              <div className="space-y-2">
                <Label>Ngôn ngữ ứng dụng</Label>
                <Select
                  value={settings.language}
                  onValueChange={(v) => updateSetting("language", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                💡 Một số nội dung có thể vẫn hiển thị bằng tiếng Anh
              </div>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <h2 className="font-heading font-semibold text-lg">Bảo mật</h2>

              {/* 2FA */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Xác thực 2 bước (2FA)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Chưa có dịch vụ 2FA thực; không dùng mã mô phỏng
                  </p>
                </div>
                {is2FAEnabled ? (
                  <Button variant="destructive" size="sm" disabled>
                    Tắt
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Chưa cấu hình
                  </Button>
                )}
              </div>

              <WalletSecurityPanel />

              {/* Biometric Auth */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Xác thực sinh trắc học</Label>
                  <p className="text-sm text-muted-foreground">
                    Chưa có tích hợp WebAuthn; hiện dùng mật khẩu kho khóa
                  </p>
                </div>
                <Switch
                  checked={false}
                  disabled
                />
              </div>

              {/* Auto Lock */}
              <div className="space-y-2">
                <Label>Tự động khóa sau</Label>
                <Select
                  value={settings.autoLock.toString()}
                  onValueChange={(v) => updateSetting("autoLock", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTO_LOCK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Security Tips */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Lưu ý bảo mật
              </h2>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5" />
                  Không bao giờ chia sẻ seed phrase với ai
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5" />
                  Luôn kiểm tra địa chỉ trước khi gửi crypto
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5" />
                  Ưu tiên mật khẩu kho khóa mạnh và sao lưu ngoại tuyến
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5" />
                  Backup ví thường xuyên
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <h2 className="font-heading font-semibold text-lg">Thông báo</h2>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Thông báo push</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo về giao dịch
                  </p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(v) => updateSetting("notifications", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Cảnh báo giá</Label>
                  <p className="text-sm text-muted-foreground">
                    Thông báo khi giá đạt mục tiêu
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Giao dịch đến</Label>
                  <p className="text-sm text-muted-foreground">
                    Thông báo khi nhận crypto
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Tin tức thị trường</Label>
                  <p className="text-sm text-muted-foreground">
                    Cập nhật tin tức crypto
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>


    </div>
  );
};

export default Settings;
