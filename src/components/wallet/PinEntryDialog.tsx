import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, Cloud, Shield } from "lucide-react";

interface PinEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "setup" | "verify" | "restore";
  onSubmit: (pin: string) => Promise<boolean>;
  title?: string;
  description?: string;
}

export const PinEntryDialog = ({
  open,
  onOpenChange,
  mode,
  onSubmit,
  title,
  description,
}: PinEntryDialogProps) => {
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin(["", "", "", "", "", ""]);
      setConfirmPin(["", "", "", "", "", ""]);
      setStep("enter");
      setError("");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handlePinChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = isConfirm ? [...confirmPin] : [...pin];
    newPin[index] = value.slice(-1);
    
    if (isConfirm) {
      setConfirmPin(newPin);
    } else {
      setPin(newPin);
    }
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      const refs = isConfirm ? confirmInputRefs : inputRefs;
      refs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const fullPin = newPin.join("");
      if (fullPin.length === 6) {
        if (mode === "setup" && step === "enter") {
          setStep("confirm");
          setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
        } else if (mode === "setup" && step === "confirm") {
          const originalPin = pin.join("");
          if (fullPin !== originalPin) {
            setError("PIN không khớp. Vui lòng thử lại.");
            setConfirmPin(["", "", "", "", "", ""]);
            setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
          } else {
            handleSubmit(fullPin);
          }
        } else {
          handleSubmit(fullPin);
        }
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    isConfirm = false
  ) => {
    if (e.key === "Backspace") {
      const currentPin = isConfirm ? confirmPin : pin;
      if (!currentPin[index] && index > 0) {
        const refs = isConfirm ? confirmInputRefs : inputRefs;
        refs.current[index - 1]?.focus();
      }
    }
  };

  const handleSubmit = async (pinValue: string) => {
    setLoading(true);
    setError("");
    
    try {
      const success = await onSubmit(pinValue);
      if (success) {
        onOpenChange(false);
      } else {
        setError(mode === "restore" || mode === "verify" 
          ? "PIN không đúng. Vui lòng thử lại." 
          : "Có lỗi xảy ra. Vui lòng thử lại.");
        setPin(["", "", "", "", "", ""]);
        setConfirmPin(["", "", "", "", "", ""]);
        setStep("enter");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (mode) {
      case "setup":
        return "Tạo PIN bảo mật ☁️";
      case "verify":
        return "Xác nhận PIN 🔐";
      case "restore":
        return "Nhập PIN để khôi phục 🌈";
    }
  };

  const getDescription = () => {
    if (description) return description;
    switch (mode) {
      case "setup":
        return step === "enter"
          ? "Tạo PIN 6 số để bảo vệ ví của bạn trên cloud"
          : "Nhập lại PIN để xác nhận";
      case "verify":
        return "Nhập PIN 6 số của bạn";
      case "restore":
        return "Nhập PIN để giải mã private key từ cloud";
    }
  };

  const renderPinInputs = (currentPin: string[], isConfirm = false) => (
    <div className="flex justify-center gap-2">
      {currentPin.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            const refs = isConfirm ? confirmInputRefs : inputRefs;
            refs.current[index] = el;
          }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(index, e.target.value, isConfirm)}
          onKeyDown={(e) => handleKeyDown(index, e, isConfirm)}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:border-primary focus:ring-primary"
          disabled={loading}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center justify-center gap-2 text-xl">
            {mode === "setup" && <Cloud className="h-6 w-6 text-primary" />}
            {mode === "verify" && <Lock className="h-6 w-6 text-primary" />}
            {mode === "restore" && <Shield className="h-6 w-6 text-primary" />}
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-center">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* PIN Inputs */}
          {step === "enter" && renderPinInputs(pin)}
          {step === "confirm" && mode === "setup" && renderPinInputs(confirmPin, true)}

          {/* Error Message */}
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Info */}
          {mode === "setup" && (
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>⚠️ <strong>Quan trọng:</strong> Hãy nhớ PIN này!</p>
              <p>Nếu quên PIN, bạn sẽ không thể khôi phục ví từ cloud.</p>
            </div>
          )}

          {mode === "restore" && (
            <div className="text-center text-xs text-muted-foreground">
              <p>💡 Nhập PIN đã dùng khi đồng bộ ví lên cloud</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1"
          >
            Hủy
          </Button>
          <Button
            onClick={() => {
              const currentPin = step === "confirm" ? confirmPin.join("") : pin.join("");
              if (currentPin.length === 6) {
                handleSubmit(currentPin);
              }
            }}
            disabled={loading || (step === "enter" ? pin.join("").length !== 6 : confirmPin.join("").length !== 6)}
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Xác nhận"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
