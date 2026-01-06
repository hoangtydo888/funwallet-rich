import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Upload, CheckCircle2, Clock, AlertCircle, User, FileText, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useKYC, type KYCFormData } from "@/hooks/useKYC";

const steps = [
  { id: 1, title: "Thông tin", icon: User },
  { id: 2, title: "Giấy tờ", icon: FileText },
  { id: 3, title: "Xác nhận", icon: ShieldCheck },
];

const countries = [
  { code: "VN", name: "Việt Nam" },
  { code: "US", name: "United States" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
];

const KYC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { kycStatus, isLoading: kycLoading, submitKYC, isSubmitting, uploadProgress } = useKYC();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<KYCFormData>({
    fullName: "",
    dateOfBirth: "",
    nationality: "VN",
    idNumber: "",
    phone: "",
    address: "",
  });
  
  // File states
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  
  // Preview states
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  // File input refs
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // If already submitted, show step 3
  useEffect(() => {
    if (kycStatus === 'submitted' || kycStatus === 'approved') {
      setCurrentStep(3);
    }
  }, [kycStatus]);

  if (authLoading || kycLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleInputChange = (field: keyof KYCFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type: "front" | "back" | "selfie", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === "front") {
        setFrontFile(file);
        setFrontPreview(preview);
      } else if (type === "back") {
        setBackFile(file);
        setBackPreview(preview);
      } else {
        setSelfieFile(file);
        setSelfiePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!frontFile || !backFile || !selfieFile) return;

    submitKYC({ 
      formData, 
      documents: { 
        idFront: frontFile, 
        idBack: backFile, 
        selfie: selfieFile 
      } 
    }, {
      onSuccess: () => {
        setCurrentStep(3);
      }
    });
  };

  const canProceedStep1 = formData.fullName && formData.dateOfBirth && formData.idNumber && formData.phone;
  const canProceedStep2 = frontFile && backFile && selfieFile;

  return (
    <div className="min-h-screen bg-background page-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Xác minh danh tính</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Progress Steps */}
        <div className="relative slide-up">
          <div className="flex justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isCompleted ? "bg-success text-success-foreground" :
                    isCurrent ? "bg-primary text-primary-foreground glow" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs ${isCurrent ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="h-1" />
        </div>

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <Card className="glass-card">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên (theo CMND/CCCD)</Label>
                  <Input
                    id="fullName"
                    placeholder="NGUYEN VAN A"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value.toUpperCase())}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationality">Quốc tịch</Label>
                  <Select value={formData.nationality} onValueChange={(v) => handleInputChange("nationality", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">Số CMND/CCCD</Label>
                  <Input
                    id="idNumber"
                    placeholder="012345678901"
                    value={formData.idNumber}
                    onChange={(e) => handleInputChange("idNumber", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0912345678"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ thường trú</Label>
                  <Input
                    id="address"
                    placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full bg-primary hover:bg-primary/90 btn-hover-scale"
              disabled={!canProceedStep1}
              onClick={() => setCurrentStep(2)}
            >
              Tiếp tục
            </Button>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <Card className="glass-card">
              <CardContent className="p-4 space-y-4">
                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={frontInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange("front", e)}
                />
                <input
                  type="file"
                  ref={backInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange("back", e)}
                />
                <input
                  type="file"
                  ref={selfieInputRef}
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => handleFileChange("selfie", e)}
                />

                <div className="space-y-2">
                  <Label>Mặt trước CMND/CCCD</Label>
                  <div 
                    onClick={() => frontInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      frontPreview ? "border-success bg-success/10" : "border-border hover:border-primary"
                    }`}
                  >
                    {frontPreview ? (
                      <div className="space-y-2">
                        <img src={frontPreview} alt="Front ID" className="max-h-24 mx-auto rounded" />
                        <div className="flex items-center justify-center gap-2 text-success">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">Đã tải lên</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Nhấn để tải ảnh lên</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mặt sau CMND/CCCD</Label>
                  <div 
                    onClick={() => backInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      backPreview ? "border-success bg-success/10" : "border-border hover:border-primary"
                    }`}
                  >
                    {backPreview ? (
                      <div className="space-y-2">
                        <img src={backPreview} alt="Back ID" className="max-h-24 mx-auto rounded" />
                        <div className="flex items-center justify-center gap-2 text-success">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">Đã tải lên</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Nhấn để tải ảnh lên</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ảnh selfie cầm CMND/CCCD</Label>
                  <div 
                    onClick={() => selfieInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      selfiePreview ? "border-success bg-success/10" : "border-border hover:border-primary"
                    }`}
                  >
                    {selfiePreview ? (
                      <div className="space-y-2">
                        <img src={selfiePreview} alt="Selfie" className="max-h-24 mx-auto rounded" />
                        <div className="flex items-center justify-center gap-2 text-success">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">Đã tải lên</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Chụp ảnh selfie</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-warning/50">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Lưu ý khi chụp ảnh:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Đảm bảo ảnh rõ nét, không bị mờ</li>
                    <li>• Chụp đầy đủ 4 góc giấy tờ</li>
                    <li>• Selfie phải thấy rõ mặt và CMND</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 btn-hover-scale" onClick={() => setCurrentStep(1)}>
                Quay lại
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 btn-hover-scale"
                disabled={!canProceedStep2 || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Đang gửi...
                  </>
                ) : (
                  "Gửi xác minh"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Verification Pending */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <Card className="gradient-border overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                  {kycStatus === 'approved' ? (
                    <CheckCircle2 className="w-10 h-10 text-success" />
                  ) : (
                    <Clock className="w-10 h-10 text-accent animate-pulse" />
                  )}
                </div>
                <h2 className="text-xl font-heading font-bold mb-2">
                  {kycStatus === 'approved' ? 'Đã xác minh' : 'Đang xác minh'}
                </h2>
                <p className="text-muted-foreground">
                  {kycStatus === 'approved' 
                    ? 'Tài khoản của bạn đã được xác minh thành công!'
                    : 'Yêu cầu xác minh của bạn đang được xử lý. Thời gian dự kiến: 24-48 giờ.'
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Trạng thái xác minh</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="text-sm">Đã nhận hồ sơ</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {kycStatus === 'approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-accent flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      </div>
                    )}
                    <span className="text-sm">Đang xác minh giấy tờ</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {kycStatus === 'approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                    )}
                    <span className={`text-sm ${kycStatus !== 'approved' ? 'text-muted-foreground' : ''}`}>
                      Hoàn thành
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full btn-hover-scale" variant="outline" onClick={() => navigate("/dashboard")}>
              Quay về Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KYC;
