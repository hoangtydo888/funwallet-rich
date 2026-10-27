import {verifyErc721Ownership} from '@/lib/nftOwnership';
import { createSessionSigner } from "@/lib/guardedSigner";
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

export interface MultiChainNFT {
  contractAddress: string;
  tokenId: string;
  standard: "ERC721" | "ERC1155";
  name: string;
  image: string;
  collection: string;
  chainId: number;
  balance: string;
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
  const [multiChainNfts, setMultiChainNfts] = useState<MultiChainNFT[]>([]);
  const [mcScanning, setMcScanning] = useState(false);
  const [mcUnsupported, setMcUnsupported] = useState<number[]>([]);

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
    if (!user || !walletId || !walletAddress) return null;

    try {
      await verifyErc721Ownership(getProvider(),contractAddress,tokenId,walletAddress);
      const { data, error } = await supabase
        .from("nft_collections")
        .insert({
          user_id: user.id,
          wallet_id: walletId,
          contract_address: contractAddress.toLowerCase(),
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
      toast({title:"Chưa thêm được NFT",description:error instanceof Error?error.message:"Không xác minh được quyền sở hữu",variant:"destructive"});
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

  // Minting requires a real, reviewed contract. Never invent a token ID.
  const mintFunBadge = async (_key:string,_badge:"gold"|"silver"|"bronze"):Promise<{success:boolean;tokenId?:string;error?:string}> => ({success:false,error:"Mint FUN Badge chưa khả dụng: chưa cấu hình hợp đồng on-chain được thẩm định."});

  // Transfer NFT
  const transferNFT = async (
    privateKey: string,
    contractAddress: string,
    tokenId: string,
    toAddress: string
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    if (!walletAddress || !walletId || !user) {
      return { success: false, error: "Đăng nhập và chọn ví trước khi chuyển NFT" };
    }

    try {
      const provider = getProvider();
      const wallet = createSessionSigner(privateKey, provider);
      if(wallet.address.toLowerCase()!==walletAddress.toLowerCase())throw Error('Khóa ký không khớp ví đang chọn');
      await verifyErc721Ownership(provider,contractAddress,tokenId,walletAddress);
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, wallet);

      const tx = await contract.safeTransferFrom(walletAddress, toAddress, tokenId);
      const receipt=await tx.wait();
      if(!receipt||receipt.status!==1)throw Error("Giao dịch NFT chưa được xác nhận thành công");

      // Remove from database
      await supabase
        .from("nft_collections")
        .delete()
        .eq("user_id",user!.id)
        .eq("wallet_id",walletId!)
        .eq("contract_address", contractAddress.toLowerCase())
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

  // Multi-chain NFT scan via edge function
  const scanMultiChain = useCallback(
    async (chainIds: number[]): Promise<MultiChainNFT[]> => {
      if (!walletAddress) return [];
      setMcScanning(true);
      try {
        const { data, error } = await supabase.functions.invoke("nft-scanner", {
          body: { address: walletAddress, chainIds },
        });
        if (error) throw error;
        const nfts: MultiChainNFT[] = data?.nfts ?? [];
        setMultiChainNfts(nfts);
        setMcUnsupported(data?.unsupportedChains ?? []);
        return nfts;
      } catch (e) {
        console.error("scanMultiChain error:", e);
        toast({
          title: "Không thể quét NFT",
          description: e instanceof Error ? e.message : "Lỗi không xác định",
          variant: "destructive",
        });
        return [];
      } finally {
        setMcScanning(false);
      }
    },
    [walletAddress],
  );

  return {
    nfts,
    loading,
    fetchNFTs,
    addNFT,
    fetchNFTMetadata,
    mintFunBadge,
    transferNFT,
    importNFT,
    multiChainNfts,
    mcScanning,
    mcUnsupported,
    scanMultiChain,
  };
};
