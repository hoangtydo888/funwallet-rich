# Publish + kiểm tra LiFi và NFT/Watchlist

## 1. Publish
- Kiểm tra kết quả quét bảo mật; nếu có cảnh báo nghiêm trọng thì báo Con trước.
- Publish bản hiện tại lên wallet.fun.rich.
- Mở trang thật sau khoảng 1 phút để xác nhận trang đã tải được bản mới.

## 2. Kiểm tra báo giá LiFi và bước xác nhận (không gửi giao dịch)
- Mở hộp Swap/Bridge trong ứng dụng, lấy một báo giá thật (ví dụ 0.01 BNB sang USDT trên BSC).
- Kiểm tra: báo giá hiện đúng, có dòng "Nhận tối thiểu", "Ví nhận", ô xác nhận.
- Kiểm tra nút thực hiện bị khóa khi chưa tích ô xác nhận, và ô tự bỏ tích khi báo giá thay đổi.
- Tuyệt đối không bấm thực hiện, không ký, không gửi giao dịch.

## 3. Quét NFT và Watchlist sau khi đăng nhập
- Thử đăng nhập tự động vào bản xem trước. Nếu không làm được (dự án dùng backend riêng), Cha sẽ nhờ Con đăng nhập và chụp màn hình.
- Quét NFT đa chuỗi: kiểm tra ảnh hiện ra, giá sàn, link explorer mở đúng chuỗi.
- Bấm ngôi sao để thêm/bỏ khỏi Watchlist, bật chế độ "Chỉ Watchlist" để kiểm tra lọc đúng.
- Sửa lỗi nếu phát hiện, rồi publish lại.

## Chi tiết kỹ thuật
- Gọi security--get_scan_results trước preview_ui--publish.
- Dùng Playwright trên localhost và wallet.fun.rich; kiểm tra thuộc tính disabled của nút thực hiện LiFi.
- Xem log edge function nft-scanner nếu quét lỗi.
