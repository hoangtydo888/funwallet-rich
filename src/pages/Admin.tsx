import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wallet, Gift, TrendingUp, ArrowLeft, LogOut, ShieldCheck, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin, UserWithWallets } from '@/hooks/useAdmin';
import { AdminStatsCard } from '@/components/admin/AdminStatsCard';
import { UsersTable } from '@/components/admin/UsersTable';
import { RewardsTable } from '@/components/admin/RewardsTable';
import { CreateRewardDialog } from '@/components/admin/CreateRewardDialog';
import StatisticsChart from '@/components/admin/StatisticsChart';
import { toast } from 'sonner';

const Admin = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, loading, users, rewards, stats, createReward, updateRewardStatus, allWallets } = useAdmin();
  const [selectedUser, setSelectedUser] = useState<UserWithWallets | null>(null);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [statsDays, setStatsDays] = useState(7);

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

  // Prepare data for statistics
  const usersForStats = users.map((u) => ({ created_at: u.created_at }));
  const walletsForStats = allWallets.map((w) => ({ created_at: w.created_at }));
  const rewardsForStats = rewards.map((r) => ({ created_at: r.created_at }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">FUN Wallet Admin</h1>
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
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users & Wallets
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Thống kê
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

          <TabsContent value="rewards" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Quản lý Rewards
              </h2>
              <RewardsTable rewards={rewards} onUpdateStatus={handleUpdateStatus} />
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Thống kê theo thời gian
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant={statsDays === 7 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatsDays(7)}
                  >
                    7 ngày
                  </Button>
                  <Button
                    variant={statsDays === 30 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatsDays(30)}
                  >
                    30 ngày
                  </Button>
                  <Button
                    variant={statsDays === 90 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatsDays(90)}
                  >
                    90 ngày
                  </Button>
                </div>
              </div>
              <StatisticsChart
                users={usersForStats}
                wallets={walletsForStats}
                rewards={rewardsForStats}
                days={statsDays}
              />
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
    </div>
  );
};

export default Admin;
