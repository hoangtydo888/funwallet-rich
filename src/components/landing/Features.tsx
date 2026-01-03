import { 
  Wallet, 
  ArrowLeftRight, 
  CreditCard, 
  Image, 
  QrCode, 
  BookOpen,
  TrendingUp,
  Globe,
  Smartphone
} from "lucide-react";

const features = [
  {
    icon: <Wallet className="h-7 w-7" />,
    title: "Ví Web3 Thông Minh",
    description: "Tạo và import ví, hỗ trợ BNB Chain (BSC), quản lý nhiều ví trong một tài khoản.",
    gradient: "from-primary to-secondary",
  },
  {
    icon: <ArrowLeftRight className="h-7 w-7" />,
    title: "Swap & Exchange",
    description: "Đổi token ngay trong app với DEX aggregator, tỷ giá tốt nhất thị trường.",
    gradient: "from-secondary to-primary",
  },
  {
    icon: <TrendingUp className="h-7 w-7" />,
    title: "Theo Dõi Portfolio",
    description: "Biểu đồ PnL real-time, phân tích tài sản, theo dõi xu hướng thị trường.",
    gradient: "from-primary to-accent",
  },
  {
    icon: <CreditCard className="h-7 w-7" />,
    title: "Thẻ Đa Năng FUN Card",
    description: "Thẻ ảo trong app, top-up từ crypto, thanh toán mọi nơi trên thế giới.",
    gradient: "from-accent to-warning",
  },
  {
    icon: <Image className="h-7 w-7" />,
    title: "NFT Gallery & Minting",
    description: "Xem, quản lý và mint NFT badges độc quyền ngay trên FUN Wallet.",
    gradient: "from-secondary to-success",
  },
  {
    icon: <QrCode className="h-7 w-7" />,
    title: "Thanh Toán QR",
    description: "Quét mã QR để thanh toán nhanh chóng, chuyển tiền P2P dễ dàng.",
    gradient: "from-success to-secondary",
  },
  {
    icon: <Globe className="h-7 w-7" />,
    title: "Đa Ngôn Ngữ",
    description: "Hỗ trợ tiếng Việt và tiếng Anh, giao diện thân thiện người dùng.",
    gradient: "from-primary to-secondary",
  },
  {
    icon: <Smartphone className="h-7 w-7" />,
    title: "App Mobile & Web",
    description: "Sử dụng mọi lúc mọi nơi trên điện thoại và trình duyệt web.",
    gradient: "from-accent to-primary",
  },
  {
    icon: <BookOpen className="h-7 w-7" />,
    title: "Học & Kiếm Thưởng",
    description: "Hoàn thành các khóa học crypto và quiz để nhận token thưởng.",
    gradient: "from-warning to-accent",
  },
];

const Features = () => {
  return (
    <section className="py-24 px-4 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            Tất cả trong <span className="gradient-text">một app</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            FUN Wallet tích hợp đầy đủ tính năng của một sàn giao dịch và ví crypto, 
            giúp bạn quản lý tài sản số một cách toàn diện.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group glass-card rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 cursor-default"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 text-primary-foreground group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h3 className="font-heading font-semibold text-xl mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
