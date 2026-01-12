import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Lock, 
  Shield,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface TransactionDetails {
  from: string;
  to: string;
  amount: string;
  tokenSymbol: string;
  tokenLogo?: string;
  gasEstimate?: string;
  gasToken?: string;
  usdValue?: string;
  isNewAddress?: boolean;
}

interface TransactionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionDetails | null;
  onConfirm: (password: string) => Promise<void>;
  requirePassword?: boolean;
  warningThresholdUsd?: number;
}

export const TransactionConfirmDialog = ({
  open,
  onOpenChange,
  transaction,
  onConfirm,
  requirePassword = true,
  warningThresholdUsd = 100,
}: TransactionConfirmDialogProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const usdValue = parseFloat(transaction.usdValue || "0");
  const isLargeTransaction = usdValue > warningThresholdUsd;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Đã sao chép",
      description: "Địa chỉ đã được sao chép vào clipboard",
    });
  };

  const handleConfirm = async () => {
    setError("");
    
    if (requirePassword && !password) {
      setError("Vui lòng nhập mật khẩu để xác nhận");
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(password);
      setPassword("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giao dịch thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span>Xác Nhận Giao Dịch</span>
          </DialogTitle>
          <DialogDescription>
            Vui lòng kiểm tra kỹ thông tin trước khi xác nhận
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Warning for large transactions */}
          {isLargeTransaction && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Giao dịch giá trị cao</p>
                <p className="text-muted-foreground text-xs">
                  Giao dịch này có giá trị ~${usdValue.toFixed(2)}. Hãy kiểm tra kỹ địa chỉ nhận.
                </p>
              </div>
            </div>
          )}

          {/* Warning for new addresses */}
          {transaction.isNewAddress && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Địa chỉ mới</p>
                <p className="text-muted-foreground text-xs">
                  Đây là lần đầu bạn gửi đến địa chỉ này. Hãy đảm bảo địa chỉ chính xác.
                </p>
              </div>
            </div>
          )}

          {/* Transaction Details */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            {/* From */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Từ</span>
              <span className="font-mono">{formatAddress(transaction.from)}</span>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* To */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Đến</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{formatAddress(transaction.to)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyAddress(transaction.to)}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Amount */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Số lượng</span>
                <div className="text-right">
                  <div className="flex items-center gap-2 font-semibold">
                    {transaction.tokenLogo && (
                      <img 
                        src={transaction.tokenLogo} 
                        alt={transaction.tokenSymbol}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span>{transaction.amount} {transaction.tokenSymbol}</span>
                  </div>
                  {transaction.usdValue && (
                    <span className="text-xs text-muted-foreground">
                      ~${parseFloat(transaction.usdValue).toFixed(2)} USD
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Gas */}
            {transaction.gasEstimate && (
              <div className="flex justify-between items-center text-sm border-t pt-3">
                <span className="text-muted-foreground">Phí gas (ước tính)</span>
                <span>
                  ~{transaction.gasEstimate} {transaction.gasToken || "BNB"}
                </span>
              </div>
            )}
          </div>

          {/* Password Input */}
          {requirePassword && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Nhập mật khẩu để xác nhận
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu ví..."
                  className="pr-10"
                  disabled={isLoading}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              className={cn(
                "flex-1",
                isLargeTransaction && "bg-warning hover:bg-warning/90"
              )}
              onClick={handleConfirm}
              disabled={isLoading || (requirePassword && !password)}
            >
              {isLoading ? (
                <span className="animate-pulse">Đang xử lý...</span>
              ) : (
                "Xác nhận & Ký"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
