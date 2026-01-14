import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, QrCode, Camera, Flashlight, Image, Copy, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import BottomNav from "@/components/layout/BottomNav";

const tokens = [
  { symbol: "BNB", name: "BNB", icon: "/tokens/bnb.png" },
  { symbol: "USDT", name: "Tether", icon: "/tokens/usdt.svg" },
  { symbol: "ETH", name: "Ethereum", icon: "/tokens/eth.svg" },
  { symbol: "CAMLY", name: "CAMLY", icon: "/tokens/camly.png" },
];

const QRPayment = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("receive");
  const [selectedToken, setSelectedToken] = useState("BNB");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [manualAddress, setManualAddress] = useState("");

  // Mock wallet address
  const walletAddress = "0xec39f28907bB1C42Ca9dEf97B7E5CfE0A8AeB999";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const qrData = JSON.stringify({
    address: walletAddress,
    token: selectedToken,
    amount: amount || undefined,
    note: note || undefined,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Đã copy địa chỉ ví" });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "FUN Wallet Address",
          text: `Gửi ${selectedToken} đến: ${walletAddress}${amount ? ` - Số tiền: ${amount} ${selectedToken}` : ""}`,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Thanh toán QR</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="receive" className="font-semibold">
            <QrCode className="w-4 h-4 mr-2" />
            Tạo mã QR
          </TabsTrigger>
          <TabsTrigger value="scan" className="font-semibold">
            <Camera className="w-4 h-4 mr-2" />
            Quét mã QR
          </TabsTrigger>
        </TabsList>

        {/* Receive - Generate QR */}
        <TabsContent value="receive" className="px-4 mt-4 space-y-4 animate-fade-in">
          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Chọn token nhận</label>
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map(token => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        <div className="flex items-center gap-2">
                          <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
                          {token.symbol} - {token.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Số tiền (tùy chọn)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Ghi chú (tùy chọn)</label>
                <Textarea
                  placeholder="Thanh toán đơn hàng #123..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          <div className="flex flex-col items-center py-6">
            <div className="p-4 bg-white rounded-2xl gradient-border glow-rainbow">
              <QRCodeSVG
                value={qrData}
                size={200}
                level="H"
                includeMargin
                imageSettings={{
                  src: "/logo.gif?v=1",
                  height: 80,
                  width: 80,
                  excavate: true,
                }}
              />
            </div>
            
            {amount && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">Yêu cầu nhận</p>
                <p className="text-xl font-bold rainbow-text">{amount} {selectedToken}</p>
              </div>
            )}
          </div>

          {/* Address Display */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Địa chỉ ví của bạn</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-lg overflow-hidden text-ellipsis">
                  {walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Chia sẻ QR
          </Button>
        </TabsContent>

        {/* Scan QR */}
        <TabsContent value="scan" className="px-4 mt-4 space-y-4 animate-fade-in">
          {/* Camera View Placeholder */}
          <Card className="overflow-hidden">
            <CardContent className="p-0 relative" style={{ aspectRatio: "1/1" }}>
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/80 to-foreground flex items-center justify-center">
                {/* Scan Frame */}
                <div className="relative w-64 h-64">
                  {/* Corner decorations */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{ top: "50%" }} />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white/70 text-sm">Đưa mã QR vào khung</p>
                  </div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-white/20 backdrop-blur"
                  onClick={() => setFlashOn(!flashOn)}
                >
                  <Flashlight className={`w-5 h-5 ${flashOn ? "text-accent" : "text-white"}`} />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-white/20 backdrop-blur"
                >
                  <Image className="w-5 h-5 text-white" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual Entry */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Hoặc nhập địa chỉ thủ công</p>
              <div className="flex gap-2">
                <Input
                  placeholder="0x..."
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="default"
                  className="bg-primary"
                  disabled={!manualAddress}
                >
                  Tiếp tục
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Hướng dẫn</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Đưa camera vào mã QR của người nhận
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Xác nhận địa chỉ và token
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Nhập số tiền và gửi
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default QRPayment;
