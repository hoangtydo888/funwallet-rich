import { useState } from 'react';
import { Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserWithWallets } from '@/hooks/useAdmin';
import { toast } from 'sonner';

interface CreateRewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithWallets | null;
  onCreateReward: (data: {
    user_id: string;
    wallet_address: string;
    reward_type: string;
    reward_amount: string;
    reward_symbol?: string;
    notes?: string;
  }) => Promise<{ error: Error | null }>;
}

const rewardTypes = [
  { value: 'token', label: 'Token' },
  { value: 'nft', label: 'NFT' },
  { value: 'points', label: 'Points' },
];

const commonTokens = ['CAMLY', 'BNB', 'USDT', 'USDC', 'ETH'];

export const CreateRewardDialog = ({
  open,
  onOpenChange,
  user,
  onCreateReward,
}: CreateRewardDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    wallet_address: '',
    reward_type: 'token',
    reward_amount: '',
    reward_symbol: 'CAMLY',
    notes: '',
  });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && user && user.wallets.length > 0) {
      setFormData({
        wallet_address: user.wallets[0].address,
        reward_type: 'token',
        reward_amount: '',
        reward_symbol: 'CAMLY',
        notes: '',
      });
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.reward_amount || parseFloat(formData.reward_amount) <= 0) {
      toast.error('Vui lòng nhập số lượng thưởng hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const { error } = await onCreateReward({
        user_id: user.user_id,
        wallet_address: formData.wallet_address,
        reward_type: formData.reward_type,
        reward_amount: formData.reward_amount,
        reward_symbol: formData.reward_symbol || undefined,
        notes: formData.notes || undefined,
      });

      if (error) {
        toast.error('Không thể tạo phần thưởng: ' + error.message);
      } else {
        toast.success('Đã tạo phần thưởng thành công!');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Tặng thưởng cho User
          </DialogTitle>
          <DialogDescription>
            Tạo phần thưởng cho <strong>{user.display_name || user.email}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Địa chỉ ví nhận</Label>
            <Select
              value={formData.wallet_address}
              onValueChange={(value) => setFormData({ ...formData, wallet_address: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn ví" />
              </SelectTrigger>
              <SelectContent>
                {user.wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.address}>
                    {wallet.name} - {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loại thưởng</Label>
              <Select
                value={formData.reward_type}
                onValueChange={(value) => setFormData({ ...formData, reward_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rewardTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Token Symbol</Label>
              <Select
                value={formData.reward_symbol}
                onValueChange={(value) => setFormData({ ...formData, reward_symbol: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commonTokens.map((token) => (
                    <SelectItem key={token} value={token}>
                      {token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Số lượng</Label>
            <Input
              type="number"
              placeholder="Nhập số lượng..."
              value={formData.reward_amount}
              onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
              min="0"
              step="any"
            />
          </div>

          <div className="space-y-2">
            <Label>Ghi chú (tùy chọn)</Label>
            <Textarea
              placeholder="Lý do tặng thưởng, ghi chú..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo thưởng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
