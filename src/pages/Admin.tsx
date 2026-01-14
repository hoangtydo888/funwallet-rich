import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wallet, Gift, TrendingUp, ArrowLeft, LogOut, ShieldCheck, Send, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin, UserWithWallets } from '@/hooks/useAdmin';
import { useAdminKYC } from '@/hooks/useAdminKYC';
import { AdminStatsCard } from '@/components/admin/AdminStatsCard';
import { UsersTable } from '@/components/admin/UsersTable';
import { RewardsTable } from '@/components/admin/RewardsTable';
import { KYCTable } from '@/components/admin/KYCTable';
import { CreateRewardDialog } from '@/components/admin/CreateRewardDialog';
import { BulkTransferDialog } from '@/components/admin/BulkTransferDialog';
import { toast } from 'sonner';

const Admin = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, loading, users, rewards, stats, createReward, updateRewardStatus } = useAdmin();
  const { kycList, pendingCount: pendingKYC, approveKYC, rejectKYC, isApproving, isRejecting, getDocumentUrl } = useAdminKYC();
  const [selectedUser, setSelectedUser] = useState<UserWithWallets | null>(null);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [adminPrivateKey, setAdminPrivateKey] = useState('');
  const [adminAddress, setAdminAddress] = useState('');

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/dashboard');
    }
  }, [loading, isAdmin, navigate]);

  const handleRewardUser = (userToReward: UserWithWallets) => {
    setSelectedUser(userToReward);
    setRewardDialogOpen(true);
  };

  const handleUpdateStatus = async (rewardId: string, status: string) => {
    const { error } = await updateRewardStatus(rewardId, status);
    if (error) {
      toast.error('Không thể cập nhật trạng thái');
    } else {
      toast.success('Đã cập nhật trạng thái');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
            <div className="h-12 w-12 md:h-16 md:w-16 lg:h-20 lg:w-20 flex items-center justify-center">
              <img src="/logo.gif?v=1" alt="FUN Wallet" className="h-full w-full logo-glow" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard
            title="Tổng Users"
            value={stats.totalUsers}
            icon={Users}
            description="Đã đăng ký"
          />
          <AdminStatsCard
            title="Tổng Wallets"
            value={stats.totalWallets}
            icon={Wallet}
            description="Đã tạo"
          />
          <AdminStatsCard
            title="Users có Ví"
            value={stats.usersWithWallets}
            icon={TrendingUp}
            description={`${stats.totalUsers > 0 ? Math.round((stats.usersWithWallets / stats.totalUsers) * 100) : 0}% tổng users`}
          />
          <AdminStatsCard
            title="Tổng Rewards"
            value={stats.totalRewards}
            icon={Gift}
            description={`${stats.pendingRewards} đang chờ gửi`}
          />
          <AdminStatsCard
            title="KYC Pending"
            value={pendingKYC}
            icon={FileCheck}
            description="Hồ sơ chờ duyệt"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users & Wallets
            </TabsTrigger>
            <TabsTrigger value="kyc" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              KYC ({pendingKYC})
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="bulk-transfer" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Bulk Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Danh sách Users & Wallets
              </h2>
              <UsersTable users={users} onRewardUser={handleRewardUser} />
            </div>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Quản lý KYC
              </h2>
              <KYCTable
                submissions={kycList}
                onApprove={approveKYC}
                onReject={rejectKYC}
                isApproving={isApproving}
                isRejecting={isRejecting}
                getDocumentUrl={getDocumentUrl}
              />
            </div>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Quản lý Rewards
              </h2>
              <RewardsTable rewards={rewards} onUpdateStatus={handleUpdateStatus} />
            </div>
          </TabsContent>

          <TabsContent value="bulk-transfer" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto">
                  <Send className="h-10 w-10 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Chuyển Tiền Hàng Loạt</h2>
                  <p className="text-muted-foreground">
                    Gửi crypto đến nhiều địa chỉ cùng lúc (tối đa 1000 địa chỉ mỗi lần). 
                    Upload file CSV hoặc chọn từ danh sách users.
                  </p>
                </div>
                <Button size="lg" onClick={() => navigate('/admin/bulk-transfer')} className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  Mở trang Bulk Transfer
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Reward Dialog */}
      <CreateRewardDialog
        open={rewardDialogOpen}
        onOpenChange={setRewardDialogOpen}
        user={selectedUser}
        onCreateReward={createReward}
      />

      {/* Bulk Transfer Dialog */}
      <BulkTransferDialog
        open={bulkTransferOpen}
        onOpenChange={setBulkTransferOpen}
        users={users}
        adminPrivateKey={adminPrivateKey}
        adminAddress={adminAddress}
      />
    </div>
  );
};

export default Admin;
