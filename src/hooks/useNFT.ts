import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ethers } from "ethers";
import { getProvider, BSC_MAINNET } from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";

export interface NFTItem {
  id: string;
  contract_address: string;
  token_id: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  metadata_url: string | null;
  chain: string;
}

// ERC-721 ABI for NFT operations
const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
];

// FUN Badge Contract (placeholder - deploy your own)
const FUN_BADGE_CONTRACT = "0x0000000000000000000000000000000000000000";

export const useNFT = (walletAddress: string | undefined, walletId: string | undefined) => {
  const { user } = useAuth();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch NFTs from database
  const fetchNFTs = useCallback(async () => {
    if (!user || !walletId) {
      setNfts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("nft_collections")
        .select("*")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNfts(data || []);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    } finally {
      setLoading(false);
    }
  }, [user, walletId]);

  // Add NFT to collection
  const addNFT = async (
    contractAddress: string,
    tokenId: string,
    metadata?: { name?: string; description?: string; image_url?: string; metadata_url?: string }
  ) => {
    if (!user || !walletId) return null;

    try {
      const { data, error } = await supabase
        .from("nft_collections")
        .insert({
          user_id: user.id,
          wallet_id: walletId,
          contract_address: contractAddress,
          token_id: tokenId,
          name: metadata?.name || null,
          description: metadata?.description || null,
          image_url: metadata?.image_url || null,
          metadata_url: metadata?.metadata_url || null,
          chain: "bsc",
        })
        .select()
        .single();

      if (error) throw error;
      await fetchNFTs();
      return data;
    } catch (error) {
      console.error("Error adding NFT:", error);
      return null;
    }
  };

  // Fetch NFT metadata from contract
  const fetchNFTMetadata = async (contractAddress: string, tokenId: string) => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);

      const [name, tokenURI] = await Promise.all([
        contract.name().catch(() => "Unknown"),
        contract.tokenURI(tokenId).catch(() => null),
      ]);

      let metadata: { name?: string; description?: string; image?: string } = {};

      if (tokenURI) {
        // Handle IPFS URLs
        const fetchURL = tokenURI.startsWith("ipfs://")
          ? tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/")
          : tokenURI;

        try {
          const response = await fetch(fetchURL);
          metadata = await response.json();
        } catch {
          console.log("Could not fetch metadata");
        }
      }

      return {
        name: metadata.name || `${name} #${tokenId}`,
        description: metadata.description || "",
        image_url: metadata.image?.startsWith("ipfs://")
          ? metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/")
          : metadata.image || "",
        metadata_url: tokenURI || "",
      };
    } catch (error) {
      console.error("Error fetching NFT metadata:", error);
      return null;
    }
  };

  // Mint FUN Badge (simulated - in production connect to actual contract)
  const mintFunBadge = async (
    privateKey: string,
    badgeType: "gold" | "silver" | "bronze"
  ): Promise<{ success: boolean; tokenId?: string; error?: string }> => {
    if (!user || !walletAddress || !walletId) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      // Simulate minting process
      toast({
        title: "Đang mint...",
        description: "Vui lòng chờ trong giây lát",
      });

      // In production: call actual smart contract
      // const provider = getProvider();
      // const wallet = new ethers.Wallet(privateKey, provider);
      // const contract = new ethers.Contract(FUN_BADGE_CONTRACT, ..., wallet);
      // const tx = await contract.mint(badgeType);
      // await tx.wait();

      // Simulated token ID
      const tokenId = Math.floor(Math.random() * 10000).toString();

      // Add to database
      const badgeNames = {
        gold: "FUN Gold Badge",
        silver: "FUN Silver Badge",
        bronze: "FUN Bronze Badge",
      };

      const badgeImages = {
        gold: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
        silver: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400&h=400&fit=crop",
        bronze: "https://images.unsplash.com/photo-1614680376408-16a7b8d96d1e?w=400&h=400&fit=crop",
      };

      await addNFT(FUN_BADGE_CONTRACT, tokenId, {
        name: badgeNames[badgeType],
        description: `Official FUN ${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} Badge - Exclusive member of FUN Ecosystem`,
        image_url: badgeImages[badgeType],
      });

      toast({
        title: "Mint thành công! 🎉",
        description: `Bạn đã sở hữu ${badgeNames[badgeType]}`,
      });

      return { success: true, tokenId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Mint failed";
      toast({
        title: "Mint thất bại",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Transfer NFT
  const transferNFT = async (
    privateKey: string,
    contractAddress: string,
    tokenId: string,
    toAddress: string
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    if (!walletAddress) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      const provider = getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, wallet);

      const tx = await contract.safeTransferFrom(walletAddress, toAddress, tokenId);
      await tx.wait();

      // Remove from database
      await supabase
        .from("nft_collections")
        .delete()
        .eq("contract_address", contractAddress)
        .eq("token_id", tokenId);

      await fetchNFTs();

      toast({
        title: "Chuyển NFT thành công!",
        description: `NFT đã được gửi đến ${toAddress.slice(0, 8)}...`,
      });

      return { success: true, hash: tx.hash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Transfer failed";
      toast({
        title: "Chuyển NFT thất bại",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  // Import NFT from contract
  const importNFT = async (
    contractAddress: string,
    tokenId: string
  ): Promise<{ name?: string; image_url?: string } | null> => {
    const metadata = await fetchNFTMetadata(contractAddress, tokenId);
    if (!metadata) return null;

    const result = await addNFT(contractAddress, tokenId, metadata);
    if (result) {
      return { name: metadata.name, image_url: metadata.image_url };
    }
    return null;
  };

  return {
    nfts,
    loading,
    fetchNFTs,
    addNFT,
    fetchNFTMetadata,
    mintFunBadge,
    transferNFT,
    importNFT,
  };
};
