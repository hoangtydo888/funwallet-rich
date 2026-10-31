import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatUnits } from "ethers";
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnlockWalletDialog } from "@/components/wallet/UnlockWalletDialog";
import { useWalletSecurity } from "@/contexts/WalletSecurityContext";
import { useSecureWallet } from "@/hooks/useSecureWallet";
import { toast } from "@/hooks/use-toast";
import { FUN_MONEY, formatFun, getFunMoneyState, parseFun, runFunMoney, type FunAction, type FunMoneyState } from "@/lib/funMoney";

export const FUN_MONEY_LOGO = "/tokens/fun-money.png";
const MIN_GAS = 300_000_000_000_000n; // 0.0003 tBNB

/** FUN Money on BSC Testnet: balances, send, receive, and the activate → claim steps. */
export const FunMoneyDialog = ({ open, onOpenChange, address, onChanged }: { open: boolean; onOpenChange: (v: boolean) => void; address: string; onChanged?: () => void }) => {
  const { getUnlockedKey } = useWalletSecurity();
  const { unlock, failedAttempts, isLocked, lockoutEndTime } = useSecureWallet();
  const [state, setState] = useState<FunMoneyState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [busy, setBusy] = useState<FunAction | null>(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [lockAmount, setLockAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoadError(false);
    getFunMoneyState(address).then(setState).catch(() => setLoadError(true));
  }, [address]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const run = async (action: FunAction, raw: bigint, recipient?: string) => {
    const key = getUnlockedKey(address);
    if (!key) { toast({ title: "Ví đang khóa", description: "Nhập mật khẩu ví rồi thử lại" }); setUnlockOpen(true); return; }
    setBusy(action);
    try {
      const hash = await runFunMoney(key, action, raw, recipient);
      const done = action === "send" ? `Đã gửi ${formatFun(raw)} FUN` : action === "activate" ? `Đã kích hoạt ${formatFun(raw)} FUN` : `Đã nhận ${formatFun(raw)} FUN về ví`;
      toast({ title: `${done} ✅`, description: <a href={`${FUN_MONEY.explorer}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">Xem trên BscScan Testnet <ExternalLink className="h-3 w-3" /></a> });
      if (action === "send") { setTo(""); setAmount(""); }
      if (action === "activate") setLockAmount("");
      load(); onChanged?.();
    } catch (e) {
      toast({ title: "Chưa thực hiện được", description: e instanceof Error ? e.message : "Lỗi không xác định", variant: "destructive" });
    } finally { setBusy(null); }
  };

  const parsed = (v: string) => { try { return v && Number(v) > 0 ? parseFun(v.trim()) : null; } catch { return null; } };
  const sendRaw = parsed(amount);
  const lockRaw = parsed(lockAmount);
  const noGas = state !== null && state.gas < MIN_GAS;
  const copy = async () => { try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img src={FUN_MONEY_LOGO} alt="" className="w-10 h-10 rounded-full" />
              <span>FUN Money <span className="ml-1 align-middle rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600">Testnet</span></span>
            </DialogTitle>
            <DialogDescription>Mạng BNB Smart Chain Testnet (chain 97). FUN trên testnet chưa có giá trị giao dịch thật.</DialogDescription>
          </DialogHeader>

          {!state ? (
            <div className="flex justify-center py-6">
              {loadError ? <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Tải lại số dư</Button> : <Loader2 className="w-6 h-6 animate-spin" />}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Trong ví", state.balance], ["Đã kích hoạt", state.activated], ["Đang khóa", state.locked]].map(([label, v]) => (
                  <div key={label as string} className="rounded-xl bg-muted/50 px-2 py-3">
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                    <p className="font-bold">{formatFun(v as bigint)}</p>
                  </div>
                ))}
              </div>
              <div className={`rounded-xl p-3 text-xs ${noGas ? "bg-amber-500/10 text-amber-700" : "bg-muted/40 text-muted-foreground"}`}>
                Phí mạng testnet: {formatFun(state.gas)} tBNB.
                {noGas && <> Cần ít nhất 0.0003 tBNB để gửi, kích hoạt hoặc nhận FUN. Nhận tBNB miễn phí tại <a href={FUN_MONEY.faucet} target="_blank" rel="noopener noreferrer" className="underline font-semibold">vòi testnet của BNB Chain</a>, dán địa chỉ ví của bạn vào đó.</>}
              </div>

              <Tabs defaultValue={state.locked > 0n || state.activated > 0n ? "activate" : "send"}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="send">Gửi</TabsTrigger>
                  <TabsTrigger value="receive">Nhận</TabsTrigger>
                  <TabsTrigger value="activate">Kích hoạt</TabsTrigger>
                </TabsList>

                <TabsContent value="send" className="space-y-3 pt-2">
                  <Input placeholder="Địa chỉ ví người nhận (0x…)" value={to} onChange={e => setTo(e.target.value.trim())} />
                  <div className="flex gap-2">
                    <Input inputMode="decimal" placeholder="Số FUN" value={amount} onChange={e => setAmount(e.target.value.replace(",", "."))} />
                    <Button variant="outline" onClick={() => setAmount(formatUnits(state.balance, FUN_MONEY.decimals))}>Tối đa</Button>
                  </div>
                  {sendRaw !== null && sendRaw > state.balance && <p className="text-sm text-destructive">Vượt số FUN trong ví</p>}
                  <Button className="w-full" disabled={!!busy || noGas || sendRaw === null || sendRaw > state.balance || !to} onClick={() => sendRaw && void run("send", sendRaw, to)}>
                    {busy === "send" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Gửi FUN
                  </Button>
                  <p className="text-xs text-muted-foreground">Chỉ gửi được FUN đang nằm trong ví. FUN đang khóa hoặc đã kích hoạt cần nhận về ví trước.</p>
                </TabsContent>

                <TabsContent value="receive" className="space-y-3 pt-2 text-center">
                  <div className="inline-block p-3 bg-white rounded-2xl">
                    <QRCodeSVG value={address} size={200} level="H" includeMargin imageSettings={{ src: FUN_MONEY_LOGO, width: 48, height: 48, excavate: true }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg break-all text-left">{address}</code>
                    <Button variant="outline" size="icon" onClick={copy} aria-label="Sao chép địa chỉ">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Người gửi phải chọn mạng <b>BSC Testnet</b>. Cùng một địa chỉ ví dùng cho cả mạng chính và testnet.</p>
                </TabsContent>

                <TabsContent value="activate" className="space-y-4 pt-2">
                  <div className="rounded-xl border p-3 space-y-2">
                    <p className="text-sm"><b>Bước 1 · Kích hoạt</b> FUN đang khóa ({formatFun(state.locked)} FUN)</p>
                    <div className="flex gap-2">
                      <Input inputMode="decimal" placeholder="Số FUN" value={lockAmount} onChange={e => setLockAmount(e.target.value.replace(",", "."))} disabled={state.locked === 0n} />
                      <Button variant="outline" disabled={state.locked === 0n} onClick={() => setLockAmount(formatUnits(state.locked, FUN_MONEY.decimals))}>Tất cả</Button>
                    </div>
                    <Button className="w-full" disabled={!!busy || noGas || lockRaw === null || lockRaw > state.locked} onClick={() => lockRaw && void run("activate", lockRaw)}>
                      {busy === "activate" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Kích hoạt
                    </Button>
                  </div>
                  <div className="rounded-xl border p-3 space-y-2">
                    <p className="text-sm"><b>Bước 2 · Nhận về ví</b> FUN đã kích hoạt ({formatFun(state.activated)} FUN)</p>
                    <Button className="w-full" disabled={!!busy || noGas || state.activated === 0n} onClick={() => void run("claim", state.activated)}>
                      {busy === "claim" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Nhận {formatFun(state.activated)} FUN về ví
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              <a href={`${FUN_MONEY.explorer}/token/${FUN_MONEY.address}?a=${address}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs text-muted-foreground underline">Xem FUN của ví trên BscScan Testnet <ExternalLink className="w-3 h-3" /></a>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <UnlockWalletDialog open={unlockOpen} onOpenChange={setUnlockOpen} onUnlock={unlock} failedAttempts={failedAttempts} isLocked={isLocked} lockoutEndTime={lockoutEndTime} />
    </>
  );
};
