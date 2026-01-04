import { useState } from 'react';
import { Search, Gift, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { UserWithWallets } from '@/hooks/useAdmin';
import { toast } from 'sonner';

interface UsersTableProps {
  users: UserWithWallets[];
  onRewardUser: (user: UserWithWallets) => void;
}

const ITEMS_PER_PAGE = 10;

export const UsersTable = ({ users, onRewardUser }: UsersTableProps) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.display_name?.toLowerCase().includes(searchLower) ||
      user.wallets.some((w) => w.address.toLowerCase().includes(searchLower))
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Đã copy địa chỉ ví');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const exportCSV = () => {
    const headers = ['Display Name', 'Email', 'Ngày đăng ký', 'Số ví', 'Địa chỉ ví'];
    const rows = filteredUsers.map((user) => [
      user.display_name || 'N/A',
      user.email || 'N/A',
      formatDate(user.created_at),
      user.wallets.length.toString(),
      user.wallets.map((w) => w.address).join('; ') || 'Chưa có',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `funwallet-users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Đã xuất file CSV');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email, địa chỉ ví..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm">
          📥 Export CSV
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Tên hiển thị</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Ngày đăng ký</TableHead>
              <TableHead className="font-semibold text-center">Số ví</TableHead>
              <TableHead className="font-semibold">Địa chỉ ví</TableHead>
              <TableHead className="font-semibold text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy user nào
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    {user.display_name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.wallets.length > 0 ? 'default' : 'secondary'}>
                      {user.wallets.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.wallets.length > 0 ? (
                      <div className="space-y-1">
                        {user.wallets.slice(0, 2).map((wallet) => (
                          <div key={wallet.id} className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {truncateAddress(wallet.address)}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyAddress(wallet.address)}
                            >
                              {copiedAddress === wallet.address ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ))}
                        {user.wallets.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{user.wallets.length - 2} ví khác
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Chưa có ví</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRewardUser(user)}
                      disabled={user.wallets.length === 0}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Gift className="h-4 w-4 mr-1" />
                      Thưởng
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {(page - 1) * ITEMS_PER_PAGE + 1} -{' '}
            {Math.min(page * ITEMS_PER_PAGE, filteredUsers.length)} / {filteredUsers.length} users
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
