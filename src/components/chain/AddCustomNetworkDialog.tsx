import { useState } from "react";
import { ethers } from "ethers";
import { useChain } from "@/contexts/ChainContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCustomNetworkDialog = ({ open, onOpenChange }: Props) => {
  const { addCustomChain } = useChain();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    rpcUrl: "",
    chainId: "",
    symbol: "",
    explorer: "",
  });

  const reset = () =>
    setForm({ name: "", shortName: "", rpcUrl: "", chainId: "", symbol: "", explorer: "" });

  const handleSubmit = async () => {
    if (!form.name || !form.rpcUrl || !form.chainId || !form.symbol) {
      toast({ title: "Vui lòng điền đầy đủ", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Validate RPC by fetching chainId
      const provider = new ethers.JsonRpcProvider(form.rpcUrl);
      const network = await provider.getNetwork();
      const declaredChainId = parseInt(form.chainId);
      if (Number(network.chainId) !== declaredChainId) {
        toast({
          title: "Chain ID không khớp",
          description: `RPC báo chain ID = ${network.chainId}, bạn nhập ${declaredChainId}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const result = await addCustomChain({
        chainId: declaredChainId,
        name: form.name,
        shortName: form.shortName || form.symbol,
        rpcUrl: form.rpcUrl,
        symbol: form.symbol,
        explorer: form.explorer,
        logo: "/tokens/default.svg",
        color: "#00CED1",
        isTestnet: false,
      });
      if (!result.success) {
        toast({ title: "Không thể thêm mạng", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Đã thêm mạng mới ✨", description: form.name });
        reset();
        onOpenChange(false);
      }
    } catch (e) {
      toast({
        title: "RPC không hợp lệ",
        description: e instanceof Error ? e.message : "Không kết nối được RPC",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm mạng tùy chỉnh</DialogTitle>
          <DialogDescription>Nhập thông tin mạng EVM bất kỳ</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label>Tên mạng *</Label>
            <Input
              placeholder="VD: Custom Chain"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Tên viết tắt</Label>
            <Input
              placeholder="VD: CUSTOM"
              value={form.shortName}
              onChange={(e) => setForm({ ...form, shortName: e.target.value })}
            />
          </div>
          <div>
            <Label>RPC URL *</Label>
            <Input
              placeholder="https://..."
              value={form.rpcUrl}
              onChange={(e) => setForm({ ...form, rpcUrl: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Chain ID *</Label>
              <Input
                type="number"
                placeholder="1"
                value={form.chainId}
                onChange={(e) => setForm({ ...form, chainId: e.target.value })}
              />
            </div>
            <div>
              <Label>Symbol *</Label>
              <Input
                placeholder="ETH"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Explorer URL</Label>
            <Input
              placeholder="https://..."
              value={form.explorer}
              onChange={(e) => setForm({ ...form, explorer: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Xác nhận & Thêm
        </Button>
      </DialogContent>
    </Dialog>
  );
};
