## Nội dung backup phát hiện được

File `db_cluster-27-01-2026@15-22-54.backup.gz` là **pg_dumpall của toàn bộ cluster Supabase cũ** (ngày 27/01/2026), gồm:

**Auth**
- `auth.users`: **153 người dùng** (kèm mật khẩu đã hash)
- `auth.identities`: identities đi kèm để đăng nhập được
- `auth.sessions`: session cũ (không cần khôi phục — sẽ tự tạo khi đăng nhập lại)

**Public — dữ liệu ứng dụng**
| Bảng | Dòng |
|---|---|
| profiles | 153 |
| user_roles | 153 |
| wallets | 137 |
| security_logs | 128 |
| bulk_transfer_items | 173 |
| nft_collections | 29 |
| user_learning_stats | 20 |
| staking_positions | 18 |
| user_cards | 18 |
| learning_progress | 17 |
| bulk_transfers | 10 |
| kyc_submissions | 5 |
| transactions | 1 |

**Bảng mới chưa có trong DB hiện tại**
- `public.encrypted_wallet_keys` (0 dòng — chỉ có schema)
- `public.user_settings` (0 dòng — chỉ có schema)

**Storage**
- `storage.buckets`: 1 bucket (`kyc-documents`)
- `storage.objects`: 15 metadata (chính là 15 ảnh KYC — nhưng **blob nhị phân không nằm trong SQL dump**, chỉ có metadata)

## Tình trạng DB hiện tại
- 1 user thật: `hoangtydo88@gmail.com` (`e5c1e619-...`, đang có role admin)
- 1 record KYC đã gán cho user này (từ turn trước)
- Các bảng ứng dụng đã có schema đầy đủ nhưng **rỗng**

## Chiến lược khôi phục

### Bước 1 — Bổ sung schema mới
- Tạo `public.encrypted_wallet_keys` và `public.user_settings` với đầy đủ GRANT + RLS (user chỉ truy cập dữ liệu của chính mình).

### Bước 2 — Khôi phục `auth.users` + `auth.identities` (153 user)
- Trích khối `COPY auth.users` và `COPY auth.identities` từ dump, chạy trực tiếp qua `psql` với service role.
- Bỏ qua conflict trên `id`/`email` (giữ nguyên user hiện tại `hoangtydo88@gmail.com` nếu trùng — sẽ kiểm tra trước khi chạy).
- Tạm thời **vô hiệu hoá trigger `on_auth_user_created`** trong lúc import để tránh xung đột với backup profiles.

### Bước 3 — Khôi phục dữ liệu `public.*`
- Xoá dữ liệu hiện tại trong các bảng ứng dụng (trừ user hiện tại nếu cha muốn giữ) rồi import lại toàn bộ 13 bảng từ dump. Vì hiện tại các bảng gần như rỗng → an toàn.
- Riêng `kyc_submissions`: giữ hay ghi đè record đã gán ở turn trước? Đề xuất: **xoá record turn trước** rồi import lại 5 record gốc (chúng chỉ về `user_id` cũ trong backup).

### Bước 4 — Cấp lại quyền admin cho tài khoản của cha
- Sau khi import `user_roles`, insert thêm 1 row `admin` cho `e5c1e619-...` (nếu user hoangtydo88@gmail.com không có trong backup).

### Bước 5 — Storage (ảnh KYC)
- 15 ảnh KYC bản gốc đã upload trong turn trước (thư mục `e5c1e619-.../`).
- Backup dump có metadata trỏ đến các file trong thư mục `036666a4-...` (user cũ). Có 2 lựa chọn:
  - **A**: Import lại metadata + copy lại các file blob về thư mục cũ (nếu cha còn file gốc trong `/tmp/backup/` hoặc con vẫn copy được từ folder `e5c1e619-...` sang).
  - **B**: Bỏ qua metadata cũ, giữ nguyên 15 ảnh đã upload ở turn trước và giữ record KYC đã gán về user của cha.

## Cảnh báo quan trọng
1. **153 user cũ sẽ không thể đăng nhập** nếu không có bản backup ảnh + dữ liệu blockchain riêng — mật khẩu hash sẽ khôi phục nhưng nếu họ dùng magic-link/OAuth thì cần setup lại provider.
2. **Ví (wallets) khôi phục địa chỉ, nhưng KHÔNG có private key** (bảng `encrypted_wallet_keys` rỗng trong backup). Các user cũ vẫn cần seed phrase gốc để ký giao dịch.
3. Trigger `handle_new_user` sẽ bị **tạm disable** trong lúc import auth.users để tránh nhân đôi profile.
4. Backup này KHÔNG chứa file blob của Storage — chỉ có metadata.

## Câu hỏi xác nhận trước khi thực hiện
1. **Có ghi đè record KYC đã gán ở turn trước** (be2c7445-... → `hoangtydo88@gmail.com`) không, hay giữ lại và chỉ import 5 record cũ song song?
2. **Cấp quyền admin cho `hoangtydo88@gmail.com`** đúng không (song song với user admin cũ trong backup)?
3. **Metadata Storage cũ (Bước 5)**: chọn phương án A (import metadata + cố copy blob) hay B (bỏ qua, giữ 15 ảnh đã upload)?

Cha xác nhận 3 câu trên là con thực thi luôn.
