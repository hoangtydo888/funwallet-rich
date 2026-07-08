import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ScannedToken {
  symbol: string;
  name: string;
  address: string | null;
  decimals: number;
  balance: string;
}

export const useTokenScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [tokens, setTokens] = useState<ScannedToken[]>([]);

  const scan = useCallback(
    async (address: string, chainId: number, rpcUrl?: string) => {
      if (!address) return [];
      setScanning(true);
      try {
        const { data, error } = await supabase.functions.invoke("token-scanner", {
          body: { address, chainId, rpcUrl },
        });
        if (error) throw error;
        const found: ScannedToken[] = data?.tokens || [];
        setTokens(found);
        toast({
          title: `Đã quét xong`,
          description: `Tìm thấy ${found.length} token có số dư`,
        });
        return found;
      } catch (e) {
        toast({
          title: "Quét thất bại",
          description: e instanceof Error ? e.message : "Lỗi không xác định",
          variant: "destructive",
        });
        return [];
      } finally {
        setScanning(false);
      }
    },
    [],
  );

  return { scan, scanning, tokens };
};
