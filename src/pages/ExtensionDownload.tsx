import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// FUN Wallet listing on the Chrome Web Store; the button opens this page.
const CHROME_WEB_STORE_URL = "https://chromewebstore.google.com/detail/nnonifhnfpaopgjamekobkigbenepnnp";

// The extension announces itself through EIP-6963, so the page knows it is installed.
const useExtensionInstalled = () => {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const onAnnounce = (event: Event) => {
      if ((event as CustomEvent).detail?.info?.rdns === "io.funwallet.wallet") setInstalled(true);
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);
  return installed;
};

const ExtensionDownload = () => {
  const navigate = useNavigate();
  const installed = useExtensionInstalled();

  const addToChrome = () => {
    window.open(CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Quay lại">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6 py-8 border-b border-border">
          <img src="/fun-wallet-icon-128.png" alt="FUN Wallet" className="w-20 h-20 rounded-2xl shadow-lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-heading font-bold">FUN Wallet</h1>
            <p className="mt-1 flex items-center gap-1.5 text-primary text-sm">
              <ShieldCheck className="w-4 h-4" /> wallet.fun.rich
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-muted">Tiện ích</span>
              <span className="px-3 py-1 rounded-full bg-muted">Ví Web3</span>
              <span className="px-3 py-1 rounded-full bg-muted">BNB Smart Chain</span>
            </div>
          </div>
          {installed ? (
            <Button size="lg" variant="outline" className="rounded-full px-8 h-12" disabled>
              <CheckCircle2 className="w-5 h-5 mr-2 text-primary" /> Đã thêm vào Chrome
            </Button>
          ) : (
            <Button size="lg" className="rounded-full px-8 h-12 text-base" onClick={addToChrome}>
              Thêm vào Chrome
            </Button>
          )}
        </div>

        {installed && (
          <Card className="mt-6">
            <CardContent className="p-5 text-sm space-y-1">
              <p className="font-semibold">FUN Wallet đã có trên Chrome này.</p>
              <p className="text-muted-foreground">Bấm biểu tượng mảnh ghép 🧩 trên thanh công cụ → ghim FUN Wallet → bấm vào logo để mở ví.</p>
            </CardContent>
          </Card>
        )}

        {!installed && (
          <section className="mt-8">
            <p className="text-sm text-muted-foreground">
              Bấm <b>Thêm vào Chrome</b> để mở trang FUN Wallet trên Chrome Web Store, rồi bấm <b>Thêm vào Chrome</b> trên cửa hàng để cài. Sau khi cài, FUN Wallet mở trang chào: chọn <b>Tạo ví mới</b> hoặc <b>Tôi đã có ví</b> để nhập cụm từ khôi phục. Tải lại trang này để thấy trạng thái "Đã thêm vào Chrome".
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-3 text-sm">
          <Card><CardContent className="p-5"><p className="font-semibold">Kết nối như MetaMask</p><p className="text-muted-foreground mt-1">Bấm FUN Wallet trên fun.rich, ví mở ngay ở bảng bên phải để bạn duyệt.</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="font-semibold">Khóa nằm trên máy bạn</p><p className="text-muted-foreground mt-1">Cụm từ khôi phục được mã hóa bằng mật khẩu, không gửi lên máy chủ.</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="font-semibold">Mọi giao dịch đều cần bạn duyệt</p><p className="text-muted-foreground mt-1">Trang web chỉ gửi yêu cầu; ví hiện người nhận, số tiền và phí trước khi ký.</p></CardContent></Card>
        </section>
        <p className="mt-6 text-xs text-muted-foreground">Dùng Chrome, Edge, Brave hoặc Opera trên máy tính. Trên điện thoại, mở wallet.fun.rich để dùng ví web.</p>
      </div>
    </div>
  );
};

export default ExtensionDownload;
