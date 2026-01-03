import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  Home,
  ExternalLink,
  Shield,
  Star,
  StarOff,
  X,
  Search
} from "lucide-react";

interface DAppBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
}

interface DApp {
  name: string;
  url: string;
  icon: string;
  category: string;
  description: string;
}

const FEATURED_DAPPS: DApp[] = [
  {
    name: "PancakeSwap",
    url: "https://pancakeswap.finance",
    icon: "🥞",
    category: "DEX",
    description: "Swap, earn, and stake on BSC"
  },
  {
    name: "Venus",
    url: "https://venus.io",
    icon: "💫",
    category: "Lending",
    description: "Decentralized lending & borrowing"
  },
  {
    name: "Alpaca Finance",
    url: "https://alpacafinance.org",
    icon: "🦙",
    category: "Yield",
    description: "Leveraged yield farming"
  },
  {
    name: "ApeSwap",
    url: "https://apeswap.finance",
    icon: "🦧",
    category: "DEX",
    description: "DeFi hub for apes"
  },
  {
    name: "Biswap",
    url: "https://biswap.org",
    icon: "🔄",
    category: "DEX",
    description: "First DEX with 3-type referral"
  },
  {
    name: "MDEX",
    url: "https://mdex.com",
    icon: "🔷",
    category: "DEX",
    description: "Multi-chain DEX"
  },
  {
    name: "Beefy Finance",
    url: "https://beefy.com",
    icon: "🐄",
    category: "Yield",
    description: "Multichain yield optimizer"
  },
  {
    name: "OpenSea",
    url: "https://opensea.io",
    icon: "🌊",
    category: "NFT",
    description: "NFT marketplace"
  },
  {
    name: "Element Market",
    url: "https://element.market",
    icon: "💎",
    category: "NFT",
    description: "Community-driven NFT marketplace"
  },
  {
    name: "tofuNFT",
    url: "https://tofunft.com",
    icon: "🧊",
    category: "NFT",
    description: "Multi-chain NFT marketplace"
  }
];

const CATEGORIES = ["Tất cả", "DEX", "Lending", "Yield", "NFT"];

export const DAppBrowserDialog = ({
  open,
  onOpenChange,
  walletAddress,
}: DAppBrowserDialogProps) => {
  const [currentUrl, setCurrentUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("dapp_favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigateTo = (url: string) => {
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }
    setCurrentUrl(url);
    setInputUrl(url);
    setIsLoading(true);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(url);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const url = history[historyIndex - 1];
      setCurrentUrl(url);
      setInputUrl(url);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const url = history[historyIndex + 1];
      setCurrentUrl(url);
      setInputUrl(url);
    }
  };

  const goHome = () => {
    setCurrentUrl("");
    setInputUrl("");
  };

  const refresh = () => {
    if (iframeRef.current && currentUrl) {
      setIsLoading(true);
      iframeRef.current.src = currentUrl;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      navigateTo(inputUrl.trim());
    }
  };

  const toggleFavorite = (url: string) => {
    const newFavorites = favorites.includes(url)
      ? favorites.filter(f => f !== url)
      : [...favorites, url];
    setFavorites(newFavorites);
    localStorage.setItem("dapp_favorites", JSON.stringify(newFavorites));
  };

  const filteredDApps = FEATURED_DAPPS.filter(dapp => {
    const matchCategory = selectedCategory === "Tất cả" || dapp.category === selectedCategory;
    const matchSearch = !searchQuery || 
      dapp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dapp.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            DApp Browser
          </DialogTitle>
          <DialogDescription>
            Truy cập các ứng dụng DeFi trực tiếp từ ví của bạn
          </DialogDescription>
        </DialogHeader>

        {/* Browser Toolbar */}
        <div className="px-4 py-2 border-b border-border">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goBack}
                disabled={historyIndex <= 0}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goForward}
                disabled={historyIndex >= history.length - 1}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={refresh}
                disabled={!currentUrl}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goHome}
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="Nhập URL hoặc tìm kiếm DApp..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
              />
              {currentUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavorite(currentUrl)}
                  className="h-6 w-6"
                >
                  {favorites.includes(currentUrl) ? (
                    <Star className="h-4 w-4 fill-warning text-warning" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {currentUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => window.open(currentUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {currentUrl ? (
            <div className="h-full relative">
              {/* Note: In production, you'd use a more secure approach */}
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center p-6 max-w-md">
                  <Globe className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="font-heading font-semibold text-lg mb-2">
                    Đang mở: {new URL(currentUrl).hostname}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Vì lý do bảo mật, DApps sẽ mở trong tab mới với địa chỉ ví của bạn.
                  </p>
                  <div className="p-3 rounded-lg bg-background/50 mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Ví của bạn</p>
                    <p className="font-mono text-sm truncate">{walletAddress}</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => window.open(currentUrl, "_blank")}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Mở trong tab mới
                    </Button>
                    <Button variant="outline" onClick={goHome}>
                      <X className="h-4 w-4 mr-2" />
                      Đóng
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm DApp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Categories */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="shrink-0"
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Favorites */}
              {favorites.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" />
                    Yêu thích
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {favorites.map((url) => {
                      const dapp = FEATURED_DAPPS.find(d => d.url === url);
                      return (
                        <button
                          key={url}
                          onClick={() => navigateTo(url)}
                          className="shrink-0 p-3 rounded-lg border border-border hover:border-primary transition-colors text-center min-w-[100px]"
                        >
                          <span className="text-2xl block mb-1">{dapp?.icon || "🔗"}</span>
                          <span className="text-sm">{dapp?.name || new URL(url).hostname}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Featured DApps */}
              <div>
                <h3 className="font-heading font-semibold mb-3">DApps phổ biến</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredDApps.map((dapp) => (
                    <button
                      key={dapp.url}
                      onClick={() => navigateTo(dapp.url)}
                      className="p-4 rounded-lg border border-border hover:border-primary transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{dapp.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{dapp.name}</p>
                          <p className="text-xs text-primary">{dapp.category}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {dapp.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
