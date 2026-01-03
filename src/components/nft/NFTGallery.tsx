import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, ImageOff } from "lucide-react";
import { NFTDetailDialog } from "./NFTDetailDialog";
import type { NFTItem } from "@/hooks/useNFT";

interface NFTGalleryProps {
  nfts: NFTItem[];
  loading: boolean;
  onMintClick: () => void;
}

export const NFTGallery = ({ nfts, loading, onMintClick }: NFTGalleryProps) => {
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (loading) {
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

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <ImageOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="font-heading font-semibold mb-2">Chưa có NFT nào</h3>
        <p className="text-muted-foreground text-sm mb-6">
          Mint FUN Badge hoặc thêm NFT từ BNB Chain
        </p>
        <Button onClick={onMintClick} className="bg-gradient-to-r from-primary to-secondary">
          <Sparkles className="h-4 w-4 mr-2" />
          Mint FUN Badge
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {nfts.map((nft) => (
          <button
            key={nft.id}
            onClick={() => {
              setSelectedNFT(nft);
              setDetailOpen(true);
            }}
            className="group text-left"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-muted/50 mb-2 ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
              {nft.image_url ? (
                <img
                  src={nft.image_url}
                  alt={nft.name || "NFT"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  🖼️
                </div>
              )}
            </div>
            <h4 className="font-medium text-sm truncate">
              {nft.name || `NFT #${nft.token_id}`}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              Token ID: {nft.token_id}
            </p>
          </button>
        ))}
      </div>

      <NFTDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        nft={selectedNFT}
      />
    </>
  );
};
