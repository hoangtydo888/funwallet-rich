# Rà soát bổ sung FUN Wallet — 27/10/2026

Backend vẫn tạm dừng. Không triển khai migration, đọc KYC thật, duyệt hồ sơ thật, ký hoặc gửi giao dịch thật. Các bản vá trong báo cáo này là mã cục bộ; bản sửa kết nối tiện ích 1.1.0 được mô tả riêng ở `FUN-WALLET-CONNECTION-1.1.0.vi.md`.

## Lỗi xác minh và bản sửa

1. Signer kế thừa `signMessageSync` chưa chặn ví khóa; ký transaction/typed data có thể chờ phân giải địa chỉ rồi ký sau lần kiểm tra phiên. Đã kiểm tra lại ngay trước thao tác ký đồng bộ, giữ kiểm tra chain/from, chặn EIP-7702/blob cho đến khi có luồng duyệt riêng. Kiểm thử khóa phiên trong lúc Addressable/ENS đang chờ và ký EIP-712 bình thường đều đạt.
2. Ghi một khóa mới có thể dùng mật khẩu cũ nếu tab cũ không tuân thủ Web Locks thay vault trong lúc mã hóa. Đã thêm kiểm tra revision và ghi snapshot đã xác minh, không trộn hai mật khẩu trong cùng vault.
3. Tạo/import web từng đăng ký metadata trước khi bảo vệ khóa; import có thể chuyển nhầm sang màn seed trống. Đã yêu cầu mật khẩu và lưu bản mã trước metadata; import đi đến hoàn tất, tạo mới đi sao lưu/quiz. Import địa chỉ đã có cho phép khôi phục khóa cục bộ mà không tạo metadata trùng. Bỏ tuyên bố seed đã xác minh nếu người dùng bỏ qua quiz, nói rõ web backup là kho khóa mã hóa, không tái hiện seed đã đóng.
4. Kết quả tải ví/số dư có thể về trễ sau khi đổi user/ví. Gate theo user, tài khoản, revision và request mới nhất chặn dữ liệu cũ; kết quả cũ không được hiện cho user mới. Kiểm tra user lại trước/sau ghi vault, mở khóa và đăng ký ví.
5. Migration nguồn cho phép người dùng tự INSERT/UPDATE trạng thái KYC hoặc `profiles.kyc_status` thành approved. Đã tái hiện bằng SQL cục bộ trước bản vá. Migration mới `20261025100000_wallet_kyc_review_guards.sql` thêm restrictive policy và trigger: user chỉ nộp/sửa hồ sơ pending của mình, không sửa reviewer/trạng thái duyệt hoặc gắn tài liệu của người khác. Profile chỉ tự chuyển submitted khi có hồ sơ pending; admin/service quản lý duyệt.
6. Duyệt KYC từng dùng hai request độc lập, có thể đổi hồ sơ nhưng không đổi profile. RPC `review_wallet_kyc` kiểm tra role admin, khóa hàng, chỉ duyệt pending một lần, đặt reviewer/time server và cập nhật profile trong cùng transaction. Lỗi profile sẽ rollback cả quyết định. Frontend admin đã chuyển sang RPC này; cần triển khai migration trước khi phát hành frontend.

## Kiểm chứng

- 118 kiểm thử security/WalletConnect đạt trong mirror và kho chính sau áp dụng; gồm kiểm thử thứ tự mã hóa/metadata bằng hook stub, lỗi quota storage không ghi metadata, import địa chỉ có sẵn, gate async, phương thức ký kế thừa và crypto vault thực với khóa test công khai.
- 24 kiểm tra KYC PostgreSQL đạt: tái hiện tự duyệt cũ, chặn user/anon, kiểm tra chéo user, đường dẫn tài liệu, admin duyệt, reason reject, chống duyệt lặp và rollback nguyên tử khi profile write lỗi. Chỉ dùng database riêng `fun_wallet_kyc_test`, socket /private/tmp port 55439.
- Đây không phải kiểm toán live hoặc chứng nhận không còn lỗ hổng. Migration chưa đối chiếu schema đang triển khai vì backend tạm dừng. Migration không sửa/hạ cấp các trạng thái KYC cũ; sau khôi phục cần quản trị xác minh nguồn quyết định cũ, không mặc nhiên coi lịch sử đã đáng tin.

## Thứ tự phát hành sau này

1. Đối chiếu schema KYC/profiles và backup trên môi trường được phép khi backend sẵn sàng.
2. Áp dụng migration quota và KYC, kiểm tra quyền anon/user A/user B/admin trên Supabase thật.
3. Triển khai RPC/edge functions phù hợp rồi phát hành frontend mới. Không dùng frontend gọi RPC mới trước migration.
4. Thử tạo/import/sao lưu UI và giao dịch testnet. Giữ ví thật trong quyền điều khiển của chủ ví.

Các file test DB chỉ dành cho cluster PostgreSQL dùng một lần. `kyc-db.py` tạo/xóa database test cố định trên socket cục bộ; không đổi script sang DSN production.
