# FUN Wallet web kết nối FUN Profile

## Phạm vi bản đầu

- WalletKit thật từ Reown; không tạo session giả trong localStorage.
- DApp được phép: https://fun-profile-clone.lovable.app; BSC (56).
- Kết nối và từng yêu cầu phải duyệt tại tab FUN Wallet đang mở.
- Chỉ ký thông điệp đăng nhập FUN Profile có thời hạn năm phút; chuyển BNB đến EOA hoặc CAMLY/USDT/USDC bằng transfer. Từ chối approve, arbitrary contract calls, raw eth_sign và typed data.
- Khóa được giải mã tại tab ví khi ví đã mở khóa, không chuyển khóa tới Profile/server. Ví chưa mã hóa không được ký DApp.
- Số lượng/phí bằng bigint, hiển thị chính xác. Khóa liên tab và lưu dấu yêu cầu trước broadcast để tránh tự gửi lại sau lỗi mạng; không tự retry. Giao dịch chưa rõ kết quả phải kiểm tra lịch sử on-chain.
- /connect?wc_uri= tiếp nhận pairing URI, giữ tạm sessionStorage khi đăng nhập rồi xóa URL. URI là bí mật ghép cặp, không ghi log hay đưa vào analytics.

## Cấu hình và phát hành

Reown project hoangtydo88: 438c4373fc7f4c3b5561f0d2d2b2aa0e (public project ID). Cần allowlist chính xác https://wallet.fun.rich; giữ cấu hình cũ. Không bật gói trả phí.

Phải publish FUN Wallet trước khi bật connector web ở Profile. Khi kiểm thử phải dùng ví thử không có tiền, duyệt kết nối rồi từ chối yêu cầu chuyển tiền. Chưa coi hoàn tất nếu chỉ build thành công. Không tự thực hiện chuyển tiền thật.

## Kiểm tra

bun test tests/walletconnect
bunx tsc --noEmit -p tsconfig.app.json
bun run build

Các kiểm thử policy bao gồm precision trên 2^53, tài khoản/mạng sai, calldata token, chặn approval/unknown contract và challenge đăng nhập hết hạn.
