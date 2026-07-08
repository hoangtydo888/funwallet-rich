import { useState, useMemo } from "react";
import { useChain } from "@/contexts/ChainContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ChevronDown, Search, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddCustomNetworkDialog } from "./AddCustomNetworkDialog";

interface ChainSelectorProps {
  compact?: boolean;
}

export const ChainSelector = ({ compact = false }: ChainSelectorProps) => {
  const { currentChain, availableChains, builtInChains, customChains, setCurrentChain, removeCustomChain } =
    useChain();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return null;
    return availableChains.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        String(c.chainId).includes(q),
    );
  }, [query, availableChains]);

  const handleSelectChain = (chain: typeof currentChain) => {
    setCurrentChain(chain);
    setOpen(false);
    setQuery("");
  };

  const renderChainRow = (chain: typeof currentChain) => (
    <div key={chain.chainId} className="flex items-center gap-2">
      <button
        onClick={() => handleSelectChain(chain)}
        className={cn(
          "flex-1 flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
          currentChain.chainId === chain.chainId
            ? "bg-primary/10 border border-primary/30"
            : "bg-muted/50 hover:bg-muted",
        )}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${chain.color}20` }}
        >
          {chain.logo.startsWith("/") ? (
            <img
              src={chain.logo}
              alt={chain.shortName}
              className="w-6 h-6 rounded-full"
              onError={(e) => ((e.target as HTMLImageElement).src = "/tokens/default.svg")}
            />
          ) : (
            chain.logo
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{chain.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {chain.symbol} • ID: {chain.chainId}
            {chain.isCustom && " • Custom"}
          </p>
        </div>
        {currentChain.chainId === chain.chainId && (
          <Check className="h-5 w-5 text-primary shrink-0" />
        )}
      </button>
      {chain.isCustom && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-destructive"
          onClick={() => removeCustomChain(chain.chainId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn("gap-2", compact ? "px-2 h-8" : "")}
      >
        {currentChain.logo.startsWith("/") ? (
          <img
            src={currentChain.logo}
            alt={currentChain.shortName}
            className="w-5 h-5 rounded-full"
            onError={(e) => ((e.target as HTMLImageElement).src = "/tokens/default.svg")}
          />
        ) : (
          <span className="text-lg">{currentChain.logo}</span>
        )}
        {!compact && (
          <>
            <span className="hidden sm:inline">{currentChain.shortName}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chọn mạng blockchain</DialogTitle>
            <DialogDescription>
              {availableChains.length} mạng EVM khả dụng
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, symbol hoặc chain ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid gap-2 py-2 overflow-y-auto flex-1">
            {filtered ? (
              filtered.length > 0 ? (
                filtered.map(renderChainRow)
              ) : (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Không tìm thấy mạng nào
                </p>
              )
            ) : (
              <>
                <p className="text-xs font-semibold text-muted-foreground px-1 mt-1">MAINNET</p>
                {builtInChains.map(renderChainRow)}
                {customChains.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground px-1 mt-2">CUSTOM</p>
                    {customChains.map(renderChainRow)}
                  </>
                )}
              </>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => {
              setOpen(false);
              setAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm mạng tùy chỉnh
          </Button>
        </DialogContent>
      </Dialog>

      <AddCustomNetworkDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
};
