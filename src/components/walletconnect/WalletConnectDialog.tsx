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
  Unlink
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
            Kết nối ví với các DApp bên ngoài một cách an toàn
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "connect" | "sessions")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connect">Kết nối mới</TabsTrigger>
            <TabsTrigger value="sessions">
              Sessions ({sessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-4">
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <QrCode className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
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
                  Kết nối
                </>
              )}
            </Button>

            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Hướng dẫn:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                <li>Mở DApp và chọn WalletConnect</li>
                <li>Sao chép URI hoặc quét mã QR</li>
                <li>Dán URI vào ô trên và kết nối</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Unlink className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Chưa có session nào được kết nối
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.topic}
                    className="p-4 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
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
                        <p className="font-medium truncate">{session.peerName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {session.peerUrl}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Còn {formatExpiry(session.expiry)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
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
