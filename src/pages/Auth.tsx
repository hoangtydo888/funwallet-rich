import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, Wallet, Mail, Lock, User } from "lucide-react";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự").max(50, "Tên không được quá 50 ký tự"),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

const newPasswordSchema = z.object({
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

const isNetworkError = (message: string) => /network|fetch|load failed/i.test(message);
const networkToast = () => toast({
  title: "Lỗi kết nối",
  description: "Không thể kết nối đến server. Vui lòng kiểm tra mạng và thử lại.",
  variant: "destructive",
});

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
  </svg>
);

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  // "forgot" sends the reset email; "reset" sets a new password after the email link.
  const [mode, setMode] = useState<"credentials" | "forgot" | "reset">(searchParams.get("mode") === "reset" ? "reset" : "credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => subscription.unsubscribe();
  }, []);

  const switchMode = (next: "credentials" | "forgot") => {
    setMode(next);
    setErrors({});
    setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = z.string().trim().email("Email không hợp lệ").safeParse(formData.email);
    if (!email.success) { setErrors({ email: email.error.errors[0].message }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) {
        if (isNetworkError(error.message)) networkToast();
        else toast({ title: "Không gửi được email", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Đã gửi email", description: "Mở liên kết trong email để đặt mật khẩu mới." });
      switchMode("credentials");
    } catch { networkToast(); }
    finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = newPasswordSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.password });
      if (error) {
        if (isNetworkError(error.message)) networkToast();
        else toast({ title: "Không đặt được mật khẩu", description: "Liên kết có thể đã hết hạn. Hãy yêu cầu email mới.", variant: "destructive" });
        return;
      }
      toast({ title: "Đã đổi mật khẩu", description: "Chào mừng bạn trở lại FUN Wallet." });
      navigate("/dashboard");
    } catch { networkToast(); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        if (isNetworkError(error.message)) networkToast();
        else toast({ title: "Chưa đăng nhập được với Google", description: error.message, variant: "destructive" });
        setLoading(false);
      }
      // On success the browser leaves for Google, so keep the spinner.
    } catch { networkToast(); setLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isSignUp) {
        const result = signUpSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.displayName);
        if (error) {
          let errorTitle = "Lỗi đăng ký";
          let errorDescription = error.message;

          if (error.message.includes("already registered") || error.message.includes("User already registered")) {
            errorTitle = "Email đã được đăng ký";
            errorDescription = "Vui lòng đăng nhập hoặc sử dụng email khác.";
          } else if (error.message.includes("confirmation email") || error.message.includes("sending email") || error.message.includes("domain is not verified")) {
            errorTitle = "Đăng ký thành công!";
            errorDescription = "Tài khoản đã được tạo. Bạn có thể đăng nhập ngay.";
            // Account was created but email failed - still allow login
            toast({
              title: errorTitle,
              description: errorDescription,
            });
            setIsSignUp(false);
            setFormData(prev => ({ ...prev, confirmPassword: "", displayName: "" }));
            return;
          } else if (error.message.includes("Password should be")) {
            errorTitle = "Mật khẩu không đủ mạnh";
            errorDescription = "Mật khẩu cần có ít nhất 6 ký tự.";
          } else if (error.message.includes("Invalid email")) {
            errorTitle = "Email không hợp lệ";
            errorDescription = "Vui lòng nhập địa chỉ email đúng định dạng.";
          } else if (error.message.includes("Network") || error.message.includes("fetch") || error.message.includes("Load failed")) {
            errorTitle = "Lỗi kết nối";
            errorDescription = "Không thể kết nối đến server. Vui lòng kiểm tra mạng và thử lại.";
          }

          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Đăng ký thành công!",
            description: "Tài khoản đã được tạo. Bạn có thể đăng nhập ngay.",
          });
          setIsSignUp(false);
          setFormData(prev => ({ ...prev, confirmPassword: "", displayName: "" }));
        }
      } else {
        const result = signInSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          let errorTitle = "Lỗi đăng nhập";
          let errorDescription = error.message;

          if (error.message.includes("Invalid login credentials")) {
            errorTitle = "Thông tin đăng nhập không đúng";
            errorDescription = "Vui lòng kiểm tra lại email và mật khẩu.";
          } else if (error.message.includes("Email not confirmed")) {
            errorTitle = "Email chưa được xác nhận";
            errorDescription = "Vui lòng kiểm tra hộp thư để xác nhận email, hoặc thử đăng ký lại.";
          } else if (error.message.includes("Network") || error.message.includes("fetch") || error.message.includes("Load failed")) {
            errorTitle = "Lỗi kết nối";
            errorDescription = "Không thể kết nối đến server. Vui lòng kiểm tra mạng và thử lại.";
          } else if (error.message.includes("Too many requests")) {
            errorTitle = "Quá nhiều yêu cầu";
            errorDescription = "Vui lòng đợi một lát rồi thử lại.";
          }

          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Đăng nhập thành công!",
            description: "Chào mừng bạn trở lại FUN Wallet.",
          });
          navigate("/dashboard");
        }
      }
    } catch (err) {
      toast({
        title: "Đã xảy ra lỗi",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại trang chủ</span>
        </Link>

        {/* Auth card */}
        <div className="glass-card rounded-3xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 mb-4">
              <img src="/logo.gif?v=1" alt="FUN Wallet" className="w-full h-full logo-pulse" />
            </div>
            <p className="text-muted-foreground mt-2">
              {mode === "forgot" ? "Nhập email để nhận liên kết đặt lại mật khẩu" : mode === "reset" ? "Đặt mật khẩu mới cho ví của bạn" : isSignUp ? "Tạo tài khoản mới" : "Đăng nhập vào ví của bạn"}
            </p>
          </div>

          {/* Form */}
          {mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="forgot-email" name="email" type="email" autoComplete="email" placeholder="example@email.com"
                    value={formData.email} onChange={handleChange} className="pl-10 bg-muted/50 border-border/50" />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 py-6 text-lg rounded-xl">
                {loading ? "Đang gửi..." : "Gửi liên kết đặt lại"}
              </Button>
              <button type="button" onClick={() => switchMode("credentials")} className="w-full text-sm text-primary hover:underline">
                Quay lại đăng nhập
              </button>
            </form>
          ) : mode === "reset" ? (
            <form onSubmit={handleReset} className="space-y-4">
              {(["password", "confirmPassword"] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={`reset-${field}`}>{field === "password" ? "Mật khẩu mới" : "Xác nhận mật khẩu mới"}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id={`reset-${field}`} name={field} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••"
                      value={formData[field]} onChange={handleChange} className="pl-10 pr-10 bg-muted/50 border-border/50" />
                    {field === "password" && (
                      <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {errors[field] && <p className="text-sm text-destructive">{errors[field]}</p>}
                </div>
              ))}
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 py-6 text-lg rounded-xl">
                {loading ? "Đang lưu..." : "Lưu mật khẩu mới"}
              </Button>
            </form>
          ) : (<>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Tên hiển thị</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="Nhập tên của bạn"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="pl-10 bg-muted/50 border-border/50"
                  />
                </div>
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-muted/50 border-border/50"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-muted/50 border-border/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              {!isSignUp && (
                <div className="text-right">
                  <button type="button" onClick={() => switchMode("forgot")} className="text-sm text-primary hover:underline">
                    Quên mật khẩu?
                  </button>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 bg-muted/50 border-border/50"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 py-6 text-lg rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Đang xử lý...
                </span>
              ) : isSignUp ? (
                "Tạo tài khoản"
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6 text-sm text-muted-foreground">
            <span className="h-px flex-1 bg-border" />Hoặc tiếp tục với<span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            <Button type="button" variant="outline" disabled={loading} onClick={handleGoogle} className="w-full py-6 rounded-xl gap-3 text-base">
              <GoogleIcon /> Đăng nhập với Google
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/")} className="w-full py-6 rounded-xl text-base text-primary border border-primary/30">
              Tiếp tục không đăng nhập
            </Button>
          </div>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrors({});
                setFormData({ displayName: "", email: "", password: "", confirmPassword: "" });
              }}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? "Đăng nhập" : "Đăng ký ngay"}
            </button>
          </div>
          </>)}
        </div>

        {/* Info text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Bằng việc tiếp tục, bạn đồng ý với{" "}
          <a href="#" className="text-primary hover:underline">Điều khoản sử dụng</a> và{" "}
          <a href="#" className="text-primary hover:underline">Chính sách bảo mật</a> của FUN Wallet.
        </p>
      </div>
    </div>
  );
};

export default Auth;
