# Đưa FUN Wallet lên Cửa hàng Chrome

Hộp "Thêm "FUN Wallet"?" với nút **Thêm tiện ích** chỉ xuất hiện khi tiện ích được tải từ Cửa hàng Chrome (chromewebstore.google.com). Trang web khác không được phép tự cài tiện ích. Chrome đã chặn việc này từ năm 2018. Trước khi được duyệt, wallet.fun.rich/extension cho tải file .zip kèm 4 bước cài.

## Việc chủ dự án phải tự làm (cần tài khoản Google và thẻ thanh toán)

1. Mở https://chrome.google.com/webstore/devconsole bằng tài khoản Google sẽ đứng tên nhà phát hành.
2. Đồng ý điều khoản, trả phí đăng ký một lần 5 USD và xác minh email.
3. Bấm **New item** (Mục mới) và tải lên `public/fun-wallet-extension.zip` trong repository này.
4. Điền các thẻ theo nội dung bên dưới, tải ảnh trong thư mục này lên, rồi bấm **Submit for review**.
5. Google thường duyệt trong vài ngày; tiện ích ví có thể bị xem xét lâu hơn.
6. Khi được duyệt, gửi đường link cửa hàng. Link được dán vào `CHROME_WEB_STORE_URL` trong `src/pages/ExtensionDownload.tsx`; khi đó nút **Thêm vào Chrome** sẽ mở thẳng trang cửa hàng.

Mỗi lần cập nhật: tăng `version` trong `src/extension/public/manifest.json`, chạy `npm run build:extension`, nén lại `dist-extension` thành zip và tải lên mục **Package**.

## Thẻ Store listing

- **Tên:** FUN Wallet - Web3 Crypto Wallet
- **Mô tả ngắn (tối đa 132 ký tự):** Ví Web3 tự quản trên BNB Chain và các mạng EVM. Kết nối fun.rich và các dApp, mọi giao dịch đều do bạn duyệt.
- **Mô tả chi tiết:**

  FUN Wallet là ví tiền điện tử tự quản cho hệ sinh thái FUN.RICH.

  • Tạo ví mới hoặc nhập ví bằng cụm từ khôi phục.
  • Khóa riêng được mã hóa bằng mật khẩu và chỉ lưu trên máy của bạn.
  • Kết nối fun.rich và các dApp giống MetaMask: bấm FUN Wallet, ví mở ở bảng bên để bạn mở khóa, chọn tài khoản và duyệt quyền.
  • Mỗi giao dịch, chữ ký hoặc đổi mạng đều hiện người nhận, số tiền, phí và trang yêu cầu trước khi bạn xác nhận.
  • Hỗ trợ BNB Smart Chain, Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche và Fantom.

  FUN Wallet không bao giờ hỏi cụm từ khôi phục qua tin nhắn hay email. Không chia sẻ cụm từ này với bất kỳ ai.
- **Danh mục:** Công cụ (Tools) hoặc Tài chính (Finance) nếu có.
- **Ngôn ngữ:** Tiếng Việt.
- **Biểu tượng 128×128:** `icon-128.png`
- **Ảnh chụp 1280×800:** `screenshot-1-welcome.png`, `screenshot-2-connect.png`, `screenshot-3-site.png`
- **Ô quảng cáo nhỏ 440×280:** `promo-tile-440x280.png`
- **Trang web chính thức:** https://wallet.fun.rich

## Thẻ Privacy (Quyền riêng tư)

- **Mục đích duy nhất (Single purpose):** Ví tiền điện tử cho phép người dùng quản lý tài khoản blockchain và duyệt yêu cầu kết nối, ký và giao dịch từ trang web.
- **Lý do cho từng quyền:**
  - `storage`: lưu kho khóa đã mã hóa, danh sách ví, mạng đang chọn và các trang đã kết nối trên máy người dùng.
  - `alarms`: tự hủy yêu cầu duyệt quá hạn và tự khóa ví khi không dùng.
  - `tabs`: gửi kết quả duyệt về đúng tab đã yêu cầu và hủy yêu cầu khi tab đóng hoặc tải lại.
  - `sidePanel`: hiện màn hình duyệt ở bảng bên, giống MetaMask.
  - `scripting`: đưa nhà cung cấp Ethereum (EIP-1193/EIP-6963) vào trang trước khi trang khởi động để dApp nhận ra FUN Wallet.
  - Quyền máy chủ `http://*/*`, `https://*/*`: dApp có thể ở bất kỳ tên miền nào; tiện ích chỉ chuyển yêu cầu ví, không đọc nội dung trang. Các địa chỉ RPC được gọi để đọc số dư và phát giao dịch.
- **Mã từ xa (Remote code):** Không. Toàn bộ mã nằm trong gói tiện ích.
- **Dữ liệu thu thập:** đánh dấu "Thông tin tài chính và thanh toán" (địa chỉ ví và giao dịch gửi tới RPC blockchain) và "Hoạt động trên web" (tên miền trang đã kết nối, lưu cục bộ). Tích cả ba cam kết: không bán dữ liệu, không dùng cho mục đích không liên quan, không dùng để xét tín dụng.
- **Chính sách quyền riêng tư:** https://wallet.fun.rich/privacy

## Lưu ý trước khi công bố

Bản ví này chưa được kiểm toán bảo mật độc lập. Nên chọn chế độ hiển thị **Unlisted** (chỉ ai có link mới thấy) cho đến khi có kiểm toán, rồi mới chuyển sang **Public**.
