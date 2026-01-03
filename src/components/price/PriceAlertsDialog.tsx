import { useState, useEffect, useCallback } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  fetchTokenPrices, 
  TokenPrice, 
  PriceAlert,
  formatPrice,
  formatChange,
  formatMarketCap,
  loadAlerts,
  saveAlerts,
  loadFavorites,
  saveFavorites,
  checkAlerts
} from "@/lib/priceTracker";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Bell, 
  BellRing,
  TrendingUp,
  TrendingDown,
  Star,
  StarOff,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react";

interface PriceAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_TOKENS = ["BNB", "CAKE", "ETH", "BTCB", "USDT", "USDC", "DOGE", "XVS"];

export const PriceAlertsDialog = ({
  open,
  onOpenChange,
}: PriceAlertsDialogProps) => {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // New alert form
  const [newAlertToken, setNewAlertToken] = useState("BNB");
  const [newAlertPrice, setNewAlertPrice] = useState("");
  const [newAlertCondition, setNewAlertCondition] = useState<"above" | "below">("above");

  // Load data on mount
  useEffect(() => {
    if (open) {
      const savedAlerts = loadAlerts();
      const savedFavorites = loadFavorites();
      setAlerts(savedAlerts);
      setFavorites(savedFavorites);
      fetchPrices(savedFavorites);
    }
  }, [open]);

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      fetchPrices(favorites);
    }, 30000);

    return () => clearInterval(interval);
  }, [open, favorites]);

  // Check alerts when prices update
  useEffect(() => {
    if (prices.length > 0 && alerts.length > 0) {
      const triggered = checkAlerts(alerts, prices);
      if (triggered.length > 0) {
        triggered.forEach(alert => {
          const price = prices.find(p => p.symbol === alert.tokenSymbol);
          toast({
            title: "⚡ Cảnh báo giá!",
            description: `${alert.tokenSymbol} đã ${alert.condition === "above" ? "vượt" : "xuống dưới"} ${formatPrice(alert.targetPrice)}. Giá hiện tại: ${price ? formatPrice(price.price) : "N/A"}`,
          });
        });

        // Update alert status
        const updatedAlerts = alerts.map(a => {
          const isTriggered = triggered.find(t => t.id === a.id);
          return isTriggered ? { ...a, triggered: true } : a;
        });
        setAlerts(updatedAlerts);
        saveAlerts(updatedAlerts);
      }
    }
  }, [prices]);

  const fetchPrices = async (tokens: string[]) => {
    setLoading(true);
    try {
      const allTokens = [...new Set([...tokens, ...alerts.map(a => a.tokenSymbol)])];
      const data = await fetchTokenPrices(allTokens.length > 0 ? allTokens : AVAILABLE_TOKENS);
      setPrices(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [...favorites, symbol];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
    if (!favorites.includes(symbol)) {
      fetchPrices([...favorites, symbol]);
    }
  };

  const addAlert = () => {
    if (!newAlertPrice || parseFloat(newAlertPrice) <= 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập giá hợp lệ",
        variant: "destructive",
      });
      return;
    }

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}`,
      tokenSymbol: newAlertToken,
      targetPrice: parseFloat(newAlertPrice),
      condition: newAlertCondition,
      enabled: true,
      createdAt: Date.now(),
      triggered: false,
    };

    const updatedAlerts = [...alerts, newAlert];
    setAlerts(updatedAlerts);
    saveAlerts(updatedAlerts);
    setNewAlertPrice("");

    toast({
      title: "Đã thêm cảnh báo",
      description: `Sẽ thông báo khi ${newAlertToken} ${newAlertCondition === "above" ? "vượt" : "xuống dưới"} ${formatPrice(parseFloat(newAlertPrice))}`,
    });
  };

  const deleteAlert = (alertId: string) => {
    const updatedAlerts = alerts.filter(a => a.id !== alertId);
    setAlerts(updatedAlerts);
    saveAlerts(updatedAlerts);
  };

  const toggleAlert = (alertId: string) => {
    const updatedAlerts = alerts.map(a => 
      a.id === alertId ? { ...a, enabled: !a.enabled, triggered: false } : a
    );
    setAlerts(updatedAlerts);
    saveAlerts(updatedAlerts);
  };

  const currentPrice = prices.find(p => p.symbol === newAlertToken);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Theo dõi giá & Cảnh báo
          </DialogTitle>
          <DialogDescription>
            Theo dõi giá realtime và tạo cảnh báo cho các token yêu thích
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Price List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Giá Realtime</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchPrices(favorites)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {lastUpdate && (
              <p className="text-xs text-muted-foreground">
                Cập nhật: {lastUpdate.toLocaleTimeString()}
              </p>
            )}

            <div className="grid gap-2">
              {prices.length > 0 ? prices.map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleFavorite(token.symbol)}
                      className="text-muted-foreground hover:text-warning transition-colors"
                    >
                      {favorites.includes(token.symbol) ? (
                        <Star className="h-4 w-4 fill-warning text-warning" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </button>
                    <div>
                      <p className="font-medium">{token.symbol}</p>
                      <p className="text-xs text-muted-foreground">{token.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(token.price)}</p>
                    <p className={`text-xs flex items-center justify-end gap-1 ${
                      token.change24h >= 0 ? "text-success" : "text-destructive"
                    }`}>
                      {token.change24h >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatChange(token.change24h)}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  ) : (
                    <p>Chưa có dữ liệu giá</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Create Alert */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <Label className="text-base font-semibold">Tạo cảnh báo mới</Label>
            
            <div className="grid grid-cols-4 gap-2">
              <Select value={newAlertToken} onValueChange={setNewAlertToken}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_TOKENS.map(token => (
                    <SelectItem key={token} value={token}>{token}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={newAlertCondition} 
                onValueChange={(v) => setNewAlertCondition(v as "above" | "below")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Vượt</SelectItem>
                  <SelectItem value="below">Dưới</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Giá mục tiêu"
                value={newAlertPrice}
                onChange={(e) => setNewAlertPrice(e.target.value)}
                step="0.01"
              />

              <Button onClick={addAlert} disabled={!newAlertPrice}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {currentPrice && (
              <p className="text-xs text-muted-foreground">
                Giá hiện tại: {formatPrice(currentPrice.price)}
              </p>
            )}
          </div>

          {/* Alert List */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Cảnh báo đang hoạt động</Label>
            
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      alert.triggered 
                        ? "border-warning bg-warning/10" 
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {alert.triggered ? (
                        <BellRing className="h-4 w-4 text-warning" />
                      ) : (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {alert.tokenSymbol} {alert.condition === "above" ? ">" : "<"}{" "}
                          {formatPrice(alert.targetPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {alert.triggered ? "Đã kích hoạt" : "Đang chờ"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={() => toggleAlert(alert.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAlert(alert.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Chưa có cảnh báo nào</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
