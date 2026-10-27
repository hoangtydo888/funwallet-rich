import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sparkles, ImageOff, RefreshCw, Loader2, Star, ExternalLink } from "lucide-react";
import { NFTDetailDialog } from "./NFTDetailDialog";
import type { NFTItem, MultiChainNFT } from "@/hooks/useNFT";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getChainById, SUPPORTED_CHAINS } from "@/lib/chains";

interface NFTGalleryProps {
  nfts: NFTItem[];
  loading: boolean;
  onMintClick: () => void;
  multiChainNfts?: MultiChainNFT[];
  mcScanning?: boolean;
  mcUnsupported?: number[];
  onScanChains?: (chainIds: number[]) => void;
}

// Default chains to scan (BSC + Alchemy-supported)
const DEFAULT_SCAN_CHAINS = [56, 1, 137, 42161, 10, 8453];

export const NFTGallery = ({
  nfts,
  loading,
  onMintClick,
  multiChainNfts = [],
  mcScanning = false,
  mcUnsupported = [],
  onScanChains,
}: NFTGalleryProps) => {
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const { items: watchlist, isWatched, toggle } = useWatchlist();

  // Merge local (DB) NFTs and multi-chain scan results into a unified list
  const merged = useMemo(() => {
    const items: Array<{
      key: string;
      nft: NFTItem;
      chainId: number;
      collection?: string;
      floorPrice?: number | null;
      explorerUrl?: string;
    }> = [];

    for (const n of nfts) {
      items.push({
        key: `local-${n.id}`,
        nft: n,
        chainId: 56,
      });
    }
    for (const m of multiChainNfts) {
      items.push({
        key: `mc-${m.chainId}-${m.contractAddress}-${m.tokenId}`,
        chainId: m.chainId,
        collection: m.collection,
        floorPrice: m.floorPrice,
        explorerUrl: m.explorerUrl,
        nft: {
          id: `mc-${m.chainId}-${m.contractAddress}-${m.tokenId}`,
          contract_address: m.contractAddress,
          token_id: m.tokenId,
          name: m.name,
          description: null,
          image_url: m.image
            ? m.image.startsWith("ipfs://")
              ? `https://ipfs.io/ipfs/${m.image.slice(7).replace(/^ipfs\//, "")}`
              : m.image
            : null,
          metadata_url: null,
          chain: String(m.chainId),
        },
      });
    }
    return items;
  }, [nfts, multiChainNfts]);

  const filtered = useMemo(() => {
    if (!watchlistOnly) return merged;
    return merged.filter((it) =>
      watchlist.some(
        (w) =>
          w.chain_id === it.chainId &&
          w.token_address.toLowerCase() === it.nft.contract_address.toLowerCase(),
      ),
    );
  }, [merged, watchlistOnly, watchlist]);

  if (loading && merged.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {onScanChains && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onScanChains(DEFAULT_SCAN_CHAINS)}
            disabled={mcScanning}
          >
            {mcScanning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Quét đa chain
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-muted-foreground">Chỉ Watchlist</span>
          <Switch checked={watchlistOnly} onCheckedChange={setWatchlistOnly} />
        </div>
        {mcUnsupported.length > 0 && (
          <span className="text-xs text-muted-foreground">
            (Chain không hỗ trợ: {mcUnsupported.join(", ")})
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <ImageOff className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-heading font-semibold mb-2">
            {watchlistOnly ? "Không có NFT nào trong Watchlist" : "Chưa có NFT nào"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {watchlistOnly
              ? "Thêm token vào Watchlist bằng nút ⭐ ở danh sách token"
              : "Mint FUN Badge hoặc quét NFT trên các chain khác"}
          </p>
          {!watchlistOnly && (
            <Button onClick={onMintClick} className="bg-gradient-to-r from-primary to-secondary">
              <Sparkles className="h-4 w-4 mr-2" />
              Mint FUN Badge
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((it) => {
            const chain = getChainById(it.chainId);
            return (
              <div key={it.key} className="group text-left">
              <button
                type="button"
                onClick={() => {
                  setSelectedNFT(it.nft);
                  setDetailOpen(true);
                }}
                className="block w-full text-left"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/50 mb-2 ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                  {it.nft.image_url ? (
                    <img
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      src={it.nft.image_url}
                      alt={it.nft.name || "NFT"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🖼️
                    </div>
                  )}
                  {chain && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 left-2 text-[10px] px-1.5 py-0"
                      style={{ backgroundColor: `${chain.color}33`, color: chain.color }}
                    >
                      {chain.shortName}
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium text-sm truncate">
                  {it.nft.name || `NFT #${it.nft.token_id}`}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {it.collection || `Token ID: ${it.nft.token_id}`}
                </p>
              </button>
              <div className="flex items-center justify-between mt-1 gap-1">
                <span className="text-xs font-medium">
                  {it.floorPrice != null ? `Sàn: ${it.floorPrice.toFixed(4)} ${chain?.symbol ?? "ETH"}` : "Sàn: —"}
                </span>
                <div className="flex items-center">
                  <button
                    type="button"
                    aria-label="Thêm collection vào Watchlist"
                    className="p-1 rounded hover:bg-muted"
                    onClick={() =>
                      toggle({
                        chain_id: it.chainId,
                        token_address: it.nft.contract_address,
                        symbol: (it.collection || "NFT").slice(0, 20),
                        name: it.collection || it.nft.name,
                        logo_url: it.nft.image_url,
                        decimals: 0,
                      })
                    }
                  >
                    <Star className={`h-3.5 w-3.5 ${isWatched(it.chainId, it.nft.contract_address) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                  </button>
                  {it.explorerUrl && (
                    <a href={it.explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="Xem trên explorer" className="p-1 rounded hover:bg-muted">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}

      <NFTDetailDialog open={detailOpen} onOpenChange={setDetailOpen} nft={selectedNFT} />
    </>
  );
};
