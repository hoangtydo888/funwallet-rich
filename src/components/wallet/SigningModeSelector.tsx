import { useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Key, 
  Wallet2, 
  Shield, 
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Link2,
  Rainbow
} from "lucide-react";
import { useWalletConnect } from "@/hooks/useWalletConnect";

export type SigningMode = "internal" | "walletconnect";

interface SigningModeSelectorProps {
  mode: SigningMode;
  onModeChange: (mode: SigningMode) => void;
  hasPrivateKey: boolean;
  walletAddress: string;
}

export const SigningModeSelector = ({
  mode,
  onModeChange,
  hasPrivateKey,
  walletAddress,
}: SigningModeSelectorProps) => {
  const { isConnected, address: wcAddress, connect, disconnect } = useWalletConnect();
  
  // Check if WalletConnect address matches wallet address
  const addressMatch = wcAddress?.toLowerCase() === walletAddress.toLowerCase();

  // Auto-open connect when WalletConnect is selected and not connected
  const handleModeChange = (value: SigningMode) => {
    onModeChange(value);
    if (value === "walletconnect" && !isConnected) {
      // Small delay to let the UI update first
      setTimeout(() => connect(), 100);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-[#00FF7F]" />
        <Label className="text-base font-semibold">Chọn phương thức ký giao dịch</Label>
      </div>
      
      <RadioGroup
        value={mode}
        onValueChange={handleModeChange}
        className="grid gap-4"
      >
        {/* WalletConnect option - FIRST & RECOMMENDED */}
        <label
          htmlFor="walletconnect"
          className={`
            relative flex flex-col p-5 rounded-2xl border-2 transition-all cursor-pointer
            bg-gradient-to-br from-[#00FF7F]/5 via-transparent to-[#00D4FF]/5
            ${mode === "walletconnect" 
              ? "border-[#00FF7F] shadow-[0_0_20px_rgba(0,255,127,0.15)]" 
              : "border-border/50 hover:border-[#00FF7F]/50 hover:shadow-[0_0_15px_rgba(0,255,127,0.1)]"
            }
          `}
        >
          {/* Recommended badge */}
          <Badge 
            className="absolute -top-2.5 left-4 bg-gradient-to-r from-[#00FF7F] to-[#00D4FF] text-black font-semibold px-3 py-0.5 text-xs border-0"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Khuyến nghị
          </Badge>

          <div className="flex items-start gap-4 mt-1">
            <RadioGroupItem 
              value="walletconnect" 
              id="walletconnect"
              className="mt-1 border-[#00FF7F] text-[#00FF7F]"
            />
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#00FF7F]/20 to-[#00D4FF]/20">
                  <Wallet2 className="h-5 w-5 text-[#00FF7F]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      Ví ngoài – An toàn & Đồng bộ nhất
                    </span>
                    <span className="text-lg">❤️</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MetaMask • Trust Wallet • WalletConnect
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Kết nối MetaMask hoặc Trust Wallet. <span className="text-[#00FF7F] font-medium">Không cần nhập key</span>, 
                tự động đồng bộ mọi thiết bị, ký an toàn từng lần.
              </p>

              {/* Connection status or connect button */}
              {isConnected && wcAddress ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#00FF7F]/10 border border-[#00FF7F]/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#00FF7F]" />
                      <span className="text-sm font-medium text-[#00FF7F]">
                        Đã kết nối: {wcAddress.slice(0, 6)}...{wcAddress.slice(-4)}
                      </span>
                      <span>❤️</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.preventDefault(); disconnect(); }}
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Ngắt kết nối
                    </Button>
                  </div>

                  {!addressMatch && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-medium">Địa chỉ không khớp!</p>
                        <p className="mt-1">Ví kết nối: {wcAddress.slice(0, 10)}...</p>
                        <p>Ví trong app: {walletAddress.slice(0, 10)}...</p>
                      </div>
                    </div>
                  )}

                  {addressMatch && (
                    <div className="flex items-center gap-2 text-sm text-[#00FF7F]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Địa chỉ khớp, sẵn sàng gửi!</span>
                    </div>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={(e) => { e.preventDefault(); connect(); }}
                  className="w-full h-12 bg-gradient-to-r from-[#00FF7F] to-[#00D4FF] hover:from-[#00FF7F]/90 hover:to-[#00D4FF]/90 text-black font-semibold rounded-xl shadow-lg shadow-[#00FF7F]/20 transition-all hover:shadow-xl hover:shadow-[#00FF7F]/30"
                >
                  <Link2 className="h-5 w-5 mr-2" />
                  Kết nối ví ngay
                  <Rainbow className="h-4 w-4 ml-2 opacity-70" />
                </Button>
              )}
            </div>
          </div>
        </label>

        {/* Internal wallet option - SECOND */}
        <label
          htmlFor="internal"
          className={`
            relative flex flex-col p-5 rounded-2xl border-2 transition-all cursor-pointer
            ${mode === "internal" 
              ? "border-[#00FF7F] bg-[#00FF7F]/5 shadow-[0_0_15px_rgba(0,255,127,0.1)]" 
              : "border-border/50 hover:border-border"
            }
            ${!hasPrivateKey ? "opacity-60" : ""}
          `}
        >
          <div className="flex items-start gap-4">
            <RadioGroupItem 
              value="internal" 
              id="internal" 
              disabled={!hasPrivateKey}
              className="mt-1"
            />
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Key className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">Ví nội bộ (Private Key)</span>
                  <Badge variant="outline" className="ml-2 text-[10px] font-normal py-0">
                    Nâng cao
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Nhanh chóng nếu đã import key trên thiết bị này. 
                <span className="text-amber-500"> Lưu ý: cần import lại trên mỗi thiết bị mới.</span>
              </p>

              {hasPrivateKey ? (
                <div className="flex items-center gap-2 text-sm text-[#00FF7F]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Có private key trên thiết bị này</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Chưa import ví trên thiết bị này</span>
                </div>
              )}
            </div>
          </div>
        </label>
      </RadioGroup>

      {/* Helper tip */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 shrink-0 text-[#00FF7F] mt-0.5" />
        <p>
          <strong className="text-foreground">Mẹo:</strong> Dùng "Ví ngoài" để gửi CAMLY dễ dàng trên mọi thiết bị 
          mà không cần lo lắng về private key!
        </p>
      </div>
    </div>
  );
};

export default SigningModeSelector;
