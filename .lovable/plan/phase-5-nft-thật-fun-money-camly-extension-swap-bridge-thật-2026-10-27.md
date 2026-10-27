# Phase 5 — NFT thật, FUN MONEY/CAMLY, Extension, Swap/Bridge thật, Publish

## 1. NFT scanner thật (Alchemy)
- Xin khoá `ALCHEMY_API_KEY` qua form bảo mật (Cha lấy miễn phí tại dashboard.alchemy.com → Create App).
- Nâng edge function `nft-scanner`: gọi Alchemy NFT API v3 (`getNFTsForOwner`, `getFloorPrice`) cho Ethereum, Polygon, Arbitrum, Optimism, Base; BSC giữ BscScan.
- Mỗi NFT trả về: ảnh (ưu tiên ảnh cache của Alchemy, fallback IPFS gateway), tên, collection, giá sàn (floor price ETH + USD), link explorer (Etherscan / Polygonscan / Arbiscan / Basescan…).
- NFTGallery: thẻ NFT có ảnh, giá sàn, nút "Xem trên Etherscan", nút ⭐ thêm collection vào Watchlist; công tắc "Chỉ Watchlist" lọc theo collection đã lưu.

## 2. FUN MONEY và CAMLY COIN trong Wallet
- Thẻ riêng "Hệ sinh thái FUN" ở đầu Wallet: logo, số dư, giá thị trường, % 24h (DexScreener theo địa chỉ hợp đồng).
- Nút "Nhận thưởng" (Claim reward): đọc phần thưởng chờ từ bảng `rewards` của user, gửi yêu cầu nhận, cập nhật trạng thái và ghi vào History.
- Cần Cha xác nhận địa chỉ hợp đồng FUN MONEY và CAMLY COIN (mạng BSC) nếu khác với địa chỉ đang có trong code.

## 3. Chrome Extension FUN Wallet
- Đóng gói lại extension Manifest V3: bấm biểu tượng mở popup ví (chuỗi, token, Watchlist từ Phase 2; giao diện cầu vồng từ Phase 3) và nút "Mở FUN Wallet đầy đủ" mở wallet.fun.rich.
- Tạo file ZIP tải về + trang hướng dẫn cài (chrome://extensions → Developer mode → Load unpacked).

## 4. Chạy thử Swap/Bridge thật
- Kiểm tra tự động: lấy báo giá LiFi thật cho USDT → BNB (BSC) và USDT BSC → USDT Polygon; xác nhận có tuyến tốt nhất, số nhận tối thiểu, phí.
- Gửi giao dịch thật cần ví có tiền và chữ ký của Cha: con không thể ký thay. Con sẽ chuẩn bị sẵn, Cha bấm Swap với số nhỏ (ví dụ 1 USDT), sau đó con kiểm tra giao dịch trên BscScan và bản ghi trong History.

## 5. Publish + kiểm tra live
- Quét bảo mật, rồi Publish lên wallet.fun.rich (cache-busting đã có trong bản build).
- Mở bản live bằng trình duyệt tự động: kiểm tra `/tile-diagnostics` và Dashboard (sau đăng nhập) có đúng màu cầu vồng như Hình 2.

## Chi tiết kỹ thuật
- Alchemy key chỉ nằm trong secret của edge function; JWT bắt buộc như hiện tại.
- Claim reward: cập nhật `rewards.status` + insert `transactions` (tx_type=reward), có RLS theo user.
- Extension build riêng từ thư mục `extension/`, ZIP đặt trong `public/`, tải bằng fetch+blob.
- Thêm test nhỏ cho logic tính giá trị USD và lọc Watchlist NFT.
