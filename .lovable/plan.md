## Mục tiêu
1. Người dùng nộp KYC (form + upload 3 ảnh) → lưu vào `kyc_submissions` (status=pending) + ảnh vào bucket `kyc-documents/<user_id>/`.
2. Trang admin xem danh sách hồ sơ KYC, xem ảnh, approve/reject (ghi `reviewed_by`, `reviewed_at`, cập nhật `kyc_status` trên profile người dùng).
3. Gán record `kyc_submissions` hiện có (`user_id=036666a4-...`) sang user thật của cha: `e5c1e619-0188-4210-94b2-7ac3c12cc23a` (hoangtydo88@gmail.com), đồng thời move ảnh trong storage sang thư mục mới.

## Tình trạng hiện tại
- Đã có file UI: `src/pages/KYC.tsx`, `src/pages/Admin.tsx`, `src/components/admin/KYCTable.tsx`, hook `src/hooks/useKYC.ts`, `src/hooks/useAdminKYC.ts`, route `/kyc` và `/admin` đã đăng ký trong `App.tsx`.
- Code hiện tại tham chiếu các cột/bảng chưa tồn tại: `profiles` (email, display_name, kyc_status), và các cột phụ trên `kyc_submissions` (`date_of_birth`, `nationality`, `phone`, `address`, `reviewed_by`). Cần bổ sung schema để code chạy được.

## Kế hoạch thực hiện

### Bước 1 — Migration bổ sung schema
- Thêm cột vào `public.kyc_submissions`: `date_of_birth date`, `nationality text`, `phone text`, `address text`, `reviewed_by uuid`.
- Tạo bảng `public.profiles` (`user_id uuid PK ref auth.users on delete cascade`, `email text`, `display_name text`, `kyc_status text default 'pending'`, `created_at`, `updated_at`) + GRANT + RLS (user tự xem/sửa profile của mình; admin xem tất cả) + trigger `update_updated_at_column`.
- Trigger `handle_new_user` (SECURITY DEFINER) trên `auth.users` để tự tạo row `profiles` khi có user mới.
- Backfill row profile cho user hiện tại `e5c1e619-...`.
- Cấp role `admin` cho `e5c1e619-...` trong `user_roles` để có thể vào trang `/admin`.

### Bước 2 — Gán record KYC cũ sang tài khoản mới
- Copy 15 file trong storage từ `kyc-documents/036666a4-.../` sang `kyc-documents/e5c1e619-.../` (dùng script exec với service role), xoá thư mục cũ.
- UPDATE record `be2c7445-...`: đổi `user_id` sang `e5c1e619-...`, đổi các path `id_front_path/id_back_path/selfie_path` sang prefix thư mục mới.
- Đặt `profiles.kyc_status='submitted'` cho user này để đồng bộ.

### Bước 3 — Rà soát UI (không đổi logic lớn)
- Xác nhận `src/pages/KYC.tsx` + `useKYC` hoạt động sau khi migration chạy (types Supabase regenerate). Không đổi UI trừ khi lỗi build.
- Xác nhận `src/pages/Admin.tsx` + `KYCTable` render danh sách, preview ảnh (signed URL 1h) và approve/reject.
- Thêm link "KYC" trong Dashboard/Settings nếu chưa có (điều hướng `/kyc`), và link "Admin" chỉ hiện với user có role admin.

### Bước 4 — Kiểm thử
- Build check (tsgo), mở `/kyc` với tài khoản `hoangtydo88@gmail.com`, thấy trạng thái "submitted" (do record đã gán).
- Mở `/admin` → thấy 1 hồ sơ pending → xem ảnh → approve → `kyc_status` cập nhật thành `approved`.

## Ghi chú kỹ thuật
- RLS `kyc_submissions` đã đúng (user tự sửa khi pending, admin sửa mọi lúc).
- Storage bucket `kyc-documents` private, dùng signed URL trong trang admin.
- Không thay đổi `src/integrations/supabase/types.ts` thủ công — sẽ tự regenerate sau migration.

## Câu hỏi xác nhận
Con dùng user `hoangtydo88@gmail.com` (`e5c1e619-...`) làm chủ mới của record KYC và cấp quyền admin luôn cho user này, đúng không cha?
