import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
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
              {isSignUp ? "Tạo tài khoản mới" : "Đăng nhập vào ví của bạn"}
            </p>
          </div>

          {/* Form */}
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
