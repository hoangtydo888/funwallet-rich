import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  QrCode, 
  Link2, 
  X, 
  ExternalLink,
  Clock,
  Unlink,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  WalletConnectSession,
  getSessions,
  simulateConnect,
  disconnectSession,
  formatExpiry,
  parseWalletConnectUri,
} from "@/lib/walletconnect";
import { useChain } from "@/contexts/ChainContext";
import { useWalletConnect } from "@/hooks/useWalletConnect";

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
}

export const WalletConnectDialog = ({
  open,
  onOpenChange,
  walletAddress,
}: WalletConnectDialogProps) => {
  const { currentChain } = useChain();
  const walletConnect = useWalletConnect();
  const [tab, setTab] = useState<"connect" | "sessions">("connect");
  const [uri, setUri] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [sessions, setSessions] = useState<WalletConnectSession[]>([]);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSessions(getSessions());
    }
  }, [open]);

  const handleConnect = async () => {
    if (!uri.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập WalletConnect URI",
        variant: "destructive",
      });
      return;
    }

    const parsed = parseWalletConnectUri(uri);
    if (!parsed) {
      toast({
        title: "URI không hợp lệ",
        description: "Vui lòng kiểm tra lại WalletConnect URI",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    try {
      const session = await simulateConnect(uri, walletAddress, currentChain.chainId);
      if (session) {
        toast({
          title: "Kết nối thành công!",
          description: `Đã kết nối với ${session.peerName}`,
        });
        setSessions(getSessions());
        setUri("");
        setTab("sessions");
      } else {
        throw new Error("Connection failed");
      }
    } catch (error) {
      toast({
        title: "Kết nối thất bại",
        description: "Không thể kết nối với DApp",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleQuickConnect = async () => {
    const address = await walletConnect.connect();
    if (address) {
      // Connection successful
    }
  };

  const handleDisconnect = async (topic: string) => {
    setDisconnecting(topic);
    try {
      await disconnectSession(topic);
      setSessions(getSessions());
      toast({
        title: "Đã ngắt kết nối",
        description: "Session đã được đóng",
      });
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể ngắt kết nối",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith("wc:")) {
        setUri(text);
      }
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            WalletConnect
          </DialogTitle>
          <DialogDescription>
            Kết nối ví ngoài (MetaMask, Trust Wallet) hoặc DApp
          </DialogDescription>
        </DialogHeader>

        {/* Quick Connect Status */}
        {walletConnect.state.isConnected && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-success">Ví đã kết nối ❤️</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {walletConnect.state.address?.slice(0, 10)}...{walletConnect.state.address?.slice(-8)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => walletConnect.disconnect()}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Ngắt
              </Button>
            </div>
          </div>
        )}

        {/* Quick Connect Button - Big and Beautiful */}
        {!walletConnect.state.isConnected && (
          <div className="py-4">
            <Button
              onClick={handleQuickConnect}
              disabled={walletConnect.state.isConnecting}
              className="w-full h-16 text-lg font-bold bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-primary-foreground shadow-lg glow"
            >
              {walletConnect.state.isConnecting ? (
                <>
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  Đang kết nối...
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 mr-2" />
                  Kết Nối Ví Ánh Sáng ❤️
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Hỗ trợ MetaMask, Trust Wallet, và các ví phổ biến
            </p>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Hoặc kết nối DApp
            </span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "connect" | "sessions")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connect">Kết nối mới</TabsTrigger>
            <TabsTrigger value="sessions">
              Sessions ({sessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <QrCode className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Quét mã QR hoặc dán WalletConnect URI từ DApp
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">WalletConnect URI</label>
              <div className="flex gap-2">
                <Input
                  placeholder="wc:..."
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button variant="outline" onClick={handlePaste}>
                  Dán
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleConnect}
              disabled={connecting || !uri.trim()}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang kết nối...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Kết nối DApp
                </>
              )}
            </Button>

            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Hướng dẫn:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                <li>Mở DApp và chọn WalletConnect</li>
                <li>Sao chép URI hoặc quét mã QR</li>
                <li>Dán URI vào ô trên và kết nối</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-6">
                <Unlink className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  Chưa có session nào được kết nối
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.topic}
                    className="p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {session.peerIcon ? (
                          <img
                            src={session.peerIcon}
                            alt={session.peerName}
                            className="w-6 h-6 rounded"
                          />
                        ) : (
                          <Link2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{session.peerName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.peerUrl}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Còn {formatExpiry(session.expiry)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a
                            href={session.peerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDisconnect(session.topic)}
                          disabled={disconnecting === session.topic}
                        >
                          {disconnecting === session.topic ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground text-center">
          ⚠️ Chỉ kết nối với các DApp đáng tin cậy
        </div>
      </DialogContent>
    </Dialog>
  );
};
