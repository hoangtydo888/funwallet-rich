import { useState, useEffect, useCallback } from 'react';
import { Upload, Users, Send, AlertTriangle, CheckCircle, XCircle, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBulkTransfer, TransferItem } from '@/hooks/useBulkTransfer';
import { UserWithWallets } from '@/hooks/useAdmin';
import { COMMON_TOKENS, formatAddress, formatBalance, getBNBBalance, getTokenBalance } from '@/lib/wallet';

interface BulkTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserWithWallets[];
  adminPrivateKey: string;
  adminAddress: string;
}

export const BulkTransferDialog = ({
  open,
  onOpenChange,
  users,
  adminPrivateKey,
  adminAddress,
}: BulkTransferDialogProps) => {
  const {
    transferItems,
    setTransferItems,
    progress,
    parseCSV,
    validateItems,
    executeBulkTransfer,
    exportFailedTransfers,
  } = useBulkTransfer();

  const [selectedToken, setSelectedToken] = useState('BNB');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [uniformAmount, setUniformAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch admin balance when token changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!adminAddress) return;
      
      const token = COMMON_TOKENS.find(t => t.symbol === selectedToken);
      if (!token) return;

      try {
        let balance: string;
        if (token.address === null) {
          balance = await getBNBBalance(adminAddress);
        } else {
          balance = await getTokenBalance(token.address, adminAddress);
        }
        setTokenBalance(balance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setTokenBalance('0');
      }
    };

    fetchBalance();
  }, [adminAddress, selectedToken]);

  // Handle CSV file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const items = parseCSV(content);
      
      if (items.length > 1000) {
        toast.error('Tối đa 1000 địa chỉ mỗi lần chuyển');
        return;
      }

      const { valid, invalid } = validateItems(items);
      setTransferItems([...valid, ...invalid]);
      
      if (invalid.length > 0) {
        toast.warning(`${invalid.length} địa chỉ không hợp lệ`);
      }
    };
    reader.readAsText(file);
  }, [parseCSV, validateItems, setTransferItems]);

  // Handle user selection
  const handleUserSelect = useCallback((userId: string, walletAddress: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      const key = `${userId}:${walletAddress}`;
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        if (newSet.size >= 1000) {
          toast.error('Tối đa 1000 địa chỉ mỗi lần chuyển');
          return prev;
        }
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Select all visible users
  const handleSelectAll = useCallback(() => {
    const filteredUsers = users.filter(u => 
      u.wallets.length > 0 && 
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const allKeys: string[] = [];
    filteredUsers.forEach(u => {
      u.wallets.forEach(w => {
        allKeys.push(`${u.user_id}:${w.address}`);
      });
    });

    if (allKeys.length > 1000) {
      toast.error('Tối đa 1000 địa chỉ mỗi lần chuyển');
      return;
    }

    setSelectedUsers(new Set(allKeys));
  }, [users, searchQuery]);

  // Prepare items from selected users
  const prepareFromSelectedUsers = useCallback(() => {
    if (selectedUsers.size === 0) {
      toast.error('Vui lòng chọn ít nhất 1 user');
      return;
    }

    if (!uniformAmount || parseFloat(uniformAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const items: TransferItem[] = [];
    selectedUsers.forEach(key => {
      const [, address] = key.split(':');
      items.push({
        address,
        amount: uniformAmount,
        status: 'pending',
      });
    });

    setTransferItems(items);
    setIsConfirmStep(true);
  }, [selectedUsers, uniformAmount, setTransferItems]);

  // Calculate total amount
  const totalAmount = transferItems
    .filter(item => item.status !== 'failed' || !item.error)
    .reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);

  const validItemsCount = transferItems.filter(item => item.status === 'pending').length;

  // Execute transfer
  const handleExecute = async () => {
    if (!adminPrivateKey) {
      toast.error('Không tìm thấy private key của admin');
      return;
    }

    const pendingItems = transferItems.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      toast.error('Không có giao dịch nào để thực hiện');
      return;
    }

    // Check balance
    if (parseFloat(tokenBalance) < totalAmount) {
      toast.error('Số dư không đủ để thực hiện giao dịch');
      return;
    }

    setIsExecuting(true);

    try {
      const { results } = await executeBulkTransfer(
        adminPrivateKey,
        pendingItems,
        selectedToken,
        5, // batch size
        2000 // delay between batches
      );

      const successCount = results.filter(r => r.status === 'success').length;
      const failCount = results.filter(r => r.status === 'failed').length;

      if (failCount === 0) {
        toast.success(`Đã gửi thành công ${successCount} giao dịch!`);
      } else {
        toast.warning(`Thành công: ${successCount}, Thất bại: ${failCount}`);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi thực hiện giao dịch');
      console.error('Bulk transfer error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Export failed items
  const handleExportFailed = () => {
    const failedItems = transferItems.filter(item => item.status === 'failed');
    if (failedItems.length === 0) {
      toast.info('Không có giao dịch thất bại');
      return;
    }

    const csv = exportFailedTransfers(transferItems);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-transfers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset dialog state
  const handleClose = () => {
    if (isExecuting) {
      toast.warning('Đang thực hiện giao dịch, không thể đóng');
      return;
    }
    setTransferItems([]);
    setSelectedUsers(new Set());
    setUniformAmount('');
    setSearchQuery('');
    setIsConfirmStep(false);
    onOpenChange(false);
  };

  // Filter users by search
  const filteredUsers = users.filter(u => 
    u.wallets.length > 0 && 
    (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Chuyển Tiền Hàng Loạt
          </DialogTitle>
          <DialogDescription>
            Gửi crypto đến nhiều địa chỉ cùng lúc (tối đa 1000 địa chỉ)
          </DialogDescription>
        </DialogHeader>

        {!isConfirmStep ? (
          <>
            {/* Token Selection & Balance */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Chọn Token</Label>
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TOKENS.slice(0, 6).map(token => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        <div className="flex items-center gap-2">
                          <img src={token.logo} alt={token.symbol} className="w-5 h-5" />
                          {token.symbol}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Số dư hiện tại</Label>
                <div className="h-10 px-3 border rounded-md flex items-center bg-muted/50">
                  <span className="font-medium">{formatBalance(tokenBalance, 6)} {selectedToken}</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="csv" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full">
                <TabsTrigger value="csv" className="flex-1 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </TabsTrigger>
                <TabsTrigger value="users" className="flex-1 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Chọn Users ({selectedUsers.size})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="csv" className="flex-1 overflow-hidden flex flex-col space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium">Kéo thả file CSV hoặc click để upload</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: address,amount (mỗi dòng một địa chỉ)
                    </p>
                  </label>
                </div>

                {transferItems.length > 0 && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Preview ({transferItems.length} địa chỉ)
                      </span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {validItemsCount} hợp lệ
                        </Badge>
                        <Badge variant="outline" className="text-red-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          {transferItems.length - validItemsCount} lỗi
                        </Badge>
                      </div>
                    </div>
                    <ScrollArea className="flex-1 border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-2">#</th>
                            <th className="text-left p-2">Địa chỉ</th>
                            <th className="text-right p-2">Số tiền</th>
                            <th className="text-center p-2">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transferItems.slice(0, 100).map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 text-muted-foreground">{index + 1}</td>
                              <td className="p-2 font-mono text-xs">{formatAddress(item.address, 10)}</td>
                              <td className="p-2 text-right">{item.amount} {selectedToken}</td>
                              <td className="p-2 text-center">
                                {item.status === 'pending' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <span title={item.error}>
                                    <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {transferItems.length > 100 && (
                        <p className="text-center text-sm text-muted-foreground py-2">
                          ...và {transferItems.length - 100} địa chỉ khác
                        </p>
                      )}
                    </ScrollArea>
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsConfirmStep(true)}
                      disabled={validItemsCount === 0}
                    >
                      Tiếp tục với {validItemsCount} địa chỉ hợp lệ
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="flex-1 overflow-hidden flex flex-col space-y-4">
                <div className="space-y-2">
                  <Label>Số tiền mỗi user</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="0.01"
                      value={uniformAmount}
                      onChange={(e) => setUniformAmount(e.target.value)}
                    />
                    <span className="flex items-center px-3 bg-muted rounded-md text-sm">
                      {selectedToken}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Tìm kiếm user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Chọn tất cả
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedUsers(new Set())}>
                    Bỏ chọn
                  </Button>
                </div>

                <ScrollArea className="flex-1 border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="w-10 p-2"></th>
                        <th className="text-left p-2">User</th>
                        <th className="text-left p-2">Địa chỉ ví</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        user.wallets.map(wallet => (
                          <tr key={`${user.user_id}-${wallet.id}`} className="border-t hover:bg-muted/30">
                            <td className="p-2 text-center">
                              <Checkbox
                                checked={selectedUsers.has(`${user.user_id}:${wallet.address}`)}
                                onCheckedChange={() => handleUserSelect(user.user_id, wallet.address)}
                              />
                            </td>
                            <td className="p-2">
                              <div>
                                <p className="font-medium">{user.display_name || 'Không tên'}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </td>
                            <td className="p-2 font-mono text-xs">
                              {formatAddress(wallet.address, 10)}
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>

                <Button 
                  onClick={prepareFromSelectedUsers}
                  disabled={selectedUsers.size === 0 || !uniformAmount}
                >
                  Tiếp tục với {selectedUsers.size} địa chỉ
                </Button>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Confirmation Step */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Xác nhận giao dịch</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bạn sắp gửi <strong>{totalAmount.toFixed(6)} {selectedToken}</strong> đến{' '}
                    <strong>{validItemsCount}</strong> địa chỉ. Giao dịch không thể hoàn tác sau khi gửi.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-2xl font-bold">{validItemsCount}</p>
                <p className="text-xs text-muted-foreground">Địa chỉ</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-2xl font-bold">{totalAmount.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">Tổng {selectedToken}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-2xl font-bold">~{(validItemsCount * 0.0005).toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">Gas (BNB)</p>
              </div>
            </div>

            {/* Progress */}
            {progress.isRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Đang xử lý...</span>
                  <span>{progress.processed}/{progress.total}</span>
                </div>
                <Progress value={(progress.processed / progress.total) * 100} />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="text-green-600">Thành công: {progress.successful}</span>
                  <span className="text-red-600">Thất bại: {progress.failed}</span>
                </div>
              </div>
            )}

            {/* Results */}
            {!progress.isRunning && progress.processed > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Kết quả</span>
                  {progress.failed > 0 && (
                    <Button variant="outline" size="sm" onClick={handleExportFailed}>
                      <Download className="h-4 w-4 mr-1" />
                      Export lỗi
                    </Button>
                  )}
                </div>
                <ScrollArea className="flex-1 border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Địa chỉ</th>
                        <th className="text-right p-2">Số tiền</th>
                        <th className="text-center p-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferItems.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2 font-mono text-xs">{formatAddress(item.address, 10)}</td>
                          <td className="p-2 text-right">{item.amount}</td>
                          <td className="p-2 text-center">
                            {item.status === 'success' ? (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Thành công
                              </Badge>
                            ) : item.status === 'failed' ? (
                              <Badge variant="outline" className="text-red-600">
                                <XCircle className="h-3 w-3 mr-1" />
                                Thất bại
                              </Badge>
                            ) : item.status === 'processing' ? (
                              <Badge variant="outline">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Đang gửi
                              </Badge>
                            ) : (
                              <Badge variant="outline">Chờ</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsConfirmStep(false)}
                disabled={isExecuting}
              >
                Quay lại
              </Button>
              <Button
                className="flex-1"
                onClick={handleExecute}
                disabled={isExecuting || progress.processed > 0}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang gửi...
                  </>
                ) : progress.processed > 0 ? (
                  'Hoàn thành'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Xác nhận gửi {validItemsCount} giao dịch
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
