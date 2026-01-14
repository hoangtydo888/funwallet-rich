import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Share, 
  Plus, 
  MoreVertical, 
  Smartphone, 
  CheckCircle2,
  ArrowLeft,
  Apple,
  Chrome
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl rainbow-text">Đã cài đặt!</CardTitle>
            <CardDescription>
              FUN Wallet đã được cài đặt trên thiết bị của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Mở FUN Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container flex items-center h-16 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-xl font-bold ml-2">Cài đặt ứng dụng</h1>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-lg mx-auto space-y-6">
        {/* App Info */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 flex items-center justify-center">
            <img src="/logo.gif?v=1" alt="FUN Wallet" className="w-full h-full logo-pulse" />
          </div>
          <div>
            <p className="text-muted-foreground">Ví tiền điện tử Web3</p>
          </div>
        </div>

        {/* Install Button for Android/Desktop */}
        {deferredPrompt && (
          <Button 
            onClick={handleInstallClick} 
            size="lg" 
            className="w-full h-14 text-lg gap-3"
          >
            <Download className="h-6 w-6" />
            Cài đặt ngay
          </Button>
        )}

        {/* iOS Instructions */}
        {platform === "ios" && (
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <Apple className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Cài đặt trên iPhone/iPad</CardTitle>
                  <CardDescription>Sử dụng Safari</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Nhấn nút Chia sẻ</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Share className="h-4 w-4" /> Biểu tượng vuông có mũi tên lên
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Cuộn xuống và chọn</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Plus className="h-4 w-4" /> "Thêm vào Màn hình chính"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Nhấn "Thêm"</p>
                  <p className="text-sm text-muted-foreground">Ở góc trên bên phải</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions */}
        {platform === "android" && !deferredPrompt && (
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Chrome className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Cài đặt trên Android</CardTitle>
                  <CardDescription>Sử dụng Chrome</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Nhấn menu</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <MoreVertical className="h-4 w-4" /> Biểu tượng 3 chấm dọc
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Chọn "Cài đặt ứng dụng"</p>
                  <p className="text-sm text-muted-foreground">hoặc "Thêm vào màn hình chính"</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Nhấn "Cài đặt"</p>
                  <p className="text-sm text-muted-foreground">Xác nhận cài đặt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {platform === "desktop" && !deferredPrompt && (
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Mở trên điện thoại</CardTitle>
                  <CardDescription>Để cài đặt ứng dụng</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Để cài đặt FUN Wallet, hãy mở trang web này trên điện thoại của bạn bằng Safari (iOS) hoặc Chrome (Android).
              </p>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Lợi ích khi cài đặt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Truy cập nhanh từ màn hình chính</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Hoạt động offline</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Giao diện toàn màn hình</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Không cần App Store</span>
            </div>
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <Button 
          variant="outline" 
          onClick={() => navigate("/dashboard")} 
          className="w-full"
        >
          Tiếp tục sử dụng trên trình duyệt
        </Button>
      </main>
    </div>
  );
};

export default Install;
