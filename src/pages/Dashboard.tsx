import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useNFT } from "@/hooks/useNFT";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  CreditCard,
  Image,
  TrendingUp,
  LogOut,
  Plus,
  Copy,
  ExternalLink,
  Sparkles,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatAddress, formatBalance, BSC_MAINNET } from "@/lib/wallet";

// Components
import { CreateWalletDialog } from "@/components/wallet/CreateWalletDialog";
import { SendCryptoDialog } from "@/components/wallet/SendCryptoDialog";
import { ReceiveCryptoDialog } from "@/components/wallet/ReceiveCryptoDialog";
import { TokenList } from "@/components/wallet/TokenList";
import { NFTGallery } from "@/components/nft/NFTGallery";
import { MintBadgeDialog } from "@/components/nft/MintBadgeDialog";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const {
    wallets,
    activeWallet,
    balances,
    loading: walletLoading,
    balanceLoading,
    createWallet,
    importFromMnemonic,
    importFromPrivateKey,
    getPrivateKey,
    getTotalBalance,
    refreshBalances,
  } = useWallet();

  const {
    nfts,
    loading: nftLoading,
    mintFunBadge,
  } = useNFT(activeWallet?.address, activeWallet?.id);

  // Dialog states
  const [createWalletOpen, setCreateWalletOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [mintBadgeOpen, setMintBadgeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tokens");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Đã đăng xuất",
      description: "Hẹn gặp lại bạn!",
    });
    navigate("/");
  };

  const copyAddress = () => {
    if (activeWallet) {
      navigator.clipboard.writeText(activeWallet.address);
      toast({
        title: "Đã sao chép",
        description: "Địa chỉ ví đã được sao chép vào clipboard",
      });
    }
  };

  const handleMintBadge = async (badgeType: "gold" | "silver" | "bronze") => {
    if (!activeWallet) return { success: false };
    const privateKey = getPrivateKey(activeWallet.address);
    if (!privateKey) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy private key",
        variant: "destructive",
      });
      return { success: false };
    }
    return await mintFunBadge(privateKey, badgeType);
  };

  if (authLoading || walletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalBalance = getTotalBalance();
  const hasWallet = wallets.length > 0 && activeWallet;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-heading text-xl font-bold gradient-text">
            FUN Wallet
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold mb-2">
            Xin chào, {user.user_metadata?.display_name || user.email?.split("@")[0]} 👋
          </h1>
          <p className="text-muted-foreground">Quản lý tài sản Web3 của bạn</p>
        </div>

        {/* Wallet Card */}
        <div className="glass-card rounded-3xl p-6 mb-8 gradient-border">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tổng tài sản</p>
              <h2 className="font-heading text-4xl font-bold">
                ${formatBalance(totalBalance.toFixed(2), 2)}
              </h2>
              <p className="text-sm text-success mt-1">BNB Chain</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>

          {/* Wallet address */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 mb-6">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {hasWallet ? activeWallet.name : "Địa chỉ ví BNB Chain"}
              </p>
              <p className="text-sm font-mono">
                {hasWallet 
                  ? formatAddress(activeWallet.address, 8) 
                  : "Chưa có ví - Tạo ví để bắt đầu"}
              </p>
            </div>
            {hasWallet && (
              <>
                <Button variant="ghost" size="icon" onClick={copyAddress}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={`${BSC_MAINNET.explorer}/address/${activeWallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-3">
            <QuickAction 
              icon={<ArrowUpRight />} 
              label="Gửi" 
              onClick={() => setSendOpen(true)}
              disabled={!hasWallet}
            />
            <QuickAction 
              icon={<ArrowDownLeft />} 
              label="Nhận" 
              onClick={() => setReceiveOpen(true)}
              disabled={!hasWallet}
            />
            <QuickAction 
              icon={<RefreshCw className={balanceLoading ? "animate-spin" : ""} />} 
              label="Refresh" 
              onClick={refreshBalances}
              disabled={!hasWallet || balanceLoading}
            />
            <QuickAction 
              icon={<Plus />} 
              label={hasWallet ? "Thêm ví" : "Tạo ví"}
              onClick={() => setCreateWalletOpen(true)}
            />
          </div>
        </div>

        {/* Tabs: Tokens / NFTs */}
        {hasWallet ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="nfts">NFTs</TabsTrigger>
            </TabsList>

            <TabsContent value="tokens" className="mt-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-lg">Số dư tài sản</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={refreshBalances}
                    disabled={balanceLoading}
                  >
                    {balanceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <TokenList balances={balances} loading={balanceLoading} />
              </div>
            </TabsContent>

            <TabsContent value="nfts" className="mt-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-lg">NFT Collection</h3>
                  <Button 
                    size="sm" 
                    onClick={() => setMintBadgeOpen(true)}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Mint Badge
                  </Button>
                </div>
                <NFTGallery 
                  nfts={nfts} 
                  loading={nftLoading} 
                  onMintClick={() => setMintBadgeOpen(true)}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Feature cards for new users */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <FeatureCard
              icon={<Wallet />}
              title="Tạo Ví Mới"
              description="Tạo ví Web3 mới trên BNB Chain"
              action="Tạo ví"
              gradient="from-primary to-secondary"
              onClick={() => setCreateWalletOpen(true)}
            />
            <FeatureCard
              icon={<CreditCard />}
              title="FUN Card"
              description="Kích hoạt thẻ đa năng của bạn"
              action="Sắp ra mắt"
              gradient="from-secondary to-primary"
              disabled
            />
            <FeatureCard
              icon={<Image />}
              title="NFT Gallery"
              description="Xem và quản lý NFT của bạn"
              action="Tạo ví trước"
              gradient="from-accent to-warning"
              disabled
            />
          </div>
        )}

        {/* Recent transactions */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-lg">Giao dịch gần đây</h3>
            <Button variant="ghost" size="sm">
              Xem tất cả
            </Button>
          </div>
          
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có giao dịch nào</p>
            <p className="text-sm">Giao dịch của bạn sẽ hiển thị ở đây</p>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <CreateWalletDialog
        open={createWalletOpen}
        onOpenChange={setCreateWalletOpen}
        onCreateWallet={createWallet}
        onImportMnemonic={importFromMnemonic}
        onImportPrivateKey={importFromPrivateKey}
      />

      {hasWallet && (
        <>
          <SendCryptoDialog
            open={sendOpen}
            onOpenChange={setSendOpen}
            walletAddress={activeWallet.address}
            balances={balances}
            getPrivateKey={getPrivateKey}
            onSuccess={refreshBalances}
          />

          <ReceiveCryptoDialog
            open={receiveOpen}
            onOpenChange={setReceiveOpen}
            walletAddress={activeWallet.address}
          />

          <MintBadgeDialog
            open={mintBadgeOpen}
            onOpenChange={setMintBadgeOpen}
            onMint={handleMintBadge}
          />
        </>
      )}
    </div>
  );
};

const QuickAction = ({ 
  icon, 
  label, 
  onClick, 
  disabled 
}: { 
  icon: React.ReactNode; 
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
      {icon}
    </div>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  action, 
  gradient,
  disabled,
  onClick
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  action: string;
  gradient: string;
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <div className="glass-card rounded-2xl p-6 flex flex-col">
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-primary-foreground mb-4`}>
      {icon}
    </div>
    <h3 className="font-heading font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground mb-4 flex-1">{description}</p>
    <Button 
      variant={disabled ? "secondary" : "default"} 
      className={disabled ? "" : `bg-gradient-to-r ${gradient} hover:opacity-90`}
      disabled={disabled}
      onClick={onClick}
    >
      {action}
    </Button>
  </div>
);

export default Dashboard;
