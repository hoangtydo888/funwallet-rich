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
import { Shield, Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { getPasswordStrength } from "@/lib/keyEncryption";
import { cn } from "@/lib/utils";

interface SetupPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordSet: (password: string) => Promise<void>;
  title?: string;
  description?: string;
  mode?: "setup" | "enter" | "confirm";
}

export const SetupPasswordDialog = ({
  open,
  onOpenChange,
  onPasswordSet,
  title = "Thiết Lập Mật Khẩu Ví",
  description = "Tạo mật khẩu mạnh để bảo vệ private keys của bạn. Mật khẩu này sẽ được dùng để mã hóa và giải mã khóa ví.",
  mode = "setup",
}: SetupPasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);
  const isConfirmMode = mode === "setup" || mode === "confirm";
  const passwordsMatch = password === confirmPassword;
  const isValid = 
    password.length >= 6 && 
    (!isConfirmMode || passwordsMatch);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValid) {
      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự");
        return;
      }
      if (isConfirmMode && !passwordsMatch) {
        setError("Mật khẩu xác nhận không khớp");
        return;
      }
      return;
    }

    setIsLoading(true);
    try {
      await onPasswordSet(password);
      // Reset form
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColors: Record<string, string> = {
    destructive: "bg-destructive",
    warning: "bg-warning",
    success: "bg-success",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {mode === "enter" ? (
                <Lock className="h-5 w-5 text-primary" />
              ) : (
                <Shield className="h-5 w-5 text-primary" />
              )}
            </div>
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password">
              {mode === "enter" ? "Mật khẩu" : "Mật khẩu mới"}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
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

            {/* Password Strength Indicator */}
            {mode !== "enter" && password.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        level <= strength.score
                          ? strengthColors[strength.color]
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Độ mạnh: <span className="font-medium">{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password (for setup mode) */}
          {isConfirmMode && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu..."
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {confirmPassword && (
                <div className="flex items-center gap-1 text-xs">
                  {passwordsMatch ? (
                    <>
                      <Check className="h-3 w-3 text-success" />
                      <span className="text-success">Mật khẩu khớp</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 text-destructive" />
                      <span className="text-destructive">Mật khẩu không khớp</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Password Requirements */}
          {mode !== "enter" && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium text-foreground">Yêu cầu mật khẩu:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className={cn(password.length >= 6 && "text-success")}>
                  • Ít nhất 6 ký tự
                </li>
                <li className={cn(/[A-Z]/.test(password) && /[a-z]/.test(password) && "text-success")}>
                  • Chữ hoa và chữ thường
                </li>
                <li className={cn(/\d/.test(password) && "text-success")}>
                  • Ít nhất 1 chữ số
                </li>
                <li className={cn(/[!@#$%^&*(),.?":{}|<>]/.test(password) && "text-success")}>
                  • Ký tự đặc biệt (khuyến nghị)
                </li>
              </ul>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <span className="animate-pulse">Đang xử lý...</span>
              ) : mode === "enter" ? (
                "Mở khóa"
              ) : (
                "Thiết lập"
              )}
            </Button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="mt-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
          <p className="text-xs text-warning flex items-start gap-2">
            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Quan trọng:</strong> Nếu bạn quên mật khẩu, bạn sẽ cần seed phrase để khôi phục ví. 
              Hãy chắc chắn đã sao lưu seed phrase của bạn.
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
