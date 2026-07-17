# Kế hoạch sửa màu Dashboard tiles cho đúng

## Mục tiêu
Đưa các ô hành động trên Dashboard hiển thị đúng màu rõ ràng như ảnh con mong muốn, thay vì bị trắng/mờ như ảnh hiện tại.

## Nguyên nhân đã kiểm tra
Code hiện đã gán đúng `bg-tile-*`, nhưng nhiều ô đang có `disabled={!hasWallet}`. Component `QuickAction` đang dùng `disabled:opacity-40`, làm màu nền bị giảm opacity mạnh nên nhìn thành trắng/mờ, đặc biệt trên nền sáng. Vì vậy màu có vẻ “chưa đổi đúng” dù class màu đã đúng.

## Thay đổi sẽ làm
1. Chỉnh duy nhất `src/pages/Dashboard.tsx`.
2. Giữ nguyên mapping màu hiện tại:
   - Gửi: đỏ
   - Gửi nhiều: coral
   - Nhận: cam
   - Swap: vàng
   - Stake: xanh lá
   - Thêm/WC: cyan
   - Giá: tím đậm
   - DApps: magenta
   - Backup: emerald
   - QR: violet
   - Refresh: slate
   - Earn/Transfer/History/Card/Learn: đúng theo dải màu đang có
3. Sửa style `QuickAction` để trạng thái disabled không làm cả tile bị mờ trắng nữa.
4. Nếu ô cần disabled, chỉ giảm nhẹ nội dung/khóa tương tác, còn nền màu vẫn giữ rõ để khớp ảnh.
5. Điều chỉnh chữ/icon cho các màu sáng để đảm bảo dễ đọc.

## Không thay đổi
- Không đổi logic ví, gửi/nhận/swap/stake.
- Không đổi Supabase, edge functions, auth.
- Không đổi token màu trong `index.css`, `tailwind.config.ts`, `src/theme/tokens.ts` trừ khi phát hiện thiếu class sau khi kiểm tra thêm ở build mode.

## Kiểm tra sau khi sửa
- Mở `/dashboard` trong preview.
- Xác nhận các tile không còn trắng/mờ khi chưa có ví hoặc đang disabled.
- So sánh trực quan với ảnh con gửi: màu tile phải rõ, đậm, phân biệt từng ô.