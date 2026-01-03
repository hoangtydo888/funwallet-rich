import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Send } from "lucide-react";
import { BSC_MAINNET, formatAddress } from "@/lib/wallet";
import type { NFTItem } from "@/hooks/useNFT";

interface NFTDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nft: NFTItem | null;
  onTransfer?: (nft: NFTItem) => void;
}

export const NFTDetailDialog = ({ open, onOpenChange, nft, onTransfer }: NFTDetailDialogProps) => {
  if (!nft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{nft.name || `NFT #${nft.token_id}`}</DialogTitle>
          <DialogDescription>Chi tiết NFT của bạn</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* NFT Image */}
          <div className="aspect-square rounded-xl overflow-hidden bg-muted">
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt={nft.name || "NFT"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                🖼️
              </div>
            )}
          </div>

          {/* Description */}
          {nft.description && (
            <p className="text-sm text-muted-foreground">{nft.description}</p>
          )}

          {/* Details */}
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Contract</span>
              <a
                href={`${BSC_MAINNET.explorer}/address/${nft.contract_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-primary hover:underline"
              >
                {formatAddress(nft.contract_address)}
              </a>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Token ID</span>
              <span className="text-sm font-mono">{nft.token_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Chain</span>
              <span className="text-sm">BNB Smart Chain</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {onTransfer && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onTransfer(nft);
                  onOpenChange(false);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Chuyển NFT
              </Button>
            )}
            <Button variant="outline" className="flex-1" asChild>
              <a
                href={`${BSC_MAINNET.explorer}/token/${nft.contract_address}?a=${nft.token_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                BscScan
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
