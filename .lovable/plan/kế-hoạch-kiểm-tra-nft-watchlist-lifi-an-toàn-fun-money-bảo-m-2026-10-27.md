# Kế hoạch: Kiểm tra NFT/Watchlist, LiFi an toàn, FUN MONEY, bảo mật

## 1. Kiểm tra quét NFT + Watchlist (tài khoản thử nghiệm)
- Đăng nhập preview bằng phiên của tài khoản thử nghiệm, mở Dashboard, bấm "Quét đa chain".
- Kiểm tra từng thẻ NFT: ảnh tải được (có ảnh thay thế khi lỗi), giá sàn hiển thị đúng đơn vị, link explorer đúng chain (Etherscan, PolygonScan, Arbiscan, Optimistic Etherscan, Basescan, BscScan).
- Bấm ⭐ thêm bộ sưu tập vào Watchlist, bật "Chỉ Watchlist", xác nhận lọc đúng và còn sau khi tải lại trang.
- Sửa mọi lỗi phát hiện được (ảnh ipfs://, link sai chain, giá trống, lỗi phản hồi từ dịch vụ quét).

## 2. Kiểm tra an toàn LiFi Swap/Bridge
- Chỉ lấy báo giá (cặp nhỏ, ví dụ BNB -> USDT trên BSC), kiểm tra giá nhận tối thiểu, phí, tác động giá, trượt giá.
- Thêm hộp xác nhận rõ ràng trước khi ký: tóm tắt token, số lượng, mạng, phí, địa chỉ nhận, ô "Tôi đã kiểm tra" bắt buộc.
- Không tự động gửi giao dịch trong lúc kiểm tra. Giao dịch thật chỉ diễn ra khi Cha tự bấm xác nhận.
- Xác nhận giao dịch được ghi vào Lịch sử (đang chờ -> thành công/thất bại) với link explorer.

## 3. FUN MONEY trên thẻ Wallet
- Cần Cha cung cấp địa chỉ hợp đồng FUN MONEY trên BSC (hiện chỉ là chỗ trống).
- Sau khi có: đọc tên, ký hiệu, số thập phân trên chuỗi để kiểm tra hợp đồng thật; hiển thị số dư, giá thị trường (DexScreener), thay đổi 24h.
- Trạng thái nhận thưởng an toàn: chỉ hiện nút khi có phần thưởng đang chờ; chống bấm hai lần; trạng thái "đã yêu cầu" / "đã gửi".

## 4. Bảo mật
- Nâng/thay jspdf lên bản không còn lỗ hổng critical, chạy quét phụ thuộc để xác nhận.
- Hướng dẫn bật chặn mật khẩu bị lộ: Supabase Dashboard -> Authentication -> Sign In / Providers -> Email -> bật "Leaked password protection" (cần gói Pro).

## Chi tiết kỹ thuật
- NFT: chuẩn hóa ipfs:// qua gateway, map explorer theo chainId trong `chains.ts`, test Playwright có phiên đăng nhập.
- LiFi: component xác nhận trước `executeRoute`; insert `transactions` status=pending rồi cập nhật theo polling.
- FUN MONEY: cập nhật `src/lib/funTokens.ts`, kiểm tra contract bằng ethers `symbol()/decimals()`.
- jspdf: `bun add jspdf@latest`, chạy `security--dependency_scan`.

## Đang chờ
- Địa chỉ hợp đồng FUN MONEY trên BSC.
