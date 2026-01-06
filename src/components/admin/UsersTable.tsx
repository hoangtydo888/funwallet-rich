import { useState } from 'react';
import { Search, Gift, Copy, Check, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    const headers = ['Display Name', 'Email', 'Ngay dang ky', 'So vi', 'Dia chi vi'];
    const rows = filteredUsers.map((user) => [
      user.display_name || 'N/A',
      user.email || 'N/A',
      formatDate(user.created_at),
      user.wallets.length.toString(),
      user.wallets.map((w) => w.address).join('; ') || 'Chua co',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    // Add BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `funwallet-users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Đã xuất file CSV');
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');

    // Header
    doc.setFontSize(18);
    doc.text('FUN Wallet - Danh sach Users', 14, 20);
    doc.setFontSize(10);
    doc.text(`Xuat ngay: ${new Date().toLocaleDateString('vi-VN')}`, 14, 28);
    doc.text(`Tong so: ${filteredUsers.length} users`, 14, 34);

    // Table data
    const tableData = filteredUsers.map((user) => [
      user.display_name || 'N/A',
      user.email || 'N/A',
      formatDate(user.created_at),
      user.wallets.length.toString(),
      user.wallets.map((w) => w.address).join('\n') || 'Chua co',
    ]);

    autoTable(doc, {
      head: [['Ten hien thi', 'Email', 'Ngay dang ky', 'So vi', 'Dia chi vi']],
      body: tableData,
      startY: 40,
      headStyles: {
        fillColor: [0, 255, 127],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        4: { cellWidth: 80 },
      },
    });

    doc.save(`funwallet-users-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Đã xuất file PDF');
  };

  const exportTXT = () => {
    const separator = '='.repeat(120);
    const lines: string[] = [];

    // Sắp xếp users theo ngày đăng ký CŨ NHẤT trước (ascending)
    const sortedUsers = [...filteredUsers].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Header
    lines.push(separator);
    lines.push('FUN WALLET - DANH SÁCH USERS');
    lines.push(`Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`);
    lines.push(`Tổng số: ${sortedUsers.length} users`);
    lines.push(separator);
    lines.push('');

    // Table header
    lines.push('-'.repeat(120));
    lines.push(
      'STT'.padEnd(6) +
      'Tên hiển thị'.padEnd(25) +
      'Email'.padEnd(35) +
      'Ngày đăng ký'.padEnd(15) +
      'Số ví'.padEnd(8) +
      'Địa chỉ ví'
    );
    lines.push('-'.repeat(120));

    // Data rows với khoảng cách
    sortedUsers.forEach((user, index) => {
      const walletAddresses = user.wallets.map((w) => w.address).join('\n' + ' '.repeat(89)) || 'Chưa có';
      lines.push(
        (index + 1).toString().padEnd(6) +
        (user.display_name || 'N/A').substring(0, 23).padEnd(25) +
        (user.email || 'N/A').substring(0, 33).padEnd(35) +
        formatDate(user.created_at).padEnd(15) +
        user.wallets.length.toString().padEnd(8) +
        walletAddresses
      );
      lines.push(''); // Thêm dòng trống sau mỗi user
    });

    lines.push('-'.repeat(120));
    lines.push('');
    lines.push(`© ${new Date().getFullYear()} FUN Wallet - All rights reserved`);

    const content = lines.join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `funwallet-users-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast.success('Đã xuất file TXT');
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
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={exportPDF} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={exportTXT} variant="outline" size="sm">
            <FileType className="h-4 w-4 mr-2" />
            Export TXT
          </Button>
        </div>
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
