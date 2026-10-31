import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";
import { TRADE_ASSETS, type TradeAsset } from "@/lib/marketOrder";
import { fmtUnits } from "@/hooks/useMarketTrade";

interface AssetPickerProps {
  value: TradeAsset;
  onChange: (asset: TradeAsset) => void;
  balances: Record<string, bigint>;
  exclude?: string[];
  label?: string;
  className?: string;
}

export const AssetLogo = ({ asset, size = 28 }: { asset: TradeAsset; size?: number }) => (
  <img src={asset.logo} alt="" width={size} height={size} className="rounded-full shrink-0" onError={e => { e.currentTarget.src = "/tokens/default.svg"; }} />
);

/** Coin selector with search, showing each coin's balance — like Binance's list. */
export const AssetPicker = ({ value, onChange, balances, exclude = [], label, className = "" }: AssetPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const list = TRADE_ASSETS.filter(a => !exclude.includes(a.key) && (!q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)));
  return (
    <>
      <button type="button" onClick={() => { setSearch(""); setOpen(true); }} className={`flex items-center gap-2 font-semibold text-lg shrink-0 ${className}`}>
        {label ?? <><AssetLogo asset={value} /> {value.symbol}</>}
        <ChevronDown className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Chọn coin</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm" className="pl-9" />
          </div>
          <div className="overflow-y-auto -mx-2">
            {list.map(a => (
              <button key={a.key} type="button" onClick={() => { onChange(a); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-muted text-left ${a.key === value.key ? "bg-muted" : ""}`}>
                <AssetLogo asset={a} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{a.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.name} · {a.chainName === "Bitcoin" ? "Mạng Bitcoin" : "BSC"}</div>
                </div>
                <div className="text-sm text-right">{fmtUnits(balances[a.key], a.decimals)}</div>
              </button>
            ))}
            {!list.length && <p className="text-sm text-muted-foreground text-center py-6">Không tìm thấy coin</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
