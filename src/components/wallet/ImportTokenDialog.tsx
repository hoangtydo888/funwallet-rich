import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { isValidAddress, getProvider, ERC20_ABI } from "@/lib/wallet";
import { ethers } from "ethers";

interface ImportTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (token: CustomToken) => void;
}

export interface CustomToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logo: string;
}

const CUSTOM_TOKENS_KEY = "fun_wallet_custom_tokens";

export const saveCustomTokens = (tokens: CustomToken[]) => {
  localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(tokens));
};

export const loadCustomTokens = (): CustomToken[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_TOKENS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const ImportTokenDialog = ({
  open,
  onOpenChange,
  onImport,
}: ImportTokenDialogProps) => {
  const [contractAddress, setContractAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<CustomToken | null>(null);
  const [error, setError] = useState("");

  const handleAddressChange = (address: string) => {
    setContractAddress(address);
    setTokenInfo(null);
    setError("");
  };

  const fetchTokenInfo = async () => {
    if (!contractAddress.trim()) {
      setError("Vui lòng nhập địa chỉ contract");
      return;
    }

    if (!isValidAddress(contractAddress)) {
      setError("Địa chỉ contract không hợp lệ");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const provider = getProvider();
      const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

      const [symbol, name, decimals] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals(),
      ]);

      const token: CustomToken = {
        symbol,
        name,
        address: contractAddress,
        decimals: Number(decimals),
        logo: "/tokens/default.svg", // Default logo
      };

      setTokenInfo(token);
    } catch (err) {
      console.error("Error fetching token info:", err);
      setError("Không thể lấy thông tin token. Hãy kiểm tra lại địa chỉ contract.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!tokenInfo) return;

    // Save to localStorage
    const existingTokens = loadCustomTokens();
    const alreadyExists = existingTokens.some(
      t => t.address.toLowerCase() === tokenInfo.address.toLowerCase()
    );

    if (alreadyExists) {
      toast({
        title: "Token đã tồn tại",
        description: `${tokenInfo.symbol} đã được import trước đó`,
        variant: "destructive",
      });
      return;
    }

    const updatedTokens = [...existingTokens, tokenInfo];
    saveCustomTokens(updatedTokens);

    onImport(tokenInfo);
    
    toast({
      title: "Import thành công",
      description: `${tokenInfo.symbol} đã được thêm vào ví`,
    });

    // Reset and close
    setContractAddress("");
    setTokenInfo(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setContractAddress("");
    setTokenInfo(null);
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Token Tùy Chỉnh</DialogTitle>
          <DialogDescription>
            Nhập địa chỉ contract của token BEP-20 trên BSC
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contract Address Input */}
          <div className="space-y-2">
            <Label htmlFor="contract">Địa chỉ Contract</Label>
            <div className="flex gap-2">
              <Input
                id="contract"
                placeholder="0x..."
                value={contractAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Button 
                onClick={fetchTokenInfo} 
                disabled={loading || !contractAddress}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Tìm"
                )}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Token Preview */}
          {tokenInfo && (
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Token tìm thấy!</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="text-xl font-bold">{tokenInfo.symbol.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-lg">{tokenInfo.symbol}</p>
                  <p className="text-sm text-muted-foreground">{tokenInfo.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Decimals</p>
                  <p className="font-mono">{tokenInfo.decimals}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contract</p>
                  <p className="font-mono truncate">{tokenInfo.address.slice(0, 10)}...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Hủy
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!tokenInfo}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Import Token
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
