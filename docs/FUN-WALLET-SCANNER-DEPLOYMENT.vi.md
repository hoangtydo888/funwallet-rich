# Chuẩn bị scanner mới — chưa triển khai

Backend FUN Wallet 2026 `puqvatperkrpcqmtcpji` đang tạm dừng theo lựa chọn của Cha. Tài liệu này chuẩn bị cho lần triển khai sau, không phải yêu cầu khôi phục ngay.

## Thứ tự triển khai

1. Dùng môi trường thử có Supabase Auth/PostgREST, kiểm tra diff migration `20261025090000_wallet_scanner_budgets.sql` và quyền schema. Không dùng CLI/token chỉ được cấp cho FUN Profile để triển khai FUN Wallet.
2. Áp dụng migration quota trước. Không sửa client/types tự sinh. Bảng chỉ có bucket/khung thời gian/số lượt, không chứa địa chỉ ví, khóa, nội dung yêu cầu.
3. Kiểm tra anon/user không gọi được RPC `consume_wallet_scan_budget` và không đọc bảng. Service role chỉ được thực thi RPC, không có quyền đọc bảng trực tiếp; SECURITY DEFINER có search_path rỗng và dùng tên schema đầy đủ.
4. Triển khai cùng phiên bản `_shared` và ba handler `token-scanner`, `nft-scanner`, `bscscan-proxy`. Secret service role ở server, không ở client. Thiếu migration hoặc secret sẽ trả 503 để giữ hạn mức, không tự fallback.
5. Thử JWT anon, hết hạn, user A/B; request >4 KB kể cả chunked; quota dùng chung 3 endpoint; DB lỗi; upstream timeout/redirect/response >1 MB; RPC sai chain. Fixture offline chưa thay thế bước này.
6. Sau xác minh mới chuyển lưu lượng. Quan sát 401/429/503, latency và chi phí. Các endpoint phục hồi `run-sql`/`upload-file` đã có bản 410 riêng cần triển khai và xác minh trước thu hồi secret cũ.

## Kiểm thử cục bộ đã chuẩn bị

- `bun test tests/security tests/walletconnect`.
- `tests/security/scanner-db.py` chỉ cho database PostgreSQL dùng một lần, socket `/private/tmp`, port 55439. Script tạo role giả và truncate bảng test; tuyệt đối không đổi DSN sang production. Cần PostgreSQL 17 CLI; đường dẫn psql hiện theo Homebrew macOS.
- Quota 12/phút + 120/giờ/user và 600/phút + 6000/giờ toàn project, cố định theo phút/giờ. Đây là bộ đếm fixed-window: burst quanh ranh giới cửa sổ vẫn có thể xảy ra; không thay WAF/chống tạo nhiều tài khoản.
- Khi quota DB lỗi: 503. Khi hết lượt: 429 và Retry-After bảo thủ 60/3600 giây.
- Quét BSC NFT dùng batch RPC tối đa 40 ứng viên/chuẩn. Nếu RPC không hỗ trợ batch hoặc không có proof hợp lệ sẽ không công bố NFT đó là đang sở hữu.

## Kiểm tra giao diện không kết nối ví thật

Chạy `node scripts/build-wallet-controls-qa.mjs`, rồi chạy lệnh preview do script in ra. Fixture đặt ở thư mục tạm, dùng RPC giả, Supabase/Auth stub và không có khóa ký hay hàm broadcast. Không đóng gói fixture vào bản phát hành.
