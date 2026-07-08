import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useChain } from "@/contexts/ChainContext";
import { useWallet } from "@/hooks/useWallet";
import { useSecureWallet } from "@/hooks/useSecureWallet";
import { useNFT } from "@/hooks/useNFT";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  Link2,
  Eye,
  EyeOff,
  ChevronDown,
  Users,
  QrCode,
  Coins,
  SendHorizontal,
  ClipboardList,
  GraduationCap,
  Lock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatAddress, formatBalance, BSC_MAINNET } from "@/lib/wallet";
import { fetchTokenPrices, type TokenPrice } from "@/lib/priceTracker";

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
import { ImportTokenDialog, type CustomToken } from "@/components/wallet/ImportTokenDialog";
import { WalletManagerDialog } from "@/components/wallet/WalletManagerDialog";
import { PinDialog } from "@/components/wallet/PinDialog";
import { BulkSendDialog } from "@/components/wallet/BulkSendDialog";
import { UnlockWalletDialog } from "@/components/wallet/UnlockWalletDialog";
import BottomNav from "@/components/layout/BottomNav";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentChain } = useChain();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  
  const {
    wallets,
    activeWallet,
    setActiveWallet,
    balances,
    loading: walletLoading,
    balanceLoading,
    createWallet,
    importFromMnemonic,
    importFromPrivateKey,
    getPrivateKey,
    linkPrivateKey,
    deleteWallet,
    setPrimaryWallet,
    renameWallet,
    getTotalBalance,
    refreshBalances,
  } = useWallet();

  // Security hooks
  const {
    isPasswordSet,
    isUnlocked,
    failedAttempts,
    isLocked,
    lockoutEndTime,
    unlock,
    lock,
    hasOldStorageData,
  } = useSecureWallet();

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
  const [importTokenOpen, setImportTokenOpen] = useState(false);
  const [walletManagerOpen, setWalletManagerOpen] = useState(false);
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tokens");
  
  // Realtime prices state for synchronized total balance
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  
  // Balance visibility state
  const [balanceHidden, setBalanceHidden] = useState(() => {
    return localStorage.getItem("fun_wallet_balance_hidden") === "true";
  });
  const [pinEnabled] = useState(() => {
    return localStorage.getItem("fun_wallet_pin_enabled") === "true";
  });
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);

  const toggleBalanceVisibility = () => {
    if (balanceHidden && pinEnabled) {
      setShowPinDialog(true);
    } else {
      const newHidden = !balanceHidden;
      setBalanceHidden(newHidden);
      localStorage.setItem("fun_wallet_balance_hidden", String(newHidden));
    }
  };

  const verifyPin = (pin: string): boolean => {
    const storedHash = localStorage.getItem("fun_wallet_pin_hash");
    // Simple hash verification
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    if (storedHash === hash.toString(16)) {
      setBalanceHidden(false);
      localStorage.setItem("fun_wallet_balance_hidden", "false");
      return true;
    }
    return false;
  };

  const setupPin = (pin: string) => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    localStorage.setItem("fun_wallet_pin_hash", hash.toString(16));
    localStorage.setItem("fun_wallet_pin_enabled", "true");
  };

  // Fetch realtime prices for total balance calculation
  useEffect(() => {
    const fetchPrices = async () => {
      if (balances.length === 0) {
        setPricesLoading(false);
        return;
      }
      setPricesLoading(true);
      try {
        const symbols = balances.map((b) => b.symbol);
        const data = await fetchTokenPrices(symbols);
        setPrices(data);
      } catch (error) {
        console.error("Error fetching prices:", error);
      } finally {
        setPricesLoading(false);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [balances]);

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

  const totalBalance = getTotalBalance(prices);
  const hasWallet = wallets.length > 0 && activeWallet;

  // Premium palette for quick action buttons - Emerald / Teal / Gold system
  const PALETTE = {
    primary: "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-elegant",
    teal:    "bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-elegant",
    gold:    "bg-gradient-to-br from-gold to-accent text-accent-foreground shadow-gold",
    emerald: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-elegant",
    neutral: "bg-card hover:bg-muted text-foreground border border-border/60 shadow-sm",
    ghost:   "bg-muted/60 hover:bg-muted text-foreground",
  } as const;

  return (
    <div className="min-h-screen bg-background pb-20 relative">
      {/* Ambient mesh background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{ background: "var(--gradient-mesh)" }}
      />

      {/* Header - Glass sticky */}
      <header className="sticky top-0 z-50 border-b border-border/40 px-4 py-3 backdrop-blur-xl bg-background/70">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img 
              src="/logo.gif?v=1" 
              alt="FUN Wallet" 
              className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] object-contain logo-glow" 
            />
          </Link>
          <div className="flex items-center gap-2">
            <ChainSelector compact />
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/admin")}
                className="text-primary"
                title="Admin Dashboard"
              >
                <Shield className="h-5 w-5" />
              </Button>
            )}
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
        <div className="mb-6 animate-fade-in">
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight mb-1">
            Xin chào, <span className="gradient-text">{user.user_metadata?.display_name || user.email?.split("@")[0]}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Quản lý tài sản Web3 của bạn</p>
        </div>

        {/* Wallet Hero Card - Premium Glassmorphism */}
        <div
          className="relative rounded-3xl p-6 md:p-8 mb-8 overflow-hidden border border-border/50 shadow-elegant animate-fade-in-up"
          style={{ background: "var(--gradient-hero)" }}
        >
          {/* Gold accent orb */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-gold)" }} />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-25 blur-3xl bg-secondary" />

          <div className="relative flex items-start justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60 mb-2">Tổng tài sản</p>
              <div className="flex items-center gap-3">
                {pricesLoading && balances.length > 0 ? (
                  <Skeleton className="h-11 w-40 bg-white/10" />
                ) : (
                  <h2 className="font-heading text-4xl md:text-5xl font-bold text-white tracking-tight">
                    {balanceHidden ? "••••••" : `$${formatBalance(totalBalance.toFixed(2), 2)}`}
                  </h2>
                )}
                <Button variant="ghost" size="icon" onClick={toggleBalanceVisibility} className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                  {balanceHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
                {currentChain.logo.startsWith("/") ? (
                  <img src={currentChain.logo} alt={currentChain.shortName} className="w-4 h-4 rounded-full" />
                ) : (
                  <span className="text-sm">{currentChain.logo}</span>
                )}
                <span className="text-xs font-medium text-white/90">{currentChain.shortName}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              {!pinEnabled && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPinSetup(true)}
                  className="text-xs text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  PIN
                </Button>
              )}
            </div>
          </div>

          {/* Wallet address chip */}
          <div 
            className="relative flex items-center gap-2 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 cursor-pointer hover:bg-white/15 transition-colors"
            onClick={() => hasWallet && setWalletManagerOpen(true)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/60">
                {hasWallet ? activeWallet.name : `Địa chỉ ví ${currentChain.shortName}`}
              </p>
              <p className="text-sm font-mono text-white truncate">
                {hasWallet 
                  ? formatAddress(activeWallet.address, 8) 
                  : "Chưa có ví - Tạo ví để bắt đầu"}
              </p>
            </div>
            {hasWallet && (
              <>
                <ChevronDown className="h-4 w-4 text-white/60" />
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); copyAddress(); }} className="text-white/80 hover:text-white hover:bg-white/10">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild onClick={(e) => e.stopPropagation()} className="text-white/80 hover:text-white hover:bg-white/10">
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
        </div>

        {/* Quick actions grid - premium */}
        <div className="mb-8 space-y-3">
          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            <QuickAction 
              icon={<ArrowUpRight />} 
              label="Gửi" 
              onClick={() => setSendOpen(true)}
              disabled={!hasWallet}
              colorClass={PALETTE.primary}
            />
            <QuickAction 
              icon={<Users />} 
              label="Gửi nhiều" 
              onClick={() => setBulkSendOpen(true)}
              disabled={!hasWallet}
              colorClass={PALETTE.neutral}
            />
            <QuickAction 
              icon={<ArrowDownLeft />} 
              label="Nhận" 
              onClick={() => setReceiveOpen(true)}
              disabled={!hasWallet}
              colorClass={PALETTE.teal}
            />
            <QuickAction 
              icon={<ArrowDownUp />} 
              label="Swap" 
              onClick={() => setSwapOpen(true)}
              disabled={!hasWallet}
              colorClass={PALETTE.gold}
            />
            <QuickAction 
              icon={<Layers />} 
              label="Stake" 
              onClick={() => setStakingOpen(true)}
              disabled={!hasWallet}
              colorClass={PALETTE.emerald}
            />
            <QuickAction 
              icon={<Plus />} 
              label={hasWallet ? "Thêm" : "Tạo ví"}
              onClick={() => setCreateWalletOpen(true)}
              colorClass={PALETTE.neutral}
            />
          </div>

          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            <QuickAction 
              icon={<Bell />} 
              label="Giá" 
              onClick={() => setPriceAlertsOpen(true)}
              colorClass={PALETTE.ghost}
            />
            <QuickAction 
              icon={<Globe />} 
              label="DApps" 
              onClick={() => setDappBrowserOpen(true)}
              disabled={!hasWallet}
              colorClass={PALETTE.ghost}
            />
            <QuickAction 
              icon={<Shield />} 
              label="Backup" 
              onClick={() => setBackupOpen(true)}
              disabled={!hasWallet}
              colorClass={PALETTE.ghost}
            />
            <QuickAction 
              icon={<Link2 />} 
              label="WC" 
              onClick={() => setWalletConnectOpen(true)}
              disabled={!hasWallet}
              colorClass={PALETTE.ghost}
            />
            <QuickAction 
              icon={<QrCode />} 
              label="QR" 
              onClick={() => navigate("/qr-payment")}
              disabled={!hasWallet}
              colorClass={PALETTE.ghost}
            />
            <QuickAction 
              icon={<RefreshCw className={balanceLoading ? "animate-spin" : ""} />} 
              label="Refresh" 
              onClick={refreshBalances}
              disabled={!hasWallet || balanceLoading}
              colorClass={PALETTE.ghost}
            />
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            <QuickAction 
              icon={<Coins />} 
              label="Earn" 
              onClick={() => navigate("/earn")}
              colorClass={PALETTE.gold}
            />
            <QuickAction 
              icon={<SendHorizontal />} 
              label="Transfer" 
              onClick={() => navigate("/transfer")}
              disabled={!hasWallet}
              colorClass={PALETTE.neutral}
            />
            <QuickAction 
              icon={<ClipboardList />} 
              label="History" 
              onClick={() => navigate("/history")}
              disabled={!hasWallet}
              colorClass={PALETTE.neutral}
            />
            <QuickAction 
              icon={<CreditCard />} 
              label="Card" 
              onClick={() => navigate("/card")}
              disabled={!hasWallet}
              colorClass={PALETTE.primary}
            />
            <QuickAction 
              icon={<GraduationCap />} 
              label="Learn" 
              onClick={() => navigate("/learn")}
              colorClass={PALETTE.neutral}
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
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={() => setImportTokenOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Import Token
                    </Button>
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
            activeWallet={activeWallet}
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

          <ImportTokenDialog
            open={importTokenOpen}
            onOpenChange={setImportTokenOpen}
            onImport={(token: CustomToken) => {
              // Refresh balances to include the new token
              refreshBalances();
            }}
          />

          <WalletManagerDialog
            open={walletManagerOpen}
            onOpenChange={setWalletManagerOpen}
            wallets={wallets}
            activeWallet={activeWallet}
            onSelectWallet={setActiveWallet}
            onDeleteWallet={deleteWallet}
            onSetPrimary={setPrimaryWallet}
            onRenameWallet={renameWallet}
            getPrivateKey={getPrivateKey}
            onLinkPrivateKey={linkPrivateKey}
          />
        </>
      )}

      {/* PIN Dialogs */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        mode="verify"
        onVerify={verifyPin}
      />

      <PinDialog
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        mode="setup"
        onSetup={setupPin}
      />

      {/* Bulk Send Dialog */}
      {activeWallet && (
        <BulkSendDialog
          open={bulkSendOpen}
          onOpenChange={setBulkSendOpen}
          walletAddress={activeWallet.address}
          balances={balances}
          getPrivateKey={getPrivateKey}
          onSuccess={refreshBalances}
        />
      )}

      {/* Unlock Wallet Dialog - Show when wallet has password but locked */}
      <UnlockWalletDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        onUnlock={unlock}
        failedAttempts={failedAttempts}
        isLocked={isLocked}
        lockoutEndTime={lockoutEndTime}
      />

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
};

const QuickAction = ({ 
  icon, 
  label, 
  onClick, 
  disabled,
  colorClass 
}: { 
  icon: React.ReactNode; 
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  colorClass?: string;
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`btn-hover-scale ripple-effect icon-bounce flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${colorClass || "bg-muted/50 hover:bg-muted text-foreground"}`}
  >
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center">
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
