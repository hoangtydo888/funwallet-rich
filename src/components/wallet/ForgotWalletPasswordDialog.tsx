import { useCallback, useEffect, useState } from "react";
import { HDNodeWallet, Wallet } from "ethers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletSecurity } from "@/contexts/WalletSecurityContext";
import { getSecureStorage, MIN_WALLET_PASSWORD_LENGTH } from "@/lib/keyEncryption";
import { exportEncryptedVault, resetVaultPassword } from "@/lib/vaultBackup";

/** Opens the dialog from anywhere, e.g. the unlock prompt. */
export const FORGOT_WALLET_PASSWORD_EVENT = "fun-wallet-forgot-password";
const PENDING_KEY = "fun_wallet_password_reset";
const PENDING_TTL = 60 * 60_000;

type Step = "email" | "code" | "reset";
interface Pending { userId: string; at: number }

const readPending = (userId: string): Pending | null => {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null");
    return p?.userId === userId && Number.isFinite(p.at) && Date.now() - p.at < PENDING_TTL ? p : null;
  } catch { return null; }
};
const clearPending = () => { try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ } };

/** True when the current session was signed in by an email code or link sent after `since`. */
async function emailVerifiedSince(since: number): Promise<boolean> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return false;
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return Array.isArray(claims.amr) && claims.amr.some((m: { method?: string; timestamp?: number }) =>
      (m.method === "otp" || m.method === "magiclink") && Number(m.timestamp) * 1000 >= since - 60_000);
  } catch { return false; }
}

const PHRASE_ACCOUNTS = 10;

/** Keys a recovery phrase can open (first accounts on the standard path, as
 * FUN Wallet and MetaMask derive them) or the one key a private key is. */
function keysFromSecret(secret: string): string[] {
  const text = secret.trim().replace(/\s+/g, " ");
  if (text.includes(" ")) {
    let root: HDNodeWallet;
    try { root = HDNodeWallet.fromPhrase(text.toLowerCase(), undefined, "m/44'/60'/0'/0"); } catch { throw Error("Cụm từ khôi phục không hợp lệ; kiểm tra lại từng từ"); }
    return Array.from({ length: PHRASE_ACCOUNTS }, (_, i) => root.deriveChild(i).privateKey);
  }
  if (!/^(0x)?[a-f0-9]{64}$/i.test(text)) throw Error("Nhập cụm từ khôi phục 12/24 từ hoặc khóa riêng 64 ký tự");
  return [new Wallet(`0x${text.replace(/^0x/i, "")}`).privateKey];
}

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

const maskEmail = (email: string) => email.replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");

