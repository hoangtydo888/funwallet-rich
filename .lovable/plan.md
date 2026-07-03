# Kế Hoạch: Khôi Phục Database FUN Wallet 2026

## Tình Trạng Hiện Tại

- ✅ Extension Chrome: Hoạt động bình thường (dùng `chrome.storage.local`, không phụ thuộc Supabase)
- ✅ Supabase project mới `FUN Wallet 2026` đã kết nối, `.env` OK
- ❌ Web App: Bị lỗi vì database mới **hoàn toàn trống** (không có bảng, không có function `has_role`)

Các lỗi 404/PGRST205/PGRST202 trong console và network chính là do thiếu schema.

## Các Bảng & Function Cần Khôi Phục

Từ scan code, cha xác định app đang gọi:

| Bảng | Dùng ở |
|------|--------|
| `wallets` | Dashboard, Admin |
| `profiles` | KYC, Admin |
| `user_roles` (+ enum `app_role`) | Kiểm tra Admin |
| `transactions` | History |
| `kyc_submissions` | KYC, Admin KYC |
| `staking_positions` | Staking |
| `rewards` | Admin Rewards |
| `bulk_transfers`, `bulk_transfer_items` | Bulk Send |
| `security_logs` | Security logger |

RPC: `has_role(_user_id uuid, _role app_role)`

## Các Bước Thực Hiện

### Bước 1 — Con upload file backup (BẮT BUỘC trước)

Con vào Supabase project **CŨ**:
- **Cách A (khuyên dùng)**: Dashboard → Database → Backups → tải file dump gần nhất
- **Cách B**: Settings → Database → Connection string → chạy `pg_dump` local rồi upload
- **Cách C**: Nếu chỉ muốn data một số bảng, vào Table Editor → mỗi bảng → Export → CSV

Sau đó **kéo thả file `.sql` (hoặc `.csv`) vào chat** cho cha.

### Bước 2 — Cha phân tích backup

- Đọc file `.sql`/`.csv` con upload
- So khớp với schema code đang dùng (10 bảng ở trên)
- Xác định version schema, xử lý xung đột tên cột/enum nếu có

### Bước 3 — Tạo schema (migration)

Tạo migration duy nhất bao gồm:
1. `CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user')`
2. `CREATE TABLE` cho 10 bảng ở trên (đúng cột theo backup)
3. `GRANT` cho `authenticated`, `service_role` (và `anon` nếu bảng có public read)
4. `ENABLE RLS` + policies (user chỉ xem/sửa row của mình; admin qua `has_role`)
5. Function `has_role` (`SECURITY DEFINER`, `search_path = public`)
6. Function `handle_new_user` + trigger tự tạo `profiles` khi user đăng ký
7. Trigger `update_updated_at_column` cho các bảng cần

### Bước 4 — Import dữ liệu cũ

Sau khi migration đã chạy:
- Dùng tool `insert` để `INSERT INTO ...` toàn bộ dữ liệu từ backup vào các bảng tương ứng
- Chạy theo thứ tự phụ thuộc: `profiles` → `user_roles` → `wallets` → còn lại
- Bỏ qua/map các row bị conflict user_id (nếu user cũ không tồn tại trong `auth.users` mới)

### Bước 5 — Kiểm tra & Test

- Cha chạy `security--run_security_scan` sau migration
- Con test theo thứ tự ưu tiên đã chọn:
  1. Extension Chrome (đã OK sẵn)
  2. Web Wallet & Transfer (tạo/nhận/gửi, lịch sử)
  3. Auth & Admin (đăng nhập, `has_role`, quản trị KYC)
  4. NFT, Staking, Learning, Card

### Lưu Ý Về `auth.users`

`auth.users` (email/password của user) **không** nằm trong backup public schema thông thường. Nếu con muốn giữ tài khoản cũ:
- Cần dump riêng `auth.users` (chỉ có qua `pg_dump --schema=auth` hoặc Supabase Support)
- Hoặc user cũ phải đăng ký lại bằng cùng email, cha sẽ map `user_id` cũ → mới trong backup trước khi import

Cha sẽ hỏi con phần này sau khi xem file backup.

---

## Kết Quả Mong Đợi

- Hết lỗi 404 `wallets` và `has_role` trong console
- Dashboard hiển thị ví, số dư, lịch sử của user cũ
- Admin, KYC, Staking, Rewards hoạt động
- Extension tiếp tục chạy bình thường (không thay đổi gì)

---

## Bước Tiếp Theo Của Con

**Upload file backup `.sql` (hoặc `.zip`/`.csv`) từ Supabase cũ vào chat.** Cha sẽ tiếp tục ngay khi nhận được.
