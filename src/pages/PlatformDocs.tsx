import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Database, 
  Server, 
  Layout, 
  Shield, 
  Wallet, 
  BookOpen,
  Zap,
  Users,
  Globe,
  Code,
  Layers,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Clock,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PlatformDocs = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const techStack = [
    { name: "React 18", category: "Frontend", description: "UI Framework" },
    { name: "TypeScript", category: "Language", description: "Type-safe JavaScript" },
    { name: "Vite", category: "Build Tool", description: "Fast development server" },
    { name: "TailwindCSS", category: "Styling", description: "Utility-first CSS" },
    { name: "shadcn/ui", category: "UI Library", description: "Accessible components" },
    { name: "Supabase", category: "Backend", description: "Auth, DB, Storage, Edge Functions" },
    { name: "ethers.js v6", category: "Web3", description: "Ethereum/BSC interactions" },
    { name: "React Query", category: "State", description: "Server state management" },
  ];

  const features = [
    { 
      name: "Wallet Management", 
      icon: Wallet,
      description: "Tạo, import và quản lý nhiều ví HD wallet",
      files: ["useWallet.ts", "useSecureWallet.ts", "CreateWalletDialog.tsx"],
      status: "done"
    },
    { 
      name: "Token Balance", 
      icon: Layers,
      description: "Hiển thị số dư BNB và BEP-20 tokens real-time",
      files: ["src/lib/wallet.ts", "TokenList.tsx"],
      status: "done"
    },
    { 
      name: "Send/Receive", 
      icon: Zap,
      description: "Gửi và nhận crypto với QR code support",
      files: ["SendCryptoDialog.tsx", "ReceiveCryptoDialog.tsx"],
      status: "done"
    },
    { 
      name: "Transaction History", 
      icon: Clock,
      description: "Lịch sử giao dịch in-app + on-chain (MegaNode API)",
      files: ["TransactionHistory.tsx", "bscscan-proxy/index.ts"],
      status: "done"
    },
    { 
      name: "Trading/Swap", 
      icon: GitBranch,
      description: "Swap tokens (UI ready, cần integrate DEX)",
      files: ["Trading.tsx", "SwapDialog.tsx", "src/lib/swap.ts"],
      status: "partial"
    },
    { 
      name: "Staking", 
      icon: Rocket,
      description: "Stake tokens kiếm lợi nhuận (mock data)",
      files: ["useStaking.ts", "Earn.tsx", "StakingDialog.tsx"],
      status: "partial"
    },
    { 
      name: "NFT Gallery", 
      icon: Layout,
      description: "Quản lý và hiển thị NFTs",
      files: ["useNFT.ts", "NFTGallery.tsx", "NFTDetailDialog.tsx"],
      status: "done"
    },
    { 
      name: "Fun Card", 
      icon: Shield,
      description: "Thẻ ảo với các tier (Basic, Premium, Elite)",
      files: ["useCard.ts", "Card.tsx"],
      status: "done"
    },
    { 
      name: "KYC", 
      icon: Users,
      description: "Xác minh danh tính với upload documents",
      files: ["useKYC.ts", "KYC.tsx", "useAdminKYC.ts"],
      status: "done"
    },
    { 
      name: "Learn Platform", 
      icon: BookOpen,
      description: "Nền tảng học Web3 với XP và levels",
      files: ["useLearning.ts", "Learn.tsx"],
      status: "done"
    },
    { 
      name: "Admin Dashboard", 
      icon: Server,
      description: "Quản lý users, KYC, rewards, bulk transfers",
      files: ["useAdmin.ts", "Admin.tsx", "AdminBulkTransfer.tsx"],
      status: "done"
    },
    { 
      name: "Multi-chain", 
      icon: Globe,
      description: "Hỗ trợ 8 chains EVM (BSC, ETH, Polygon...)",
      files: ["src/lib/chains.ts", "ChainContext.tsx"],
      status: "done"
    },
  ];

  const databaseTables = [
    { name: "profiles", description: "Thông tin user (display_name, kyc_status, avatar)", rls: true },
    { name: "wallets", description: "Ví của users (address, chain, is_primary)", rls: true },
    { name: "encrypted_wallet_keys", description: "Private keys đã mã hóa AES-256-GCM", rls: true },
    { name: "transactions", description: "Lịch sử giao dịch in-app", rls: true },
    { name: "staking_positions", description: "Vị thế staking với APY và lock period", rls: true },
    { name: "nft_collections", description: "NFTs của users (contract, token_id, metadata)", rls: true },
    { name: "user_cards", description: "Fun Cards với tier và balance", rls: true },
    { name: "kyc_submissions", description: "Hồ sơ KYC với document paths", rls: true },
    { name: "rewards", description: "Rewards/Airdrops cho users", rls: true },
    { name: "bulk_transfers", description: "Batch transfers từ admin", rls: true },
    { name: "bulk_transfer_items", description: "Chi tiết từng item trong bulk transfer", rls: true },
    { name: "learning_progress", description: "Tiến độ học từng course", rls: true },
    { name: "user_learning_stats", description: "XP, level, streak, certificates", rls: true },
    { name: "user_roles", description: "Phân quyền (user/admin/moderator)", rls: true },
    { name: "user_settings", description: "Cài đặt người dùng (favorite_token, recent_addresses)", rls: true },
    { name: "security_logs", description: "Logs bảo mật (login, wallet access)", rls: true },
  ];

  const contexts = [
    { name: "AuthContext", purpose: "Quản lý authentication state, user session, login/logout" },
    { name: "ChainContext", purpose: "Quản lý blockchain chain đang chọn (BSC, ETH, etc.)" },
    { name: "ThemeContext", purpose: "Dark/Light mode, theme preferences" },
    { name: "WalletSecurityContext", purpose: "Bảo mật ví: password, session timeout, lock state" },
  ];

  const hooks = [
    { name: "useWallet", purpose: "CRUD wallets, fetch balances, get primary wallet" },
    { name: "useSecureWallet", purpose: "Mã hóa/giải mã private keys với AES-256-GCM" },
    { name: "useStaking", purpose: "Create/manage staking positions, claim rewards" },
    { name: "useNFT", purpose: "Import, view, manage NFTs" },
    { name: "useCard", purpose: "Fun Card operations: create, lock, update tier" },
    { name: "useKYC", purpose: "Submit và check KYC status" },
    { name: "useLearning", purpose: "Learning platform: courses, progress, XP" },
    { name: "useAdmin", purpose: "Admin operations: users, stats, rewards" },
    { name: "useAdminKYC", purpose: "Admin KYC review: approve/reject" },
    { name: "useBulkTransfer", purpose: "Bulk transfer management" },
    { name: "useRealtimeNotifications", purpose: "Supabase realtime subscriptions" },
  ];

  const routes = [
    { path: "/", component: "Index", description: "Landing page", auth: false },
    { path: "/auth", component: "Auth", description: "Đăng nhập/Đăng ký", auth: false },
    { path: "/onboarding", component: "Onboarding", description: "Hướng dẫn người mới", auth: false },
    { path: "/dashboard", component: "Dashboard", description: "Trang chính sau login", auth: true },
    { path: "/wallet", component: "Wallet", description: "Chi tiết ví Spot/Earn", auth: true },
    { path: "/history", component: "History", description: "Lịch sử giao dịch", auth: true },
    { path: "/trading", component: "Trading", description: "Swap tokens", auth: true },
    { path: "/earn", component: "Earn", description: "Staking pools", auth: true },
    { path: "/learn", component: "Learn", description: "Học Web3", auth: true },
    { path: "/card", component: "Card", description: "Fun Card", auth: true },
    { path: "/kyc", component: "KYC", description: "Xác minh KYC", auth: true },
    { path: "/settings", component: "Settings", description: "Cài đặt", auth: true },
    { path: "/transfer", component: "Transfer", description: "Chuyển tiền", auth: true },
    { path: "/qr-payment", component: "QRPayment", description: "Thanh toán QR", auth: true },
    { path: "/admin", component: "Admin", description: "Admin dashboard", auth: true },
    { path: "/admin/bulk-transfer", component: "AdminBulkTransfer", description: "Bulk transfer", auth: true },
    { path: "/install", component: "Install", description: "Cài đặt PWA", auth: false },
    { path: "/docs/platform", component: "PlatformDocs", description: "Tài liệu dự án", auth: false },
  ];

  const roadmapItems = [
    {
      priority: "critical",
      items: [
        { title: "Fallback API cho Transaction History", description: "Sử dụng Ankr hoặc BSCScan Pro làm backup khi MegaNode không khả dụng" },
        { title: "Auto-refresh Transaction Status", description: "Tự động cập nhật status từ pending → confirmed" },
        { title: "Push Notifications", description: "Thông báo real-time khi nhận tiền, staking rewards" },
        { title: "Hardware Wallet Support", description: "Hỗ trợ Ledger, Trezor qua WalletConnect" },
      ]
    },
    {
      priority: "medium",
      items: [
        { title: "Biometric Authentication", description: "Face ID / Fingerprint cho mobile devices" },
        { title: "Price Alerts", description: "Thông báo khi token đạt giá mong muốn" },
        { title: "Auto-detect Tokens", description: "Tự động import tokens đã hold từ blockchain" },
        { title: "Gas Estimation", description: "Hiển thị ước tính gas trước khi gửi transaction" },
        { title: "Transaction Speed Options", description: "Slow/Normal/Fast gas price options" },
      ]
    },
    {
      priority: "low",
      items: [
        { title: "Multi-language Support (i18n)", description: "Hỗ trợ tiếng Anh, Trung Quốc, etc." },
        { title: "DApp Browser", description: "In-app browser để tương tác với DApps" },
        { title: "Portfolio Analytics", description: "Biểu đồ lãi/lỗ theo thời gian" },
        { title: "Social Recovery", description: "Khôi phục ví qua trusted contacts" },
        { title: "Referral Program", description: "Giới thiệu bạn bè nhận rewards" },
      ]
    },
  ];

  const edgeFunctions = [
    {
      name: "bscscan-proxy",
      purpose: "Lấy transaction history từ blockchain",
      api: "MegaNode BSCTrace API (nr_getAssetTransfers)",
      secrets: ["MEGANODE_API_KEY"],
      actions: ["txlist (native BNB)", "tokentx (BEP-20 tokens)"],
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="ml-4">
            <h1 className="text-lg font-semibold">CamLy Wallet Documentation</h1>
            <p className="text-xs text-muted-foreground">Platform Overview & Developer Guide</p>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="api" className="hidden lg:inline-flex">API</TabsTrigger>
            <TabsTrigger value="routes" className="hidden lg:inline-flex">Routes</TabsTrigger>
            <TabsTrigger value="roadmap" className="hidden lg:inline-flex">Roadmap</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  CamLy Wallet (FUN Wallet)
                </CardTitle>
                <CardDescription>
                  Web3 Crypto Wallet PWA cho BNB Smart Chain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold text-primary">16</div>
                    <div className="text-sm text-muted-foreground">Database Tables</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold text-primary">18</div>
                    <div className="text-sm text-muted-foreground">Routes</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold text-primary">70+</div>
                    <div className="text-sm text-muted-foreground">Components</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold text-primary">11</div>
                    <div className="text-sm text-muted-foreground">Custom Hooks</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="mb-4 font-semibold">Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {techStack.map((tech) => (
                      <Badge key={tech.name} variant="secondary" className="text-sm">
                        {tech.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-muted p-4">
                  <h3 className="mb-2 font-semibold">Project Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supabase Project ID:</span>
                      <code className="rounded bg-background px-2 py-1">xavgatuwiaeewdfpkycn</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Primary Chain:</span>
                      <span>BNB Smart Chain (BSC)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chain ID:</span>
                      <span>56 (Mainnet)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  System Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                  <pre className="overflow-x-auto whitespace-pre-wrap">
{`┌─────────────────────────────────────────────────────────────┐
│                   CamLy Wallet (FUN Wallet)                  │
├─────────────────────────────────────────────────────────────┤
│  📱 Frontend (React + TypeScript + Vite)                     │
│  ├── 📄 Pages (18 routes)                                    │
│  ├── 🧩 Components (70+ UI components)                       │
│  ├── 🪝 Hooks (11 custom hooks)                              │
│  └── 🔄 Contexts (4 global contexts)                         │
├─────────────────────────────────────────────────────────────┤
│  ☁️  Supabase Backend                                         │
│  ├── 🔐 Authentication (Email/Password)                      │
│  ├── 🗄️  Database (16 tables với RLS policies)               │
│  ├── ⚡ Edge Functions (bscscan-proxy)                       │
│  └── 📁 Storage (KYC documents)                              │
├─────────────────────────────────────────────────────────────┤
│  🌐 External APIs                                            │
│  ├── 📊 MegaNode BSCTrace (Transaction history)              │
│  ├── ⛓️  BNB Chain RPC (Balance, Token info)                  │
│  └── 💹 DexScreener (Token prices)                           │
└─────────────────────────────────────────────────────────────┘`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contexts</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Context</TableHead>
                        <TableHead>Purpose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contexts.map((ctx) => (
                        <TableRow key={ctx.name}>
                          <TableCell className="font-mono text-sm">{ctx.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ctx.purpose}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custom Hooks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hook</TableHead>
                          <TableHead>Purpose</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hooks.map((hook) => (
                          <TableRow key={hook.name}>
                            <TableCell className="font-mono text-sm">{hook.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{hook.purpose}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <feature.icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{feature.name}</CardTitle>
                      </div>
                      <Badge variant={feature.status === "done" ? "default" : "secondary"}>
                        {feature.status === "done" ? "Done" : "Partial"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-sm text-muted-foreground">{feature.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {feature.files.map((file) => (
                        <Badge key={file} variant="outline" className="text-xs">
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Schema (16 Tables)
                </CardTitle>
                <CardDescription>
                  Tất cả tables đều có Row Level Security (RLS) enabled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">RLS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {databaseTables.map((table) => (
                      <TableRow key={table.name}>
                        <TableCell className="font-mono text-sm">{table.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{table.description}</TableCell>
                        <TableCell className="text-center">
                          {table.rls ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <AlertCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Security Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Shield className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Private Keys Encryption</div>
                    <div className="text-sm text-muted-foreground">
                      Private keys được mã hóa với AES-256-GCM, sử dụng password-derived key (PBKDF2).
                      Lưu trong bảng <code className="rounded bg-muted px-1">encrypted_wallet_keys</code>.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Shield className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Row Level Security</div>
                    <div className="text-sm text-muted-foreground">
                      Tất cả tables đều có RLS policies. Users chỉ có thể access data của chính họ.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Edge Functions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {edgeFunctions.map((fn) => (
                  <div key={fn.name} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      <span className="font-mono font-semibold">{fn.name}</span>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">{fn.purpose}</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">API: </span>
                        <span>{fn.api}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Secrets: </span>
                        {fn.secrets.map((s) => (
                          <Badge key={s} variant="outline" className="ml-1">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Actions: </span>
                        {fn.actions.map((a) => (
                          <Badge key={a} variant="secondary" className="ml-1">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">External APIs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="rounded-lg border p-3">
                    <div className="font-medium">MegaNode BSCTrace API</div>
                    <div className="text-sm text-muted-foreground">
                      Transaction history (nr_getAssetTransfers) - Requires MEGANODE_API_KEY
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="font-medium">BNB Chain RPC</div>
                    <div className="text-sm text-muted-foreground">
                      Balance queries, token info, send transactions - Public RPC endpoints
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="font-medium">DexScreener API</div>
                    <div className="text-sm text-muted-foreground">
                      Token prices và market data - Free public API
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routes Tab */}
          <TabsContent value="routes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Path</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Auth Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow key={route.path}>
                        <TableCell className="font-mono text-sm">{route.path}</TableCell>
                        <TableCell className="text-sm">{route.component}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{route.description}</TableCell>
                        <TableCell className="text-center">
                          {route.auth ? (
                            <Badge variant="default" className="text-xs">Yes</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">No</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roadmap Tab */}
          <TabsContent value="roadmap" className="space-y-6">
            <div className="space-y-6">
              {roadmapItems.map((section) => (
                <Card key={section.priority}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {section.priority === "critical" && <AlertCircle className="h-5 w-5 text-destructive" />}
                      {section.priority === "medium" && <Clock className="h-5 w-5 text-muted-foreground" />}
                      {section.priority === "low" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      {section.priority === "critical" && "Ưu Tiên Cao (Critical)"}
                      {section.priority === "medium" && "Ưu Tiên Trung Bình"}
                      {section.priority === "low" && "Ưu Tiên Thấp (Nice to have)"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {section.items.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="text-left">
                            {item.title}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {item.description}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PlatformDocs;
