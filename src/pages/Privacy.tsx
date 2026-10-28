import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Linked from the Chrome Web Store listing; keep in sync with what the extension actually does.
const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto px-4 py-6 space-y-5 text-sm leading-relaxed">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Quay lại">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-heading font-bold">Chính sách quyền riêng tư – FUN Wallet</h1>
        <p className="text-muted-foreground">Cập nhật ngày 29/10/2026. Áp dụng cho tiện ích FUN Wallet trên Chrome.</p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Khóa và cụm từ khôi phục</h2>
          <p>FUN Wallet là ví tự quản. Cụm từ khôi phục và khóa riêng được mã hóa bằng mật khẩu của bạn và chỉ lưu trong bộ nhớ của tiện ích trên máy bạn. Chúng tôi không thu thập, không gửi lên máy chủ và không thể khôi phục chúng nếu bạn làm mất.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Dữ liệu được gửi ra ngoài</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Địa chỉ ví và giao dịch đã ký được gửi tới các nút RPC công khai của mạng blockchain bạn chọn (ví dụ bsc-dataseed.binance.org) để đọc số dư và phát giao dịch.</li>
            <li>Giá token được lấy từ api.dexscreener.com theo địa chỉ hợp đồng token, không kèm thông tin cá nhân.</li>
            <li>Khi bạn kết nối một trang web, tiện ích lưu tên miền trang và địa chỉ ví đã cấp quyền ngay trên máy bạn để nhớ kết nối.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Quyền của tiện ích</h2>
          <p>Tiện ích chạy trên các trang web để cung cấp nhà cung cấp Ethereum (giống MetaMask), giúp trang web gửi yêu cầu kết nối, ký hoặc giao dịch. Mọi yêu cầu đều hiện trong FUN Wallet để bạn tự duyệt hoặc từ chối. Tiện ích không đọc nội dung trang web.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Không bán hay chia sẻ dữ liệu</h2>
          <p>Chúng tôi không bán, không cho thuê và không dùng dữ liệu của bạn cho quảng cáo. Không có công cụ theo dõi hay phân tích bên thứ ba trong tiện ích.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Liên hệ</h2>
          <p>Mọi câu hỏi về quyền riêng tư, vui lòng liên hệ qua wallet.fun.rich.</p>
        </section>
      </article>
    </div>
  );
};

export default Privacy;
