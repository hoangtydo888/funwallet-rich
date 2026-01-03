import { useState } from "react";
import { useChain } from "@/contexts/ChainContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChainSelectorProps {
  compact?: boolean;
}

export const ChainSelector = ({ compact = false }: ChainSelectorProps) => {
  const { currentChain, availableChains, setCurrentChain } = useChain();
  const [open, setOpen] = useState(false);

  const handleSelectChain = (chain: typeof currentChain) => {
    setCurrentChain(chain);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "gap-2",
          compact ? "px-2 h-8" : ""
        )}
      >
        <span className="text-lg">{currentChain.logo}</span>
        {!compact && (
          <>
            <span className="hidden sm:inline">{currentChain.shortName}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn mạng blockchain</DialogTitle>
            <DialogDescription>
              Chuyển đổi giữa các mạng EVM được hỗ trợ
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            {availableChains.map((chain) => (
              <button
                key={chain.chainId}
                onClick={() => handleSelectChain(chain)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  currentChain.chainId === chain.chainId
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${chain.color}20` }}
                >
                  {chain.logo}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{chain.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {chain.symbol} • Chain ID: {chain.chainId}
                  </p>
                </div>
                {currentChain.chainId === chain.chainId && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            💡 Mỗi mạng có token gốc và phí gas riêng
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
