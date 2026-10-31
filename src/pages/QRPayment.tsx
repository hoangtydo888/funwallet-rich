import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, ArrowLeft, Camera, Check, CheckCircle2, Copy, ExternalLink, Image as ImageIcon, Loader2, QrCode, ScanLine, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useSecureWallet } from "@/hooks/useSecureWallet";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UnlockWalletDialog } from "@/components/wallet/UnlockWalletDialog";
import BottomNav from "@/components/layout/BottomNav";
import { getProvider, sendBNB, sendToken, formatBalance } from "@/lib/wallet";
import { NATIVE } from "@/lib/marketOrder";
import { fetchTokenPrices, formatUsdValue } from "@/lib/priceTracker";
import { PAY_ASSETS, buildPayUri, findPayment, parsePayRequest, usdToRaw, type PayRequest, type PaymentSeen } from "@/lib/payRequest";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmtRaw = (raw: bigint, decimals: number) => Number(ethers.formatUnits(raw, decimals)).toLocaleString("en-US", { maximumFractionDigits: Math.min(decimals, 8) });
const assetOf = (key: string) => PAY_ASSETS.find(a => a.key === key) ?? PAY_ASSETS[0];
const DEFAULT_ASSET = "usdt";

const QRPayment = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeWallet, balances, getPrivateKey, refreshBalances } = useWallet();
  const { unlock, failedAttempts, isLocked, lockoutEndTime } = useSecureWallet();
  const [tab, setTab] = useState("receive");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [unlockOpen, setUnlockOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let live = true;
    const load = () => fetchTokenPrices(PAY_ASSETS.map(a => a.symbol)).then(list => live && setPrices(Object.fromEntries(list.map(p => [p.symbol.toUpperCase(), p.price]))));
    void load();
    const timer = setInterval(load, 30_000);
    return () => { live = false; clearInterval(timer); };
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl font-heading font-bold">Thanh toán QR</h1>
        </div>
      </div>

      {!activeWallet ? (
        <p className="p-6 text-center text-muted-foreground">Tạo hoặc nhập ví trước để thanh toán bằng QR.</p>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="w-full max-w-xl mx-auto">
          <TabsList className="grid grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="receive" className="font-semibold"><QrCode className="w-4 h-4 mr-2" />Nhận tiền</TabsTrigger>
            <TabsTrigger value="pay" className="font-semibold"><Camera className="w-4 h-4 mr-2" />Quét để trả</TabsTrigger>
          </TabsList>
          <TabsContent value="receive" className="px-4 mt-4"><ReceivePanel address={activeWallet.address} prices={prices} /></TabsContent>
          <TabsContent value="pay" className="px-4 mt-4">
            {tab === "pay" && (
              <PayPanel address={activeWallet.address} walletId={activeWallet.id} balances={balances} prices={prices}
                getKey={() => getPrivateKey(activeWallet.address)} onLocked={() => setUnlockOpen(true)} onPaid={refreshBalances} />
            )}
          </TabsContent>
        </Tabs>
      )}

      <UnlockWalletDialog open={unlockOpen} onOpenChange={setUnlockOpen} onUnlock={unlock} failedAttempts={failedAttempts} isLocked={isLocked} lockoutEndTime={lockoutEndTime} />
      <BottomNav />
    </div>
  );
};

