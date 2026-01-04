import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle, Clock, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Reward } from '@/hooks/useAdmin';

interface RewardsTableProps {
  rewards: Reward[];
  onUpdateStatus: (rewardId: string, status: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 10;

const statusConfig = {
  pending: { label: 'Chờ gửi', icon: Clock, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  sent: { label: 'Đã gửi', icon: Send, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  claimed: { label: 'Đã nhận', icon: CheckCircle, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
};

export const RewardsTable = ({ rewards, onUpdateStatus }: RewardsTableProps) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRewards = rewards.filter((reward) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      reward.user_email?.toLowerCase().includes(searchLower) ||
      reward.user_name?.toLowerCase().includes(searchLower) ||
      reward.wallet_address.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || reward.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRewards.length / ITEMS_PER_PAGE);
  const paginatedRewards = filteredRewards.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleStatusChange = async (rewardId: string, newStatus: string) => {
    await onUpdateStatus(rewardId, newStatus);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo email, tên, địa chỉ ví..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Chờ gửi</SelectItem>
            <SelectItem value="sent">Đã gửi</SelectItem>
            <SelectItem value="claimed">Đã nhận</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">Địa chỉ ví</TableHead>
              <TableHead className="font-semibold">Phần thưởng</TableHead>
              <TableHead className="font-semibold">Ghi chú</TableHead>
              <TableHead className="font-semibold">Ngày tạo</TableHead>
              <TableHead className="font-semibold text-center">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRewards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chưa có phần thưởng nào
                </TableCell>
              </TableRow>
            ) : (
              paginatedRewards.map((reward) => {
                const status = statusConfig[reward.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = status.icon;
                
                return (
                  <TableRow key={reward.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="font-medium">{reward.user_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{reward.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {truncateAddress(reward.wallet_address)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-primary">
                        {reward.reward_amount} {reward.reward_symbol}
                      </span>
                      <p className="text-xs text-muted-foreground capitalize">{reward.reward_type}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {reward.notes || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(reward.created_at)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={reward.status}
                        onValueChange={(value) => handleStatusChange(reward.id, value)}
                      >
                        <SelectTrigger className={`w-32 h-8 text-xs ${status.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Chờ gửi</SelectItem>
                          <SelectItem value="sent">Đã gửi</SelectItem>
                          <SelectItem value="claimed">Đã nhận</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {(page - 1) * ITEMS_PER_PAGE + 1} -{' '}
            {Math.min(page * ITEMS_PER_PAGE, filteredRewards.length)} / {filteredRewards.length} rewards
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
