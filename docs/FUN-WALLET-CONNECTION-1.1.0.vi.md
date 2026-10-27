# FUN Wallet 1.1.0 — sửa kết nối, 27/10/2026

## Triệu chứng và nguyên nhân tìm được trong mã

FUN Profile chờ `eth_requestAccounts` trong khi tiện ích chỉ mở side panel, chưa chọn đường dẫn đúng yêu cầu. Nếu panel đang ở màn khác, người dùng không thấy nút duyệt. Content script còn đợi DOMContentLoaded mới công bố provider; cấu hình dApp có thể đã chọn luồng ví web trước đó.

## Bản sửa

- Đặt path panel vào đúng `/request?requestId=...` trước khi mở. Chrome từ chối mở do thiếu user gesture sẽ dùng cửa sổ popup thật. Thử lại đưa yêu cầu cũ lên trước, không cấp quyền thêm hoặc tạo yêu cầu thứ hai.
- Provider công bố ngay khi document có root; nhiều lần bấm kết nối cùng dùng một promise và dọn timer sau kết quả. Không giả mạo MetaMask hoặc thay provider MetaMask đã có.
- Luồng rõ ràng: mở khóa → chọn tài khoản có khóa trên tiện ích → xem tên miền/quyền → kết nối. Chọn tài khoản khác cần mở khóa đúng tài khoản. Địa chỉ website gửi không được trở thành tài khoản tùy ý; background chỉ nhận tài khoản có bản mã cục bộ.
- Hủy khi chưa mở khóa vẫn trả lỗi 4001 về dApp. Mở khóa không tự đồng ý kết nối. Quyền chỉ gồm địa chỉ và yêu cầu ký/giao dịch để xem xét riêng, không đọc seed/khóa hay tự chuyển tiền.
- UI chờ worker tối đa 12 giây rồi có chỉ dẫn đọc lại/mở lại. Yêu cầu duyệt vẫn có TTL 5 phút. Tài khoản/khóa đổi trong lúc giải mã sẽ không mở khóa phiên cũ.
- Giữ approval route hoạt động khi metadata danh sách ví cũ bị thiếu; hiển thị cách tạo/import và hủy thay vì mắc ở onboarding.
- Thay logo GIF nặng ở màn mở khóa bằng PNG có sẵn; không thêm gói hoặc quyền Chrome mới.

## Kiểm chứng

30 kiểm thử tiện ích đạt; typecheck extension và build đạt. Đã đi qua giao diện fixture bằng Chrome: mật khẩu sai, mở khóa đúng, chọn tài khoản khác và mở khóa lại, xem quyền, kết nối thành công, hủy ngay từ màn khóa. Fixture không có ví, seed, khóa, backend hay broadcast thật.

Chưa tuyên bố kết nối ví thật thành công: tiện ích đang cài cần nhận bản dựng mới và tải lại trang FUN Profile để content script mới được nạp. Công cụ browser không đọc được `chrome://extensions`; phiên native đã bị thao tác của người dùng ngắt nên không tiếp tục điều khiển cửa sổ đó.

## Cập nhật tiện ích hiện có

1. Xem đúng thư mục nguồn đang nạp ở `chrome://extensions` → FUN Wallet → Chi tiết.
2. Cập nhật bản dựng vào chính thư mục đang nạp, giữ nguyên ID và dữ liệu Chrome của tiện ích.
3. Bấm **Tải lại** trên thẻ FUN Wallet hiện có; kiểm tra phiên bản **1.1.0**.
4. Tải lại trang FUN Profile, chọn FUN Wallet và hoàn thành mở khóa/chọn tài khoản/xem quyền/kết nối. Mật khẩu chỉ nhập trong tiện ích FUN Wallet.

Nếu đường dẫn đang cài khác `funwallet-rich/dist-extension`, cần cập nhật đúng đường dẫn đó trước khi bấm Tải lại. Backend Supabase vẫn tạm dừng theo lựa chọn của Cha; kết nối injected extension không cần backend này. Luồng ví web WalletConnect là một luồng khác và không được coi là đã phục hồi backend.

## Tham chiếu

- Chrome Side Panel, điều hướng path và user gesture: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- EIP-1193, mã 4001/4100 và request accounts: https://eips.ethereum.org/EIPS/eip-1193
