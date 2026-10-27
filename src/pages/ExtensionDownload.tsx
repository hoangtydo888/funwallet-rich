import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const download = () => {
  fetch("/fun-wallet-extension.zip")
    .then((res) => {
      if (!res.ok) throw new Error(`Tải thất bại: ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "fun-wallet-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => alert(err.message));
};

const ExtensionDownload = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background p-4 max-w-xl mx-auto">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Quay lại">
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div className="text-center my-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
          <Puzzle className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-heading font-bold">FUN Wallet cho Chrome</h1>
        <p className="text-muted-foreground text-sm mt-1">Bấm biểu tượng tiện ích để mở ví ngay trên trình duyệt.</p>
      </div>
      <Button className="w-full mb-6" size="lg" onClick={download}>
        <Download className="w-5 h-5 mr-2" /> Tải tiện ích (.zip)
      </Button>
      <Card>
        <CardContent className="p-5 space-y-2 text-sm">
          <p className="font-semibold">Cách cài đặt</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Giải nén file vừa tải.</li>
            <li>Mở <b>chrome://extensions</b> trong Chrome (hoặc Edge, Brave, Opera).</li>
            <li>Bật <b>Developer mode</b> ở góc phải trên.</li>
            <li>Bấm <b>Load unpacked</b> và chọn thư mục đã giải nén.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExtensionDownload;
