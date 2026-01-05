import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Key, 
  Wallet, 
  Shield, 
  AlertCircle,
  CheckCircle2,
  Smartphone
} from "lucide-react";
import { WalletConnectButton } from "./WalletConnectButton";
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
  const { isConnected, address: wcAddress } = useWalletConnect();
  
  // Check if WalletConnect address matches wallet address
  const addressMatch = wcAddress?.toLowerCase() === walletAddress.toLowerCase();

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        Chọn phương thức ký giao dịch
      </Label>
      
      <RadioGroup
        value={mode}
        onValueChange={(value) => onModeChange(value as SigningMode)}
        className="grid gap-3"
      >
        {/* Internal wallet option */}
        <div className={`
          relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
          ${mode === "internal" 
            ? "border-[#00FF7F] bg-[#00FF7F]/5" 
            : "border-border hover:border-[#00FF7F]/50"
          }
          ${!hasPrivateKey ? "opacity-60" : ""}
        `}>
          <RadioGroupItem 
            value="internal" 
            id="internal" 
            disabled={!hasPrivateKey}
            className="mt-1"
          />
          <div className="flex-1">
            <Label 
              htmlFor="internal" 
              className="flex items-center gap-2 cursor-pointer font-medium"
            >
              <Key className="h-4 w-4 text-amber-500" />
              Ví nội bộ (Private Key)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Ký tự động, nhanh chóng. Key đã lưu trên thiết bị này.
            </p>
            {hasPrivateKey ? (
              <div className="flex items-center gap-1 mt-2 text-xs text-[#00FF7F]">
                <CheckCircle2 className="h-3 w-3" />
                <span>Có private key</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>Chưa import ví trên thiết bị này</span>
              </div>
            )}
          </div>
        </div>

        {/* WalletConnect option */}
        <div className={`
          relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
          ${mode === "walletconnect" 
            ? "border-[#00FF7F] bg-[#00FF7F]/5" 
            : "border-border hover:border-[#00FF7F]/50"
          }
        `}>
          <RadioGroupItem 
            value="walletconnect" 
            id="walletconnect"
            className="mt-1"
          />
          <div className="flex-1">
            <Label 
              htmlFor="walletconnect" 
              className="flex items-center gap-2 cursor-pointer font-medium"
            >
              <Smartphone className="h-4 w-4 text-blue-500" />
              Ví ngoài (MetaMask/Trust Wallet)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Kết nối ví ngoài, ký xác nhận trên ứng dụng ví.
            </p>
            
            {mode === "walletconnect" && (
              <div className="mt-3 space-y-2">
                <WalletConnectButton className="w-full" />
                
                {isConnected && !addressMatch && wcAddress && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 text-warning text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Địa chỉ không khớp!</p>
                      <p>Ví kết nối: {wcAddress.slice(0, 8)}...</p>
                      <p>Ví trong app: {walletAddress.slice(0, 8)}...</p>
                    </div>
                  </div>
                )}
                
                {isConnected && addressMatch && (
                  <div className="flex items-center gap-1 text-xs text-[#00FF7F]">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Địa chỉ khớp, sẵn sàng ký!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </RadioGroup>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground px-1">
        💡 <strong>Gợi ý:</strong> Dùng "Ví ngoài" nếu bạn chưa import ví trên thiết bị này, 
        hoặc muốn xác nhận mỗi giao dịch trên ứng dụng ví.
      </p>
    </div>
  );
};

export default SigningModeSelector;
