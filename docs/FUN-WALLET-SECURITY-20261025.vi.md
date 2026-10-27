# Rà soát FUN Wallet — 25/10/2026

## Phạm vi và trạng thái

Bản vá nằm trong mã nguồn cục bộ, chưa xuất bản web/tiện ích và chưa triển khai edge functions. Đây là rà soát mã và kiểm thử ngoại tuyến, không phải chứng nhận an toàn hoặc kiểm toán hoàn chỉnh. Không dùng khóa người dùng, không chuyển tiền thật.

Backend đích đã xác minh: FUN Wallet 2026, `puqvatperkrpcqmtcpji`. Dashboard báo project tạm dừng; chưa thể xác nhận RLS, secrets, functions và storage đang triển khai. Chủ tài khoản đã xác nhận Resume; Supabase từ chối vì tài khoản đạt giới hạn 2 project miễn phí đang hoạt động. Cha đã chọn tiếp tục vá mã và giữ backend tạm dừng. Không khôi phục, tạm dừng project khác, bật thanh toán hoặc nâng gói.

## Đã sửa trong mã

- Loại bỏ ghi khóa riêng dạng rõ trong luồng tạo/import/khôi phục; khóa ký chỉ lấy từ phiên bộ nhớ còn hiệu lực. Khóa/logout/pagehide và thay đổi vault vô hiệu hóa phiên. Kiểm tra lại phiên ngay trước ký sau các bước RPC bất đồng bộ.
- Vault mới AES-GCM, PBKDF2 SHA-256 600.000 vòng, mật khẩu mới tối thiểu 12 ký tự, ràng buộc bản mã với địa chỉ. Vẫn giải mã vault/seed v1 100.000 vòng để giữ khả năng phục hồi. Không tự ghi đè dữ liệu hỏng.
- Đổi mật khẩu và di chuyển dữ liệu cũ chuẩn bị/kiểm tra toàn bộ khóa trước một lần ghi vault; chỉ xóa bản rõ cũ sau thành công. Web Locks phối hợp tab mới, kiểm tra revision chống kết quả giải mã cũ. Phiên bản cũ không tuân thủ giao thức khóa này.
- Xuất khóa yêu cầu nhập lại mật khẩu. QR khóa nhạy cảm được xóa khỏi UI theo timeout/khóa/ẩn. JavaScript không bảo đảm xóa sạch mọi bản sao trong bộ nhớ.
- Sao lưu/khôi phục vault mã hóa cục bộ; không giả lập đồng bộ cloud. Sao lưu không tự nhập metadata tài khoản vào Supabase; thêm địa chỉ theo dõi nếu cần.
- Số lượng ký/gửi dùng số nguyên BigInt; bỏ tự tăng số tiền gần hết số dư thành toàn bộ số dư. Chọn token theo địa chỉ hợp đồng, không theo symbol. Chặn gửi BSC khi Dashboard chọn mạng khác.
- Swap dùng allowance đúng lượng, không MaxUint256; không tự nới slippage lên 10%; kiểm tra chain/decimals và báo giá router trước thực thi. Báo giá ước tính ngoài chuỗi không dùng để thực thi.
- LI.FI: ràng buộc báo giá với ý định người dùng, hết hạn 60 giây, lấy payload mới, kiểm tra chain/tài khoản/native spend, gọi simulation và estimateGas trước ký. Chưa phải dịch vụ phát hiện lừa đảo; ERC20 chưa cấp allowance sẽ bị simulation chặn.
- Tuần tự hóa nonce và chặn gửi trùng 30 giây; lưu hash trước broadcast. Timeout hiển thị trạng thái chưa rõ, không tự gửi lại. Nhật ký pending chỉ chứa dữ liệu công khai, không raw signed transaction.
- Thêm xem trạng thái pending, chuẩn bị tăng phí/hủy cùng nonce; xác minh RPC, chủ ví, chain, giao dịch gốc, thời hạn và phí trước ký. Hủy là giao dịch thay thế, không bảo đảm thắng giao dịch gốc.
- Tắt staking/mint NFT giả lập, 2FA/biometric dạng cờ giao diện và cloud backup giả. Chưa tuyên bố các tính năng này đã tích hợp thật.
- Endpoint phục hồi tạm run-sql/upload-file trả 410 trong mã mới. Bản cũ yêu cầu RUN_SQL_SECRET, không phải endpoint SQL công khai; vẫn cần triển khai bản nghỉ hưu lên server.
- Token scanner không nhận RPC tùy ý từ client, yêu cầu JWT người dùng, giới hạn chain/số token. Các scanner xác minh sub/role, giới hạn đầu vào cơ bản và tránh trả/log lỗi có URL chứa API key; thêm timeout HTTP upstream.

## Bổ sung sau khi Cha chọn giữ backend tạm dừng

- Màn quyền ERC20: đọc allowance đúng contract/mạng, giữ BigInt, hiện account/token/spender/hạn mức/phí. Chỉ tạo `approve(spender,0)`, không cấp thêm quyền; simulation trước ký, hết hạn 60 giây, phí tăng hoặc allowance thay đổi phải xem lại.
- Callback kiểm tra ngữ cảnh ví/mạng được gọi lại ngay trước ký trong signer, kể cả sau RPC và khi đóng màn hình. Áp dụng cho thu hồi quyền và giao dịch thay thế pending.
- Quota scanner lưu PostgreSQL, chỉ service role được gọi hàm; anon/user không đọc bảng hay gọi hàm. Cả ba scanner dùng chung 12 lượt/phút và 120 lượt/giờ mỗi user, tổng 600/phút và 6000/giờ. Lỗi quota DB trả 503, không bỏ qua hạn mức.
- Request và response upstream được đếm byte thực, giới hạn thời gian đọc, từ chối redirect upstream. Token scanner chỉ dùng RPC cố định, có deadline RPC và kiểm tra chain/decimals; không dùng URL do client gửi.
- NFT: lịch sử chỉ tạo ứng viên; BSC truy vấn ownerOf/balanceOf mới cho hiển thị. ERC721 nhập/chuyển thủ công kiểm tra sở hữu, ví ký và receipt. Metadata Supabase không phải chứng cứ quyền sở hữu; dữ liệu không tự trở thành quyền tài sản.
- Lịch sử không dựng lại số base-unit từ JSON number hoặc bịa gas/status thành công. Thiếu raw value hiển thị dấu “—”, trạng thái chưa có receipt giữ “Chưa xác minh”. Cần truy vấn receipt thật để bổ sung trạng thái; chưa tích hợp toàn bộ receipt enrichment.