/** Shop side: a QR for an exact amount, then watches BSC until the money arrives. */
const ReceivePanel = ({ address, prices }: { address: string; prices: Record<string, number> }) => {
  const [assetKey, setAssetKey] = useState(DEFAULT_ASSET);
  const [unit, setUnit] = useState<"coin" | "usd">("usd");
  const [amount, setAmount] = useState("");
  const [order, setOrder] = useState<{ req: PayRequest & { raw: bigint }; fromBlock: number; startBalance: bigint; usd: number | null } | null>(null);
  const [paid, setPaid] = useState<PaymentSeen | null>(null);
  const [copied, setCopied] = useState(false);
  const asset = assetOf(assetKey);
  const price = prices[asset.symbol.toUpperCase()];

  const raw = useMemo(() => {
    const n = Number(amount);
    if (!(n > 0)) return null;
    try {
      if (unit === "coin") return ethers.parseUnits(amount.trim(), asset.decimals);
      return price ? usdToRaw(n, price, asset.decimals) : null;
    } catch { return null; }
  }, [amount, unit, price, asset.decimals]);

  // Poll the chain every 3 s while an order waits for payment
  useEffect(() => {
    if (!order || paid) return;
    let live = true;
    const provider = getProvider();
    const check = () => findPayment(provider, order.req, order.fromBlock, order.startBalance).then(seen => {
      if (live && seen) { setPaid(seen); toast({ title: `Đã nhận ${fmtRaw(seen.raw, order.req.asset.decimals)} ${order.req.asset.symbol} ✅` }); }
    }).catch(() => { /* try again next tick */ });
    void check();
    const timer = setInterval(check, 3000);
    return () => { live = false; clearInterval(timer); };
  }, [order, paid]);

  const createOrder = async () => {
    if (!raw) return;
    const provider = getProvider();
    try {
      const [block, startBalance] = await Promise.all([provider.getBlockNumber(), asset.token === NATIVE ? provider.getBalance(address) : Promise.resolve(0n)]);
      setPaid(null);
      setOrder({ req: { to: address, asset, raw }, fromBlock: block, startBalance, usd: price ? Number(ethers.formatUnits(raw, asset.decimals)) * price : null });
    } catch {
      toast({ title: "Không kết nối được mạng BSC", description: "Kiểm tra mạng rồi thử lại", variant: "destructive" });
    }
  };
  const reset = () => { setOrder(null); setPaid(null); setAmount(""); };

  const staticUri = buildPayUri({ to: address, asset, raw: null });
  const uri = order ? buildPayUri(order.req) : staticUri;
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  if (order && paid) {
    return (
      <Card className="border-green-500/50">
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Đã nhận thanh toán</p>
          <p className="text-3xl font-bold text-green-600">{fmtRaw(paid.raw, order.req.asset.decimals)} {order.req.asset.symbol}</p>
          {order.usd !== null && <p className="text-muted-foreground">≈ {formatUsdValue(order.usd)}</p>}
          {paid.from && <p className="text-sm">Từ ví <span className="font-mono">{short(paid.from)}</span></p>}
          {paid.hash && <a href={`https://bscscan.com/tx/${paid.hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">Xem trên BscScan <ExternalLink className="w-3 h-3" /></a>}
          <Button className="w-full h-12" onClick={reset}>Tạo đơn mới</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!order && (
        <Card><CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Nhận bằng coin</label>
            <Select value={assetKey} onValueChange={setAssetKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAY_ASSETS.map(a => <SelectItem key={a.key} value={a.key}><span className="flex items-center gap-2"><img src={a.logo} alt="" className="w-5 h-5" />{a.symbol} · {a.name}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Số tiền cần thu</label>
              <div className="flex rounded-lg border text-xs overflow-hidden">
                {(["usd", "coin"] as const).map(u => <button key={u} type="button" onClick={() => setUnit(u)} className={`px-2.5 py-1 ${unit === u ? "bg-primary text-primary-foreground" : ""}`}>{u === "usd" ? "USD" : asset.symbol}</button>)}
              </div>
            </div>
            <Input inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value.replace(",", "."))} className="text-lg h-12" />
            {raw && <p className="text-sm text-muted-foreground">Khách trả: <b className="text-foreground">{fmtRaw(raw, asset.decimals)} {asset.symbol}</b>{price ? ` ≈ ${formatUsdValue(Number(ethers.formatUnits(raw, asset.decimals)) * price)}` : ""}</p>}
            {unit === "usd" && !price && <p className="text-xs text-amber-600">Chưa có giá {asset.symbol}; nhập theo số coin.</p>}
          </div>
          <Button className="w-full h-12 font-semibold" disabled={!raw} onClick={createOrder}><QrCode className="w-4 h-4 mr-2" />Tạo mã thanh toán</Button>
        </CardContent></Card>
      )}

      <div className="flex flex-col items-center">
        <div className="p-3 bg-white rounded-2xl shadow-lg">
          <QRCodeSVG value={uri} size={232} level="H" includeMargin imageSettings={{ src: "/logo-qr.png", width: 62, height: 57, excavate: true }} />
        </div>
        {order ? (
          <div className="mt-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">Khách quét mã này để trả</p>
            <p className="text-2xl font-bold">{fmtRaw(order.req.raw, order.req.asset.decimals)} {order.req.asset.symbol}</p>
            {order.usd !== null && <p className="text-muted-foreground">≈ {formatUsdValue(order.usd)}</p>}
            <p className="flex items-center justify-center gap-2 text-sm text-amber-600 pt-2"><Loader2 className="w-4 h-4 animate-spin" />Đang chờ thanh toán…</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground text-center">Mã nhận {asset.symbol} không kèm số tiền (người gửi tự nhập).</p>
        )}
      </div>

      <Card><CardContent className="p-4 space-y-2">
        <p className="text-sm text-muted-foreground">Địa chỉ ví nhận (BNB Smart Chain)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-lg break-all">{address}</code>
          <Button variant="outline" size="icon" onClick={() => copy(address)} aria-label="Sao chép địa chỉ">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</Button>
        </div>
      </CardContent></Card>

      {order ? (
        <Button variant="outline" className="w-full" onClick={reset}>Hủy đơn này</Button>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => navigator.share ? navigator.share({ title: "FUN Wallet", text: address }).catch(() => {}) : copy(address)}>
          <Share2 className="w-4 h-4 mr-2" />Chia sẻ địa chỉ ví
        </Button>
      )}
      <p className="text-xs text-muted-foreground">Mã QR theo chuẩn EIP-681: khách dùng ví FUN, MetaMask, Trust Wallet hoặc Binance Web3 đều quét trả được. Ví tự báo khi tiền về.</p>
    </div>
  );
};

/** Buyer side: scan a shop's QR, check balance and gas, then pay after confirmation. */
const PayPanel = ({ address, walletId, balances, prices, getKey, onLocked, onPaid }: {
  address: string; walletId: string; balances: { symbol: string; address: string | null; balance: string }[];
  prices: Record<string, number>; getKey: () => string | null; onLocked: () => void; onPaid: () => void;
}) => {
  const { user } = useAuth();
  const [req, setReq] = useState<PayRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pasted, setPasted] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ hash: string; raw: bigint } | null>(null);
  const scanner = useRef<Html5Qrcode | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const stop = async () => {
    const s = scanner.current;
    scanner.current = null;
    setScanning(false);
    if (s) { try { await s.stop(); s.clear(); } catch { /* already stopped */ } }
  };
  useEffect(() => () => { void stop(); }, []);

  const read = (text: string) => {
    try {
      const r = parsePayRequest(text, assetOf(DEFAULT_ASSET));
      setReq(r); setError(null); setAmount(""); setDone(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mã QR không hợp lệ");
      return false;
    }
  };

  const start = async () => {
    setError(null); setReq(null); setDone(null);
    setScanning(true);
    await new Promise(r => setTimeout(r, 50));
    try {
      const s = new Html5Qrcode("pay-qr-reader");
      scanner.current = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, text => { if (read(text)) void stop(); }, () => {});
    } catch {
      setScanning(false);
      setError("Không mở được camera. Hãy cho phép trình duyệt dùng camera, hoặc dán mã bên dưới.");
    }
  };

  // Read a QR from a photo or screenshot, for computers without a back camera
  const fromImage = async (file: File | undefined) => {
    if (!file) return;
    await stop();
    setError(null); setReq(null); setDone(null);
    try {
      const text = await new Html5Qrcode("pay-qr-file").scanFile(file, false);
      read(text);
    } catch {
      setError("Không tìm thấy mã QR trong ảnh. Chọn ảnh rõ nét, chụp thẳng mã QR.");
    }
  };

  const raw = useMemo(() => {
    if (!req) return null;
    if (req.raw) return req.raw;
    try { return Number(amount) > 0 ? ethers.parseUnits(amount.trim(), req.asset.decimals) : null; } catch { return null; }
  }, [req, amount]);

  if (!req || done) {
    return (
      <div className="space-y-4">
        {done && req && (
          <Card className="border-green-500/50"><CardContent className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <p className="text-sm text-muted-foreground">Thanh toán thành công</p>
            <p className="text-3xl font-bold text-green-600">{fmtRaw(done.raw, req.asset.decimals)} {req.asset.symbol}</p>
            <p className="text-sm">Đến <span className="font-mono">{short(req.to)}</span></p>
            <a href={`https://bscscan.com/tx/${done.hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">Xem trên BscScan <ExternalLink className="w-3 h-3" /></a>
          </CardContent></Card>
        )}
        <div className={`overflow-hidden rounded-2xl bg-black ${scanning ? "" : "hidden"}`}><div id="pay-qr-reader" className="w-full" /></div>
        {scanning ? (
          <Button variant="outline" className="w-full" onClick={() => void stop()}>Dừng quét</Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button className="h-14 text-base font-semibold" onClick={() => void start()}><ScanLine className="w-5 h-5 mr-2" />{done ? "Quét mã khác" : "Quét bằng camera"}</Button>
            <Button variant="outline" className="h-14 text-base" onClick={() => fileInput.current?.click()}><ImageIcon className="w-5 h-5 mr-2" />Chọn ảnh mã QR</Button>
          </div>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={e => { void fromImage(e.target.files?.[0]); e.target.value = ""; }} />
        <div id="pay-qr-file" className="hidden" />
        {error && <p className="flex gap-2 text-sm text-destructive"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}
        <Card><CardContent className="p-4 space-y-2">
          <p className="text-sm text-muted-foreground">Hoặc dán mã thanh toán / địa chỉ ví</p>
          <div className="flex gap-2">
            <Input value={pasted} onChange={e => setPasted(e.target.value)} placeholder="ethereum:0x… hoặc 0x…" />
            <Button variant="secondary" disabled={!pasted.trim()} onClick={() => read(pasted)}>Đọc</Button>
          </div>
        </CardContent></Card>
      </div>
    );
  }

  const holding = balances.find(b => (req.asset.token === NATIVE ? b.address === null : b.address?.toLowerCase() === req.asset.token.toLowerCase()));
  const have = holding ? Number(holding.balance) : 0;
  const bnb = Number(balances.find(b => b.address === null)?.balance ?? 0);
  const want = raw ? Number(ethers.formatUnits(raw, req.asset.decimals)) : 0;
  const native = req.asset.token === NATIVE;
  const gasShort = native ? have < want + 0.0002 : bnb < 0.0002;
  const self = req.to.toLowerCase() === address.toLowerCase();
  const price = prices[req.asset.symbol.toUpperCase()];
  const problem = self ? "Đây là ví của chính bạn" : !raw ? null : want > have ? `Không đủ ${req.asset.symbol} (đang có ${formatBalance(String(have))})` : gasShort ? "Không đủ BNB trả phí mạng (cần khoảng 0.0002 BNB)" : null;

  const pay = async () => {
    if (!raw || problem) return;
    const key = getKey();
    if (!key) { toast({ title: "Ví đang khóa", description: "Nhập mật khẩu ví rồi bấm thanh toán lại" }); onLocked(); return; }
    setBusy(true);
    try {
      const human = ethers.formatUnits(raw, req.asset.decimals);
      const result = native ? await sendBNB(key, req.to, human) : await sendToken(key, req.asset.token, req.to, human, req.asset.decimals);
      if ("error" in result) throw Error(result.error);
      const receipt = await getProvider().waitForTransaction(result.hash, 1, 120_000);
      if (receipt?.status !== 1) throw Error("Giao dịch không thành công trên mạng BSC");
      if (user) await supabase.from("transactions").insert({
        user_id: user.id, wallet_id: walletId, tx_hash: result.hash, tx_type: "send", token_symbol: req.asset.symbol,
        token_address: native ? null : req.asset.token, amount: human, from_address: address, to_address: req.to, status: "success",
      });
      setDone({ hash: result.hash, raw });
      onPaid();
    } catch (e) {
      toast({ title: "Thanh toán chưa thực hiện", description: e instanceof Error ? e.message : "Lỗi không xác định", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Card><CardContent className="p-5 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">Thanh toán cho</p>
        <p className="font-mono text-lg">{short(req.to)}</p>
        <p className="text-xs text-muted-foreground break-all">{req.to}</p>
      </div>
      {req.raw ? (
        <div className="text-center">
          <p className="text-3xl font-bold">{fmtRaw(req.raw, req.asset.decimals)} {req.asset.symbol}</p>
          {price && <p className="text-muted-foreground">≈ {formatUsdValue(want * price)}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Số {req.asset.symbol} muốn trả</label>
          <Input inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value.replace(",", "."))} className="text-lg h-12" autoFocus />
          {price && want > 0 && <p className="text-sm text-muted-foreground">≈ {formatUsdValue(want * price)}</p>}
        </div>
      )}
      <div className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Coin</span><span>{req.asset.symbol} · BNB Smart Chain</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Số dư của bạn</span><span>{formatBalance(String(have))} {req.asset.symbol}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Phí mạng</span><span>≈ 0.0001 BNB</span></div>
      </div>
      {problem && <p className="flex gap-2 text-sm text-destructive"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{problem}</p>}
      <p className="text-xs text-muted-foreground">Kiểm tra đúng người bán và số tiền. Giao dịch trên blockchain không hoàn lại được.</p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" disabled={busy} onClick={() => { setReq(null); setError(null); }}>Hủy</Button>
        <Button className="font-semibold" disabled={busy || !raw || !!problem} onClick={() => void pay()}>
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang trả…</> : "Xác nhận thanh toán"}
        </Button>
      </div>
    </CardContent></Card>
  );
};

export default QRPayment;
