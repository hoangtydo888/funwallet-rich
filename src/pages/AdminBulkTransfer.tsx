import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, ShieldCheck, Send, Upload, Users, History, CheckCircle2, XCircle, Clock, FileText, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin, UserWithWallets } from '@/hooks/useAdmin';
import { useBulkTransfer, TransferItem, BulkTransfer } from '@/hooks/useBulkTransfer';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const AdminBulkTransfer = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, loading, users } = useAdmin();
  const { parseCSV, validateItems, executeBulkTransfer, getBalance, fetchBulkTransfers, bulkTransfers, progress, exportFailedTransfers } = useBulkTransfer();
  
  const [adminPrivateKey, setAdminPrivateKey] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [selectedToken, setSelectedToken] = useState('BNB');
  const [adminBalance, setAdminBalance] = useState('0');
  
  // Transfer state
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [uniformAmount, setUniformAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<TransferItem[] | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/dashboard');
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    fetchBulkTransfers();
  }, []);

  useEffect(() => {
    if (adminPrivateKey && adminPrivateKey.length === 66) {
      getBalance(adminPrivateKey, selectedToken).then(setAdminBalance);
    }
  }, [adminPrivateKey, selectedToken]);

  const handlePrivateKeyChange = (pk: string) => {
    setAdminPrivateKey(pk);
    if (pk && pk.length === 66) {
      import('ethers').then(({ ethers }) => {
        try {
          const wallet = new ethers.Wallet(pk);
          setAdminAddress(wallet.address);
        } catch {
          setAdminAddress('');
        }
      });
    } else {
      setAdminAddress('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const items = parseCSV(content);
      const { valid, invalid } = validateItems(items);
      
      if (invalid.length > 0) {
        toast.warning(`${invalid.length} địa chỉ không hợp lệ đã bị loại bỏ`);
      }
      
      setTransferItems(valid);
      toast.success(`Đã load ${valid.length} địa chỉ từ file CSV`);
    };
    reader.readAsText(file);
  };

  const getWalletAddress = (u: UserWithWallets): string | null => {
    return u.wallets.length > 0 ? u.wallets[0].address : null;
  };

  const handleUserSelect = (address: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const filtered = filteredUsers.map(u => getWalletAddress(u)).filter(Boolean) as string[];
    if (selectedUsers.size === filtered.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filtered));
    }
  };

  const prepareFromSelectedUsers = () => {
    if (!uniformAmount || parseFloat(uniformAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    
    const items: TransferItem[] = Array.from(selectedUsers).map(address => ({
      address,
      amount: uniformAmount,
      status: 'pending' as const
    }));
    
    setTransferItems(items);
    toast.success(`Đã chuẩn bị ${items.length} địa chỉ`);
  };

  const handleExecute = async () => {
    if (!adminPrivateKey || transferItems.length === 0) return;
    
    setIsExecuting(true);
    setExecutionResults(null);
    
    try {
      const { results } = await executeBulkTransfer(
        adminPrivateKey,
        transferItems,
        selectedToken,
        10,
        500
      );
      
      setExecutionResults(results);
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;
      
      if (failed === 0) {
        toast.success(`Hoàn thành! ${successful} giao dịch thành công`);
      } else {
        toast.warning(`Hoàn thành với ${failed} lỗi. ${successful} thành công`);
      }
      
      fetchBulkTransfers();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi thực hiện chuyển tiền');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportFailed = () => {
    if (!executionResults) return;
    const failed = executionResults.filter(r => r.status === 'failed');
    if (failed.length === 0) {
      toast.info('Không có giao dịch thất bại');
      return;
    }
    const csv = exportFailedTransfers(failed);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-transfers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setTransferItems([]);
    setSelectedUsers(new Set());
    setUniformAmount('');
    setExecutionResults(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredUsers = users.filter(u => {
    const addr = getWalletAddress(u);
    return addr && 
      (u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       addr.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const totalAmount = transferItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Hoàn thành</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Một phần</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Thất bại</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Đang xử lý</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Chờ</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Send className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Chuyển Tiền Hàng Loạt</h1>
              <p className="text-xs text-muted-foreground">Tối đa 1000 địa chỉ mỗi lần</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Admin
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Wallet Config Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Cấu hình Ví Admin
            </CardTitle>
            <CardDescription>
              Private key chỉ được lưu trong session và không gửi đến server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="admin-pk">Private Key</Label>
                <div className="relative">
                  <Input
                    id="admin-pk"
                    type={showPrivateKey ? 'text' : 'password'}
                    placeholder="0x..."
                    value={adminPrivateKey}
                    onChange={(e) => handlePrivateKeyChange(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ ví</Label>
                <div className="h-10 px-3 border rounded-md flex items-center bg-muted/50 text-sm">
                  {adminAddress ? (
                    <span className="font-mono">{adminAddress.slice(0, 10)}...{adminAddress.slice(-8)}</span>
                  ) : (
                    <span className="text-muted-foreground">Chưa có</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Token</Label>
                <select
                  className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                >
                  <option value="BNB">BNB</option>
                  <option value="CAMLY">CAMLY</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Số dư</Label>
                <div className="h-10 px-3 border rounded-md flex items-center bg-muted/50 text-sm font-medium">
                  {parseFloat(adminBalance).toFixed(4)} {selectedToken}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nhập danh sách địa chỉ</CardTitle>
                <CardDescription>Upload file CSV hoặc chọn từ danh sách users</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="csv" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="csv" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload CSV
                    </TabsTrigger>
                    <TabsTrigger value="users" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Chọn Users
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="csv" className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">Kéo thả file CSV hoặc click để upload</p>
                        <p className="text-sm text-muted-foreground">Format: address,amount (mỗi dòng 1 địa chỉ)</p>
                      </label>
                    </div>
                  </TabsContent>

                  <TabsContent value="users" className="space-y-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>Số tiền mỗi người ({selectedToken})</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0.01"
                          value={uniformAmount}
                          onChange={(e) => setUniformAmount(e.target.value)}
                        />
                      </div>
                      <Button onClick={prepareFromSelectedUsers} disabled={selectedUsers.size === 0 || !uniformAmount}>
                        Xác nhận ({selectedUsers.size})
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Input
                          placeholder="Tìm kiếm user..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button variant="outline" size="sm" onClick={handleSelectAll}>
                          {selectedUsers.size === filteredUsers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-[300px] border rounded-lg">
                        <div className="p-4 space-y-2">
                          {filteredUsers.map((u) => {
                            const addr = getWalletAddress(u);
                            if (!addr) return null;
                            return (
                              <div
                                key={u.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                  selectedUsers.has(addr) 
                                    ? 'bg-primary/10 border-primary/30' 
                                    : 'bg-muted/30 hover:bg-muted/50'
                                }`}
                                onClick={() => handleUserSelect(addr)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{u.display_name || 'Chưa đặt tên'}</p>
                                    <p className="text-sm text-muted-foreground">{u.email}</p>
                                  </div>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {addr.slice(0, 8)}...{addr.slice(-6)}
                                  </code>
                                </div>
                              </div>
                            );
                          })}
                          {filteredUsers.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">
                              Không tìm thấy user nào có ví
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Transfer Items Preview */}
            {transferItems.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Danh sách chuyển tiền ({transferItems.length})</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      Xóa tất cả
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {transferItems.slice(0, 50).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                          <code className="text-sm">{item.address.slice(0, 16)}...{item.address.slice(-8)}</code>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.amount} {selectedToken}</span>
                            {item.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {item.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          </div>
                        </div>
                      ))}
                      {transferItems.length > 50 && (
                        <p className="text-center text-muted-foreground py-2">
                          ...và {transferItems.length - 50} địa chỉ khác
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Summary & Execute */}
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Tóm tắt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số địa chỉ</span>
                  <span className="font-medium">{transferItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng tiền</span>
                  <span className="font-medium">{totalAmount.toFixed(4)} {selectedToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí gas ước tính</span>
                  <span className="font-medium">~{(transferItems.length * 0.0003).toFixed(4)} BNB</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Tổng cộng</span>
                  <span className="font-bold">{(totalAmount + transferItems.length * 0.0003).toFixed(4)}</span>
                </div>
                
                {progress && progress.isRunning && (
                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Tiến độ</span>
                      <span>{progress.processed}/{progress.total}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleExecute}
                  disabled={!adminPrivateKey || transferItems.length === 0 || isExecuting}
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Thực hiện chuyển tiền
                    </>
                  )}
                </Button>

                {executionResults && (
                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <Badge className="bg-green-500/20 text-green-500">
                        ✓ {executionResults.filter(r => r.status === 'success').length}
                      </Badge>
                      <Badge className="bg-red-500/20 text-red-500">
                        ✗ {executionResults.filter(r => r.status === 'failed').length}
                      </Badge>
                    </div>
                    {executionResults.some(r => r.status === 'failed') && (
                      <Button variant="outline" size="sm" className="w-full" onClick={handleExportFailed}>
                        Export danh sách thất bại
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Lịch sử gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {bulkTransfers.length > 0 ? (
                      bulkTransfers.slice(0, 10).map((transfer) => (
                        <div key={transfer.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{transfer.token_symbol}</span>
                            {getStatusBadge(transfer.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transfer.total_recipients} địa chỉ • {parseFloat(transfer.total_amount).toFixed(4)} {transfer.token_symbol}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(transfer.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </div>
                          {(transfer.successful_count !== null || transfer.failed_count !== null) && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-green-500">✓ {transfer.successful_count || 0}</span>
                              <span className="text-red-500">✗ {transfer.failed_count || 0}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Chưa có lịch sử
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminBulkTransfer;
