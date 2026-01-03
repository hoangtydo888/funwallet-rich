import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useChain } from "@/contexts/ChainContext";
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
  Loader2,
  ArrowDownUp,
  History,
  PieChart,
  Download,
  Bell,
  Globe,
  Shield,
  Layers,
  Settings,
  Link2
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
import { SwapDialog } from "@/components/swap/SwapDialog";
import { TransactionHistory } from "@/components/transactions/TransactionHistory";
import { PortfolioCharts } from "@/components/portfolio/PortfolioCharts";
import { ImportNFTDialog } from "@/components/nft/ImportNFTDialog";
import { StakingDialog } from "@/components/staking/StakingDialog";
import { PriceAlertsDialog } from "@/components/price/PriceAlertsDialog";
import { DAppBrowserDialog } from "@/components/dapp/DAppBrowserDialog";
import { BackupRestoreDialog } from "@/components/backup/BackupRestoreDialog";
import { ChainSelector } from "@/components/chain/ChainSelector";
import { WalletConnectDialog } from "@/components/walletconnect/WalletConnectDialog";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentChain } = useChain();
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
    importNFT,
  } = useNFT(activeWallet?.address, activeWallet?.id);

  // Dialog states
  const [createWalletOpen, setCreateWalletOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [mintBadgeOpen, setMintBadgeOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [importNFTOpen, setImportNFTOpen] = useState(false);
  const [stakingOpen, setStakingOpen] = useState(false);
  const [priceAlertsOpen, setPriceAlertsOpen] = useState(false);
  const [dappBrowserOpen, setDappBrowserOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [walletConnectOpen, setWalletConnectOpen] = useState(false);
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
          <div className="flex items-center gap-2">
            <ChainSelector compact />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
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
              <p className="text-sm text-success mt-1 flex items-center gap-1">
                {currentChain.logo} {currentChain.shortName}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>

          {/* Wallet address */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 mb-6">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {hasWallet ? activeWallet.name : `Địa chỉ ví ${currentChain.shortName}`}
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
                    href={`${currentChain.explorer}/address/${activeWallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
          </div>

          {/* Quick actions - Row 1 */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-2">
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
              icon={<ArrowDownUp />} 
              label="Swap" 
              onClick={() => setSwapOpen(true)}
              disabled={!hasWallet}
            />
            <QuickAction 
              icon={<Layers />} 
              label="Stake" 
              onClick={() => setStakingOpen(true)}
              disabled={!hasWallet}
            />
            <QuickAction 
              icon={<Plus />} 
              label={hasWallet ? "Thêm" : "Tạo ví"}
              onClick={() => setCreateWalletOpen(true)}
            />
          </div>

          {/* Quick actions - Row 2 */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            <QuickAction 
              icon={<Bell />} 
              label="Giá" 
              onClick={() => setPriceAlertsOpen(true)}
            />
            <QuickAction 
              icon={<Globe />} 
              label="DApps" 
              onClick={() => setDappBrowserOpen(true)}
              disabled={!hasWallet}
            />
            <QuickAction 
              icon={<Shield />} 
              label="Backup" 
              onClick={() => setBackupOpen(true)}
              disabled={!hasWallet}
            />
            <QuickAction 
              icon={<Link2 />} 
              label="WC" 
              onClick={() => setWalletConnectOpen(true)}
              disabled={!hasWallet}
            />
            <QuickAction 
              icon={<RefreshCw className={balanceLoading ? "animate-spin" : ""} />} 
              label="Refresh" 
              onClick={refreshBalances}
              disabled={!hasWallet || balanceLoading}
            />
          </div>
        </div>

        {/* Tabs: Tokens / NFTs / History / Portfolio */}
        {hasWallet ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="tokens" className="gap-1">
                <Wallet className="h-4 w-4 hidden sm:block" />
                Tokens
              </TabsTrigger>
              <TabsTrigger value="nfts" className="gap-1">
                <Image className="h-4 w-4 hidden sm:block" />
                NFTs
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1">
                <History className="h-4 w-4 hidden sm:block" />
                Lịch sử
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="gap-1">
                <PieChart className="h-4 w-4 hidden sm:block" />
                Portfolio
              </TabsTrigger>
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
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={() => setImportNFTOpen(true)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setMintBadgeOpen(true)}
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Mint Badge
                    </Button>
                  </div>
                </div>
                <NFTGallery 
                  nfts={nfts} 
                  loading={nftLoading} 
                  onMintClick={() => setMintBadgeOpen(true)}
                />
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-lg">Lịch sử giao dịch</h3>
                </div>
                <TransactionHistory walletAddress={activeWallet.address} />
              </div>
            </TabsContent>

            <TabsContent value="portfolio" className="mt-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-lg">Portfolio Analytics</h3>
                </div>
                <PortfolioCharts balances={balances} totalBalance={totalBalance} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Feature cards for new users */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <FeatureCard
            icon={<Wallet />}
            title="Tạo Ví Mới"
            description={`Tạo ví Web3 mới trên ${currentChain.name}`}
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
      </main>

      {/* Dialogs */}
      <CreateWalletDialog
        open={createWalletOpen}
        onOpenChange={setCreateWalletOpen}
        onCreateWallet={createWallet}
        onImportMnemonic={importFromMnemonic}
        onImportPrivateKey={importFromPrivateKey}
      />

      {/* Price Alerts - available without wallet */}
      <PriceAlertsDialog
        open={priceAlertsOpen}
        onOpenChange={setPriceAlertsOpen}
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

          <SwapDialog
            open={swapOpen}
            onOpenChange={setSwapOpen}
            walletAddress={activeWallet.address}
            getPrivateKey={getPrivateKey}
            onSuccess={refreshBalances}
          />

          <ImportNFTDialog
            open={importNFTOpen}
            onOpenChange={setImportNFTOpen}
            onImport={importNFT}
            walletAddress={activeWallet.address}
          />

          <StakingDialog
            open={stakingOpen}
            onOpenChange={setStakingOpen}
            walletAddress={activeWallet.address}
            getPrivateKey={getPrivateKey}
            onSuccess={refreshBalances}
          />

          <DAppBrowserDialog
            open={dappBrowserOpen}
            onOpenChange={setDappBrowserOpen}
            walletAddress={activeWallet.address}
          />

          <BackupRestoreDialog
            open={backupOpen}
            onOpenChange={setBackupOpen}
            wallets={wallets.map(w => ({ name: w.name, address: w.address }))}
            onRestoreWallet={async (name, address, privateKey) => {
              localStorage.setItem(`pk_${address.toLowerCase()}`, privateKey);
              // The wallet will be added via the normal flow
            }}
          />

          <WalletConnectDialog
            open={walletConnectOpen}
            onOpenChange={setWalletConnectOpen}
            walletAddress={activeWallet.address}
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
    className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
      {icon}
    </div>
    <span className="text-xs sm:text-sm font-medium">{label}</span>
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
