import { Button } from "@/components/ui/button";
import { Wallet, Loader2, CheckCircle2, LogOut, Link2 } from "lucide-react";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WalletConnectButtonProps {
  className?: string;
  showAddress?: boolean;
  variant?: "default" | "compact" | "full";
}

export const WalletConnectButton = ({ 
  className = "", 
  showAddress = true,
  variant = "default" 
}: WalletConnectButtonProps) => {
  const { 
    isConnected, 
    address, 
    chainId, 
    isConnecting, 
    connect, 
    disconnect,
    switchToBSC 
  } = useWalletConnect();

  const isBSC = chainId === 56;

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`
              border-2 border-[#00FF7F]/50 bg-[#00FF7F]/10 
              hover:bg-[#00FF7F]/20 hover:border-[#00FF7F]
              transition-all duration-300
              ${className}
            `}
          >
            <CheckCircle2 className="h-4 w-4 mr-2 text-[#00FF7F]" />
            {showAddress && (
              <span className="font-mono text-sm">{formatAddress(address)}</span>
            )}
            {!isBSC && (
              <span className="ml-2 text-xs text-warning">(Sai mạng)</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!isBSC && (
            <DropdownMenuItem onClick={switchToBSC} className="cursor-pointer">
              <Link2 className="h-4 w-4 mr-2" />
              Chuyển sang BSC
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={disconnect} 
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Ngắt kết nối
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={isConnecting}
      className={`
        bg-gradient-to-r from-[#00FF7F] to-[#00D4AA]
        hover:from-[#00FF7F]/90 hover:to-[#00D4AA]/90
        text-black font-semibold
        shadow-lg shadow-[#00FF7F]/30
        hover:shadow-xl hover:shadow-[#00FF7F]/40
        transition-all duration-300 hover:scale-105
        ${className}
      `}
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Đang kết nối...
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4 mr-2" />
          {variant === "compact" ? "Connect" : "Kết Nối Ví Ngoài"}
        </>
      )}
    </Button>
  );
};

export default WalletConnectButton;
