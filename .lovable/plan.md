# Kiểm Tra & Chốt Màu Tile Dashboard + Chẩn Đoán + Test Tự Động

## Tình trạng con vừa kiểm tra

- Máy chủ dữ liệu (backend) đang trả lời bình thường: bảng dữ liệu truy vấn được, khóa kết nối trong app khớp với dự án. Thông báo đỏ "Lỗi kết nối" trong ảnh Cha gửi là lỗi nhất thời của bản xem trước lúc đó, không phải cấu hình sai.
- Màu tile trên Dashboard trong mã nguồn đã dùng bộ lớp màu cố định (đỏ, coral, cam, vàng, xanh lá, cyan, tím, hồng sen, ngọc, violet, teal, hồng, xám) và trạng thái mờ (disabled) không còn làm ô bị trắng.

## Việc sẽ làm

### 1. Kiểm tra thực tế cả hai bản
Chạy trình duyệt tự động mở Dashboard trên bản xem trước và bản đã publish, chụp ảnh và đọc màu nền thật của từng ô (kể cả ô đang bị vô hiệu hóa), rồi báo Cha bảng đối chiếu màu mong đợi / màu thực tế.

### 2. Chống lưu đệm (cache) khi publish
- Thêm thẻ chống cache cho trang gốc trong `index.html` để trình duyệt luôn tải bản HTML mới nhất (tệp CSS/JS đã tự động có mã băm nên sẽ được nạp lại theo).
- Ghi một "dấu phiên bản build" hiển thị được, để so sánh nhanh bản đang chạy trên máy người dùng với bản mới nhất.

### 3. Màn hình chẩn đoán màu tile
Thêm trang `/tile-diagnostics` (không cần đăng nhập) liệt kê từng ô: tên ô, lớp màu đang áp dụng, biến màu tương ứng, mẫu màu ở cả hai trạng thái bật/mờ, và giá trị màu thực tế mà trình duyệt tính ra. Cha mở trang này là thấy ngay ô nào lệch.

### 4. Kiểm thử thị giác cho Dashboard
Bổ sung bài test ảnh chụp cho `/tile-diagnostics` (đại diện đúng bộ màu Dashboard, không cần đăng nhập nên chạy được trong CI) vào bộ Playwright hiện có, cùng một bài kiểm tra so khớp mã màu từng ô theo bảng chuẩn — sai lệch màu sẽ làm test đỏ ngay sau mỗi lần build.

## Chi tiết kỹ thuật

- `index.html`: thêm `<meta http-equiv="Cache-Control" content="no-cache, must-revalidate">` + `<meta name="build-version">` sinh từ `vite.config.ts` (`define` mốc thời gian build).
- Trang mới `src/pages/TileDiagnostics.tsx` + route công khai trong `src/App.tsx`, đọc `TILE_TOKENS` từ `src/theme/tokens.ts` và bảng `TILE_STYLES` được tách ra file dùng chung `src/theme/tiles.ts` để Dashboard và trang chẩn đoán không lệch nhau.
- `tests/visual/tiles.spec.ts`: snapshot `/tile-diagnostics` + assert `getComputedStyle(...).backgroundColor` của từng ô khớp `TILE_TOKENS`.
- Không đổi logic ví, gửi/nhận tiền.

## Kết quả Cha nhận được

Báo cáo màu tile trên cả 2 bản, trang chẩn đoán để tự đối chiếu, và test tự động chặn lệch màu trong tương lai.