export const ForgotWalletPasswordDialog = () => {
  const { user } = useAuth();
  const security = useWalletSecurity();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const email = user?.email ?? "";

  const start = useCallback(async () => {
    setCode(""); setSecret(""); setPassword(""); setConfirm(""); setError("");
    const pending = user ? readPending(user.id) : null;
    setStep(await emailVerifiedSince(Date.now() - PENDING_TTL) ? "reset" : pending ? "code" : "email");
    setOpen(true);
  }, [user]);

  useEffect(() => {
    const listener = () => void start();
    window.addEventListener(FORGOT_WALLET_PASSWORD_EVENT, listener);
    return () => window.removeEventListener(FORGOT_WALLET_PASSWORD_EVENT, listener);
  }, [start]);

  // Coming back from the link in the email reopens the dialog at the last step.
  useEffect(() => {
    const pending = user ? readPending(user.id) : null;
    if (pending) void emailVerifiedSince(pending.at).then(ok => { if (ok) void start(); });
  }, [user, start]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Không hoàn tất được thao tác"); }
    finally { setBusy(false); }
  };

  const sendEmail = () => run(async () => {
    if (!user || !email) throw Error("Tài khoản chưa có email; đăng nhập lại rồi thử lại");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/dashboard` } });
    if (error) {
      const wait = /after (\d+) seconds?/i.exec(error.message)?.[1];
      if (wait) throw Error(`Vừa gửi email; đợi ${wait} giây rồi gửi lại, hoặc dùng email đã nhận`);
      if (/rate limit/i.test(error.message)) throw Error("Đã gửi quá nhiều email trong giờ này. Hãy mở email mới nhất đã nhận và bấm Sign in, hoặc thử lại sau 1 giờ");
      throw Error(`Không gửi được email: ${error.message}`);
    }
    localStorage.setItem(PENDING_KEY, JSON.stringify({ userId: user.id, at: Date.now() }));
    setStep("code");
  });

  const verifyCode = () => run(async () => {
    const pending = user ? readPending(user.id) : null;
    if (!pending) { setStep("email"); throw Error("Yêu cầu đã hết hạn; gửi lại email"); }
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error || !await emailVerifiedSince(Date.now() - PENDING_TTL)) throw Error("Mã không đúng hoặc đã hết hạn");
    setStep("reset");
  });

  const reset = () => run(async () => {
    const pending = user ? readPending(user.id) : null;
    if (!await emailVerifiedSince(Date.now() - PENDING_TTL)) { setStep(pending ? "code" : "email"); throw Error("Cần xác nhận email lại"); }
    if (password.length < MIN_WALLET_PASSWORD_LENGTH) throw Error(`Mật khẩu mới cần ít nhất ${MIN_WALLET_PASSWORD_LENGTH} ký tự`);
    if (password !== confirm) throw Error("Mật khẩu nhập lại chưa khớp");
    const candidates = keysFromSecret(secret);
    const stored = Object.keys(getSecureStorage().wallets);
    const { data, error: walletsError } = await supabase.from("wallets").select("address").eq("user_id", user!.id);
    if (walletsError) throw Error("Chưa tải được danh sách ví của tài khoản; kiểm tra mạng rồi thử lại");
    const owned = new Set([...stored, ...(data ?? []).map(w => String(w.address).toLowerCase())]);
    const key = candidates.find(k => owned.has(new Wallet(k).address.toLowerCase()));
    if (!key) throw Error(`Cụm từ/khóa này mở ra ví ${short(new Wallet(candidates[0]).address)}, không trùng ví nào của tài khoản. Kiểm tra lại cụm từ của đúng ví.`);
    // Keep the other wallets' encrypted keys as a file: the old password can still restore them later.
    if (stored.length > 0) {
      const url = URL.createObjectURL(new Blob([exportEncryptedVault()], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `fun-wallet-encrypted-old-password-${Date.now()}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    await resetVaultPassword(key, password, [...owned]);
    security.clearFailedAttempts();
    if (!await security.unlock(password)) throw Error("Đã đặt mật khẩu mới; hãy mở khóa lại bằng mật khẩu mới");
    clearPending(); setOpen(false);
    toast({
      title: "Đã đặt mật khẩu ví mới",
      description: `Ví ${short(new Wallet(key).address)} đã mở khóa bằng mật khẩu mới.${stored.filter(a => a !== new Wallet(key).address.toLowerCase()).length ? " Ví khác trên máy cần thêm lại bằng cụm từ khôi phục, hoặc khôi phục tệp vừa tải về nếu nhớ ra mật khẩu cũ." : ""}`,
    });
  });

  return (
    <Dialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Quên mật khẩu ví</DialogTitle>
          <DialogDescription>
            {step === "reset" ? "Bước 2/2 — Xác nhận chủ ví và đặt mật khẩu mới" : "Bước 1/2 — Xác nhận qua email tài khoản"}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <div className="space-y-4">
            <p className="text-sm">Mình sẽ gửi mã xác nhận tới <b>{maskEmail(email)}</b>.</p>
            <Button className="w-full" disabled={busy} onClick={sendEmail}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-2" /> Gửi mã xác nhận</>}
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4">
            <p className="text-sm">Đã gửi email tới <b>{maskEmail(email)}</b>. Mở email "Your sign-in link" và bấm <b>Sign in</b> — ví sẽ tự mở bước tiếp theo. Nếu email có mã số, nhập mã vào ô dưới.</p>
            <div className="space-y-2">
              <Label htmlFor="reset-code">Mã xác nhận</Label>
              <Input id="reset-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="text-center text-lg tracking-widest" />
            </div>
            <Button className="w-full" disabled={busy || code.length < 6} onClick={verifyCode}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận mã"}
            </Button>
            <Button variant="ghost" className="w-full" disabled={busy} onClick={sendEmail}>Gửi lại email</Button>
          </div>
        )}

        {step === "reset" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50">
              Mật khẩu ví chỉ nằm trên thiết bị này, máy chủ không giữ khóa của bạn. Vì vậy cần cụm từ khôi phục (12/24 từ) hoặc khóa riêng của ví để chứng minh bạn là chủ ví.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-secret">Cụm từ khôi phục hoặc khóa riêng</Label>
              <Textarea id="reset-secret" rows={3} autoComplete="off" spellCheck={false} value={secret} onChange={e => setSecret(e.target.value)}
                placeholder="word1 word2 word3 …" className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password">Mật khẩu mới (ít nhất {MIN_WALLET_PASSWORD_LENGTH} ký tự)</Label>
              <Input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Nhập lại mật khẩu mới</Label>
              <Input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy || !secret || !password} onClick={reset}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Đặt mật khẩu mới"}
            </Button>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
      </DialogContent>
    </Dialog>
  );
};
