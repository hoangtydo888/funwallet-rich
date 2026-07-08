import { useWatchlist } from "@/hooks/useWatchlist";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import { getChainById } from "@/lib/chains";

export const WatchlistPanel = () => {
  const { items, loading, remove } = useWatchlist();

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Đang tải watchlist...
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Chưa có token nào trong watchlist
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Nhấn ⭐ trên token bất kỳ để theo dõi
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const chain = getChainById(item.chain_id);
        return (
          <Card key={item.id} className="glass-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={item.logo_url || "/tokens/default.svg"}
                  alt={item.symbol}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => ((e.target as HTMLImageElement).src = "/tokens/default.svg")}
                />
                <div>
                  <p className="font-semibold">{item.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.name || "—"} • {chain?.shortName || `Chain ${item.chain_id}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(item.chain_id, item.token_address)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
