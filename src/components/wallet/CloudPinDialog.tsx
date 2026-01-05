// CloudPinDialog - PIN entry for encrypted key management
// Used for sync/restore private keys across devices

import { useState, useRef, useEffect } from "react";
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
import { Cloud, Lock, Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react";
import { isValidPin } from "@/lib/encryption";

interface CloudPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "encrypt" | "decrypt";
  onSubmit: (pin: string) => Promise<boolean>;
  title?: string;
  description?: string;
}

export const CloudPinDialog = ({
  open,
  onOpenChange,
  mode,
  onSubmit,
  title,
  description,
}: CloudPinDialogProps) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setConfirmPin("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError("");

    if (!isValidPin(pin)) {
      setError("PIN phải có đúng 6 chữ số");
      return;
    }

    if (mode === "encrypt" && pin !== confirmPin) {
      setError("PIN xác nhận không khớp");
      return;
    }

    setIsLoading(true);
    try {
      const success = await onSubmit(pin);
      if (success) {
        onOpenChange(false);
      } else {
        setError(mode === "decrypt" ? "PIN không đúng" : "Có lỗi xảy ra");
      }
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (value: string, setter: (v: string) => void) => {
    // Only allow digits, max 6
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setter(cleaned);
  };

  const defaultTitle = mode === "encrypt" 
    ? "Bảo vệ ví bằng PIN ❤️" 
    : "Nhập PIN để mở khóa 🔓";
  
  const defaultDescription = mode === "encrypt"
    ? "Tạo PIN 6 số để mã hóa private key. PIN này sẽ dùng để khôi phục ví trên thiết bị khác."
    : "Nhập PIN 6 số để giải mã private key từ cloud.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            {mode === "encrypt" ? (
              <Cloud className="h-5 w-5 text-primary" />
            ) : (
              <Lock className="h-5 w-5 text-primary" />
            )}
            {title || defaultTitle}
          </DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Decorative element */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/30 blur-md -z-10" />
            </div>
          </div>

          {/* PIN Input */}
          <div className="space-y-2">
            <Label>PIN (6 chữ số)</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value, setPin)}
                placeholder="••••••"
                className="text-center text-2xl tracking-widest font-mono pr-10"
                maxLength={6}
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {/* PIN strength indicator */}
            <div className="flex gap-1">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < pin.length
                      ? i < 2
                        ? "bg-destructive"
                        : i < 4
                        ? "bg-warning"
                        : "bg-success"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Confirm PIN (encrypt mode only) */}
          {mode === "encrypt" && (
            <div className="space-y-2">
              <Label>Xác nhận PIN</Label>
              <Input
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => handlePinChange(e.target.value, setConfirmPin)}
                placeholder="••••••"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Warning for encrypt mode */}
          {mode === "encrypt" && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning-foreground">
              <p className="font-medium">⚠️ Quan trọng:</p>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                <li>Nhớ PIN này để khôi phục ví sau này</li>
                <li>Không thể reset PIN nếu quên</li>
                <li>Vẫn nên backup seed phrase riêng</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={
                isLoading ||
                !isValidPin(pin) ||
                (mode === "encrypt" && !isValidPin(confirmPin))
              }
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Đang xử lý...
                </span>
              ) : mode === "encrypt" ? (
                "Mã hóa & Lưu ☁️"
              ) : (
                "Mở khóa 🔓"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
