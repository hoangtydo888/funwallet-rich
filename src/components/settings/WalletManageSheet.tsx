import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, EyeOff, Pencil, ShieldCheck, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SetupPasswordDialog } from "@/components/wallet/SetupPasswordDialog";
import { useSecureWallet } from "@/hooks/useSecureWallet";
import { hasRecoveryPhrase, revealRecoveryPhrase } from "@/lib/recoveryPhraseStore";
import { toast } from "@/hooks/use-toast";
import type { WalletData } from "@/hooks/useWallet";

type SecretKind = "privateKey" | "phrase";
type View = { name: "list" } | { name: "detail"; id: string } | { name: "secret"; id: string; kind: SecretKind };

interface WalletManageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: WalletData[];
  activeWalletId?: string;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onSaveOrder: (ids: string[]) => void;
}

const SECRET_VISIBLE_MS = 60_000;
const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Bitget-style wallet management: reorder list → wallet detail → rename,
// reveal private key / recovery phrase (password + no-screenshot notice), hide wallet.
export function WalletManageSheet({ open, onOpenChange, wallets, activeWalletId, onRename, onDelete, onSaveOrder }: WalletManageSheetProps) {
  const security = useSecureWallet();
  const [view, setView] = useState<View>({ name: "list" });
  const [order, setOrder] = useState<string[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [askPassword, setAskPassword] = useState(false);
  const [screenshotNotice, setScreenshotNotice] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) { setView({ name: "list" }); setOrder(wallets.map((w) => w.id)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The revealed secret disappears when leaving the screen, after a minute, or when the app goes to background
  useEffect(() => { setSecret(null); setRenaming(false); }, [view]);
  useEffect(() => {
    if (!secret) return;
    const timer = setTimeout(() => setSecret(null), SECRET_VISIBLE_MS);
    const hide = () => { if (document.hidden) setSecret(null); };
    document.addEventListener("visibilitychange", hide);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", hide); };
  }, [secret]);

  const byId = (id: string) => wallets.find((w) => w.id === id);
  const ordered = order.map(byId).filter((w): w is WalletData => !!w);
  const current = view.name === "list" ? undefined : byId(view.id);

  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const saveOrder = () => {
    onSaveOrder(order);
    toast({ title: "Đã lưu thứ tự ví" });
    onOpenChange(false);
  };

  const saveName = async () => {
    const name = newName.trim();
    if (!current || !name) return;
    if (await onRename(current.id, name)) { setRenaming(false); toast({ title: "Đã đổi tên ví" }); }
  };

  const openSecret = (kind: SecretKind) => {
    if (!current) return;
    setView({ name: "secret", id: current.id, kind });
    setScreenshotNotice(true);
  };

  const reveal = async (password: string) => {
    if (view.name !== "secret" || !current) return;
    const value = view.kind === "privateKey"
      ? await security.getDecryptedKey(current.address, password)
      : await revealRecoveryPhrase(current.address, password).catch(() => null);
    if (!value) throw Error("Mật khẩu không đúng hoặc ví chưa có khóa trên thiết bị này");
    setSecret(value);
    setAskPassword(false);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Đã sao chép", description: "Dán vào nơi an toàn rồi xóa clipboard." });
  };

  const hideWallet = async () => {
    if (!current) return;
    if (await onDelete(current.id)) {
      setOrder((o) => o.filter((id) => id !== current.id));
      setView({ name: "list" });
      toast({ title: "Đã xóa hiển thị ví", description: "Tiền trong ví không mất. Nhập lại cụm từ để hiện lại." });
    }
    setConfirmDelete(false);
  };

  const header = (title: string, onBack: () => void, action?: ReactNode) => (
    <div className="flex items-center gap-2 pb-2">
      <button onClick={onBack} className="rounded-full p-1 hover:bg-muted" aria-label="Quay lại"><ChevronLeft className="h-6 w-6" /></button>
      <DialogTitle className="flex-1 text-xl font-heading">{title}</DialogTitle>
      {action}
    </div>
  );

  const secretView = () => {
    if (view.name !== "secret" || !current) return null;
    const isKey = view.kind === "privateKey";
    const available = isKey ? security.hasKey(current.address) : hasRecoveryPhrase(current.address);
    const words = !isKey && secret ? secret.split(" ") : [];
    const keyParts = isKey && secret ? secret.replace(/^0x/, "").match(/.{1,16}/g) ?? [] : [];
    return (
      <>
        {header(isKey ? "Khoá riêng tư" : "Xem cụm từ ghi nhớ", () => setView({ name: "detail", id: current.id }))}
        <p className="text-sm text-muted-foreground">
          {isKey
            ? "Hãy đảm bảo rằng bạn không bị ghi hình và không bao giờ chia sẻ với bất kỳ ai. Để tránh bị đánh cắp khoá riêng tư, hãy sao chép theo từng đoạn."
            : "Ghi lại các từ sau theo đúng thứ tự và lưu trữ chúng an toàn. Không chia sẻ cụm từ với bất kỳ ai để tránh mất tài sản."}
        </p>
        {!available ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {isKey
              ? "Thiết bị này chưa có khoá của ví này (ví chỉ xem). Hãy nhập ví bằng cụm từ 12/24 từ để dùng trên thiết bị này."
              : "Thiết bị này chưa lưu cụm từ của ví này. Cụm từ chỉ được lưu cho ví tạo mới hoặc nhập bằng cụm từ từ nay về sau. Hãy dùng bản ghi giấy bạn đã cất giữ."}
          </div>
        ) : !secret ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl bg-muted/60 p-6 text-center">
            <EyeOff className="h-10 w-10" />
            <p className="text-sm">Đảm bảo không có ai đang theo dõi hoặc ghi hình bạn.</p>
            <Button variant="outline" onClick={() => setAskPassword(true)}>{isKey ? "Khoá riêng tư" : "Xem cụm từ ghi nhớ"}</Button>
          </div>
        ) : isKey ? (
          <div className="space-y-2">
            {keyParts.map((part, i) => (
              <button key={i} onClick={() => copy(part)} className="flex w-full items-center justify-between rounded-lg border px-3 py-2 font-mono text-sm hover:bg-muted">
                <span>{i === 0 ? "0x" : ""}{part}</span><Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            <p className="text-xs text-muted-foreground">Bấm từng đoạn để sao chép. Khoá tự ẩn sau 1 phút.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {words.map((word, i) => (
                <div key={i} className="rounded-lg border px-2 py-2 text-sm"><span className="mr-1 text-muted-foreground">{i + 1}.</span>{word}</div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Chép tay ra giấy. Cụm từ tự ẩn sau 1 phút.</p>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[460px] [&>button]:hidden">
          {view.name === "list" && (
            <>
              {header("Ví", () => onOpenChange(false), <Button variant="ghost" className="text-primary" onClick={saveOrder}>Lưu</Button>)}
              <div className="space-y-1">
                {ordered.map((w, i) => (
                  <div key={w.id} className={`flex items-center gap-3 rounded-xl p-3 ${w.id === activeWalletId ? "bg-primary/10" : ""}`}>
                    <img src="/fun-wallet-icon-128.png" alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{w.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{shortAddress(w.address)}</p>
                    </div>
                    <button onClick={() => setView({ name: "detail", id: w.id })} className="rounded-full p-2 hover:bg-muted" aria-label={`Sửa ${w.name}`}><Pencil className="h-4 w-4" /></button>
                    <div className="flex flex-col">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 hover:bg-muted disabled:opacity-30" aria-label="Lên"><ArrowUp className="h-4 w-4" /></button>
                      <button onClick={() => move(i, 1)} disabled={i === ordered.length - 1} className="rounded p-0.5 hover:bg-muted disabled:opacity-30" aria-label="Xuống"><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {view.name === "detail" && current && (
            <>
              {header("", () => setView({ name: "list" }))}
              <div className="flex flex-col items-center gap-1 pb-4 text-center">
                <img src="/fun-wallet-icon-128.png" alt="" className="h-20 w-20 object-contain" />
                <p className="mt-2 text-lg font-semibold">{current.name}</p>
                <button onClick={() => copy(current.address)} className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  {shortAddress(current.address)} <Copy className="h-3 w-3" />
                </button>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  Mức độ bảo mật
                  {security.hasKey(current.address)
                    ? <><ShieldCheck className="h-4 w-4 text-primary" /> Cao</>
                    : <><ShieldAlert className="h-4 w-4 text-amber-500" /> Chỉ xem trên thiết bị này</>}
                </p>
              </div>
              <div className="divide-y border-y">
                {renaming ? (
                  <div className="flex gap-2 py-3">
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} autoFocus />
                    <Button onClick={saveName} disabled={!newName.trim()}>Lưu</Button>
                  </div>
                ) : (
                  <button onClick={() => { setNewName(current.name); setRenaming(true); }} className="flex w-full items-center justify-between py-4 text-left">
                    <span>Tên ví</span>
                    <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground"><span className="truncate">{current.name}</span><ChevronRight className="h-4 w-4 shrink-0" /></span>
                  </button>
                )}
                <button onClick={() => openSecret("privateKey")} className="flex w-full items-center justify-between py-4 text-left">
                  <span>Khoá riêng tư</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={() => openSecret("phrase")} className="flex w-full items-center justify-between py-4 text-left">
                  <span>Xem cụm từ ghi nhớ</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <Button variant="outline" className="mt-6 w-full rounded-full border-destructive text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                Xóa Hiển thị
              </Button>
            </>
          )}

          {view.name === "secret" && secretView()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={screenshotNotice} onOpenChange={setScreenshotNotice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Không chụp màn hình</AlertDialogTitle>
            <AlertDialogDescription>Chụp màn hình làm tăng nguy cơ lộ thông tin. Để bảo vệ tài sản của bạn an toàn, hãy ghi chép thay vì chụp màn hình.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="w-full">Đã hiểu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hiển thị ví này?</AlertDialogTitle>
            <AlertDialogDescription>
              Ví sẽ được ẩn khỏi danh sách. Tiền trong ví không bị mất. Muốn dùng lại, hãy nhập lại cụm từ 12/24 từ của ví.
              {current?.id === activeWalletId && " Đây là ví đang dùng: FUN Wallet sẽ chuyển sang ví khác."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={hideWallet} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa hiển thị</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SetupPasswordDialog
        open={askPassword}
        onOpenChange={setAskPassword}
        mode="enter"
        title="Nhập mật khẩu ví"
        description="Nhập mật khẩu ví để xem. Không ai trong đội ngũ FUN sẽ hỏi bạn thông tin này."
        onPasswordSet={reveal}
      />
    </>
  );
}