## Kiểm chứng

- Bun: 106 kiểm thử security/WalletConnect, gồm khóa phiên, migration thất bại/quota, mật khẩu cũ, seed cũ/mới, backup, precision, pending và endpoint nghỉ hưu.
- Node: 25 kiểm thử tiện ích Chrome.
- PostgreSQL 17 cục bộ: 21 kiểm tra migration quota, gồm 16 yêu cầu đồng thời, anon/authenticated/service, hạn mức chung giữa endpoint, dọn bộ đếm cũ và áp dụng lại migration.
- TypeScript app và extension đạt.
- Build web PWA và extension đạt. Build thử dùng Supabase giả, không phải bản phát hành.
- Đã kiểm tra giao diện bảo vệ/thu hồi quyền trong fixture ngoại tuyến: địa chỉ sai bị chặn, giữ chính xác hạn mức 18 số lẻ, có phí và nút ký bị khóa khi chưa mở ví. Không có khóa hay broadcast trong fixture.
- Chưa chạy Deno integration hoặc giao dịch testnet end-to-end. Handler scanner được bundle và kiểm thử với stub auth/RPC; endpoint nghỉ hưu dùng stub Deno. Không thay cho kiểm thử Supabase đang triển khai.

## Bước tiếp theo bắt buộc trước phát hành

1. Khôi phục backend sau khi chủ tài khoản xác nhận; đọc metadata RLS/storage/functions, kiểm tra chính sách bằng user A/B/anon, đặc biệt KYC và quyền admin. Không kết luận RLS an toàn từ migration nguồn.
2. Triển khai migration quota trước các scanner mới theo `FUN-WALLET-SCANNER-DEPLOYMENT.vi.md`, sau khi có môi trường backend phù hợp. Đã kiểm thử tính đồng thời trên PostgreSQL cục bộ; cần thử tải và timeout trên Deno thực tế.
3. Rà soát LI.FI transactionRequest/approval/recipient/slippage, kiểm tra hợp đồng và quote hết hạn trước đưa luồng swap/bridge lên production. Chưa hoàn thành kiểm toán LI.FI.
4. Đã thêm kiểm chứng owner cho ERC721 nhập thủ công và owner/balance cho ứng viên BSC ERC721/ERC1155. Cần thử trên RPC/testnet thực; quét BSC giới hạn tối đa 40 ứng viên mỗi chuẩn, không tuyên bố liệt kê đầy đủ NFT.
5. Kiểm thử chuyển vault bằng dữ liệu fixture cũ, UI tạo/import/export/backup/multi-tab, RPC lỗi/nonce/reorg và speedup/cancel trên testnet, không dùng ví có tiền để thử.
6. Rà soát dependency advisory, CSP và bundle; triển khai endpoint nghỉ hưu rồi thu hồi RUN_SQL_SECRET nếu không còn dùng. Chưa thực hiện các thao tác này.

## Đối chiếu chức năng MetaMask

| Chức năng | FUN Wallet hiện tại |
|---|---|
| Vault mã hóa, khóa tự động | Đã vá mã, cần kiểm thử UI/migration trước phát hành |
| Import khóa/seed, backup | Có; tăng bảo vệ, giữ tương thích cũ |
| Gửi native/ERC20, chọn token | Có; vá precision/identity, cần testnet |
| DApp/WalletConnect | Có nền tảng; kiểm thử offline đạt, cần end-to-end |
| Pending/tăng phí/hủy | Bổ sung mã, cần testnet cạnh tranh nonce |
| Quản lý/revoke allowance | Có kiểm tra từng cặp token/spender và thu hồi về 0; chưa tự quét toàn bộ lịch sử allowance |
| Hardware wallet | Chưa tích hợp; không nhận seed của hardware wallet |
| Mô phỏng giao dịch/cảnh báo lừa đảo | Chưa có dịch vụ kiểm chứng độc lập |
| Swap/bridge đa mạng | Có mã LI.FI, còn mục kiểm toán nêu trên |
| WebAuthn/2FA, cloud recovery | Chưa tích hợp thật; giữ vô hiệu hóa |

## Tài liệu tham chiếu

- OWASP PBKDF2 SHA-256 600.000 vòng: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- MetaMask tăng phí/hủy: https://support.metamask.io/manage-crypto/transactions/how-to-speed-up-or-cancel-a-pending-transaction/
- MetaMask bảo vệ recovery phrase: https://support.metamask.io/privacy-and-security/what-is-a-secret-recovery-phrase-and-how-to-keep-your-crypto-wallet-secure

- MetaMask về thu hồi quyền token: https://support.metamask.io/more-web3/learn/how-to-revoke-smart-contract-allowances-token-approvals
- PostgreSQL về ON CONFLICT nguyên tử: https://www.postgresql.org/docs/18/sql-insert.html
