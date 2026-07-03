# Kế Hoạch: Khôi Phục Backup KYC vào Project Mới

## Bối Cảnh

File backup cha gởi (`xavgatuwiaeewdfpkycn.storage.zip`) chứa **15 ảnh KYC** của 1 user từ project Supabase cũ:

```text
kyc-documents/
└── 036666a4-61a2-48d8-8a06-a0fe0f3a1804/  (user_id cũ)
    ├── id_front_*.jpg   (5 phiên bản)
    ├── id_back_*.jpg    (5 phiên bản)
    └── selfie_*.jpg     (5 phiên bản)
```

Project hiện tại **chưa có** bucket này và **chưa có** bảng KYC nào. Con sẽ tạo mới toàn bộ hạ tầng KYC và upload ảnh backup vào.

---

## Các Bước Thực Hiện

### Bước 1: Tạo Storage Bucket `kyc-documents` (Private)
- Dùng tool `supabase--storage_create_bucket` với `public: false`
- Bucket private để bảo vệ dữ liệu nhạy cảm (CMND, selfie)
- Truy cập thông qua signed URL hoặc RLS policy

### Bước 2: Tạo Bảng `kyc_submissions`
Migration tạo bảng lưu trạng thái KYC của mỗi user:

| Trường | Mục đích |
|---|---|
| user_id | Liên kết tới auth user |
| full_name | Họ tên trên CMND |
| id_number | Số CMND/CCCD |
| id_front_path | Đường dẫn ảnh mặt trước trong bucket |
| id_back_path | Đường dẫn ảnh mặt sau |
| selfie_path | Đường dẫn ảnh selfie |
| status | pending / approved / rejected |
| rejection_reason | Lý do từ chối (nếu có) |
| submitted_at, reviewed_at | Mốc thời gian |

- Enable RLS
- Policy: User chỉ xem/tạo/sửa hồ sơ KYC của chính mình
- Policy: Admin (dùng bảng `user_roles` + `has_role`) có thể xem & duyệt tất cả
- Trigger `update_updated_at_column`

### Bước 3: Tạo Bảng `user_roles` (nếu chưa có) + Enum `app_role`
- Cần để phân quyền admin duyệt KYC
- Theo đúng best practice bảo mật (không lưu role trên profile)

### Bước 4: RLS Policies cho `storage.objects` (bucket kyc-documents)
- User chỉ upload/đọc file trong thư mục `{auth.uid()}/...` của chính mình
- Admin đọc được tất cả file trong bucket

### Bước 5: Khôi Phục 15 Ảnh Vào Bucket
- Copy file từ `/mnt/user-uploads/xavgatuwiaeewdfpkycn.storage.zip` → giải nén
- Upload bằng script Node/Deno dùng service role key vào path:
  `kyc-documents/036666a4-61a2-48d8-8a06-a0fe0f3a1804/<filename>.jpg`
- Giữ nguyên `user_id` cũ trong path (để tương thích nếu user đó có tài khoản ở project mới)

### Bước 6: Insert 1 Record `kyc_submissions`
- Tạo 1 dòng ứng với user `036666a4-...` với `status = 'pending'`, trỏ tới ảnh mới nhất (timestamp cao nhất) trong mỗi loại

---

## Lưu Ý Quan Trọng Cho Cha

1. **User ID `036666a4-61a2-48d8-8a06-a0fe0f3a1804` là từ project Supabase cũ** — user này có thể không tồn tại trong project mới. Ảnh vẫn được lưu để tham khảo, nhưng RLS policy sẽ chỉ cho phép user cùng ID đó truy cập. Nếu cha muốn gán cho user khác, cha báo con user_id mới sau khi cha đăng nhập.

2. **Không có tính năng KYC nào trong UI hiện tại** — kế hoạch này chỉ khôi phục **dữ liệu backend** (bucket + bảng + ảnh). Nếu cha muốn có form UI cho user submit KYC và trang admin duyệt KYC, con cần lập kế hoạch UI riêng ở lần sau.

3. **Không phải backup toàn bộ project** — file zip cha gởi chỉ chứa 1 bucket storage. Code, database schema, và các data khác của FUN Wallet **không** nằm trong backup này.

---

## Kết Quả Mong Đợi

- Bucket `kyc-documents` (private) tồn tại trong Supabase mới
- 15 ảnh KYC được upload đầy đủ vào bucket
- Bảng `kyc_submissions` + `user_roles` sẵn sàng cho tính năng KYC sau này
- Không ảnh hưởng gì tới các tính năng ví hiện tại (wallet, send, connect DApp...)
