# Kiểm tra build, LiFi và NFT/Watchlist

## 1. Build và preview
- Đọc nhật ký build mới nhất. Nếu vẫn còn lỗi cài đặt thư viện, sửa danh sách thư viện để chỉ tải từ kho công khai, rồi cài lại.
- Mở preview trong trình duyệt và xác nhận trang đăng nhập cùng Dashboard tải được, không có lỗi đỏ.

## 2. Báo giá LiFi và bước xác nhận (chỉ đọc, không gửi)
- Đăng nhập bằng tài khoản thử nghiệm và mở Swap. Chọn một cặp nhỏ (BNB → USDT trên BSC), sau đó xin báo giá.
- Xác nhận màn hình có đủ: tuyến đi, số nhận tối thiểu, phí, trượt giá, ví nhận.
- Xác nhận nút Swap/Bridge vẫn khóa cho đến khi đánh dấu ô "Tôi đã kiểm tra…", và ô này tự bỏ đánh dấu khi có báo giá mới.
- Không bấm ký hoặc gửi. Nếu phát hiện có đường nào gửi giao dịch mà không qua xác nhận, con sẽ sửa để chặn lại.
- Kiểm tra trang History đọc đúng các giao dịch swap/bridge đã lưu.

## 3. Quét NFT và Watchlist
- Bấm "Quét đa chain" bằng tài khoản thử nghiệm. Theo dõi phản hồi của máy chủ quét NFT và nhật ký lỗi.
- Xác nhận mỗi thẻ NFT hiện ảnh (có ảnh dự phòng khi ảnh lỗi), giá sàn và link explorer đúng chain (Etherscan, BscScan, PolygonScan, Arbiscan, Optimistic Etherscan, Basescan).
- Thêm/bỏ một bộ sưu tập bằng nút ⭐, bật chế độ "chỉ Watchlist" và xác nhận danh sách lọc đúng.
- Sửa mọi lỗi tìm được: link sai, ảnh không hiện (ipfs://), giá trống, lỗi đăng nhập khi gọi máy chủ quét.

## Ghi chú kỹ thuật
- Đọc `/tmp/observability/build-errors.log`; nếu cần thì sinh lại `bun.lock` từ registry.npmjs.org.
- Dùng Playwright với phiên Supabase đã cấp, chụp màn hình từng bước. Chặn mọi `eth_sendTransaction` trong lúc kiểm tra.
- Gọi `nft-scanner` qua edge function logs/curl để xác minh dữ liệu trả về.
- Nếu ví thử nghiệm không có NFT, con sẽ dùng một địa chỉ công khai có NFT, chỉ để đọc.
