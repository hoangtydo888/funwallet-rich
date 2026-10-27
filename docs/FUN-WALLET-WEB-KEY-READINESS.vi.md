# FUN Wallet web — thông báo ví chỉ xem, 27/10/2026

Ảnh người dùng đang ở bản xem trước Lovable, trong modal WalletConnect. Địa chỉ được chọn báo chưa có khóa ký trên thiết bị nhưng thông báo lỗi lại yêu cầu mở khóa. Đã sửa mã nguồn phân biệt thiếu khóa, khóa cũ cần bảo vệ, đã có khóa nhưng đang khóa, đã sẵn sàng và kho khóa hỏng.

- Ví thiếu khóa: hướng dẫn khôi phục đúng ví hoặc chọn tài khoản đã có khóa; thêm nút mở luồng thêm/import và chọn tài khoản, không giữ chỉ dẫn mở khóa chung chung.
- Nút pair/approve/ký chỉ bật khi khóa đúng địa chỉ đã có trong phiên bộ nhớ còn hiệu lực. Kiểm tra điều kiện lần nữa trong handler.
- Nhận diện cả khóa cũ `pk_<address>` của đúng tài khoản; dữ liệu hỏng không làm vỡ render và không tự ghi đè.
- Giữ nguyên các khóa, địa chỉ, phiên và backend thật; không import, đọc hoặc truyền seed/private key trong quá trình kiểm thử.

## Hướng dẫn cho chủ ví

1. Mở trực tiếp https://wallet.fun.rich trong đúng hồ sơ Chrome đã tạo/import ví trước đây. Kho khóa của preview Lovable, tên miền web và tiện ích Chrome không tự dùng chung.
2. Chọn đúng địa chỉ cần dùng. Nếu vẫn báo chỉ xem, dùng Bảo vệ khóa ví → Khôi phục tệp mã hóa với bản sao lưu FUN Wallet tương ứng, hoặc tự import ví của mình trong luồng thêm ví. Xác minh địa chỉ sau khôi phục khớp hoàn toàn địa chỉ trước đó.
3. Khi khóa đã có, mở khóa bằng mật khẩu ví (tách với mật khẩu đăng nhập tài khoản).
4. Tạo URI WalletConnect mới từ FUN Profile, pair và duyệt ứng dụng/địa chỉ/mạng. URI pairing có thành phần bí mật, không gửi vào chat.

Chỉ có địa chỉ và số dư không khôi phục được quyền ký. Mọi seed/private key/mật khẩu do chủ ví tự nhập trên giao diện đã xác minh, không gửi cho người hỗ trợ. Tệp backup của ví khác không được coi là đã khôi phục địa chỉ này.

122 kiểm thử security/WalletConnect và typecheck app đạt; build PWA đạt. Đây là thay đổi mã cục bộ, chưa xuất bản lên trang đang chạy; chưa kiểm thử với khóa hoặc ký/gửi tiền thật. Backend Supabase vẫn tạm dừng theo lựa chọn trước đó.

Tham chiếu về localStorage/iframe theo origin: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
