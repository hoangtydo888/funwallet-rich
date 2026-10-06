# FUN Wallet — Đánh giá và lộ trình nâng cấp

Ngày: 04/10/2026. Phạm vi: đọc mã nguồn trong workspace và ảnh người dùng cung cấp. Website https://wallet.fun.rich không truy cập được qua công cụ web của phiên này; không có công cụ điều khiển trình duyệt tương ứng để kiểm tra tương tác. Chưa xác nhận mã đang triển khai trùng với repository, chưa chạy build, testnet hoặc audit độc lập. Không thực hiện giao dịch, thay đổi dữ liệu production hay kiểm tra xâm nhập.

## Định hướng đề xuất

Hoàn thiện ví tự quản EVM trước: người dùng giữ khóa, tự duyệt ký, kết nối ứng dụng và gửi nhận tài sản. BSC là phạm vi đầu tiên để kiểm chứng; mở rộng mạng sau khi từng mạng vượt kiểm thử. Số lượng mạng cấu hình không đồng nghĩa đã hỗ trợ đầy đủ.

Tách hai đích sản phẩm: ví tự quản tích hợp swap và một sàn tập trung có lưu ký, sổ cái và khớp lệnh. Chưa coi yêu cầu “giống Binance” là quyết định xây sàn lưu ký. Quy mô, nhân sự, ngân sách, thị trường và mô hình quản lý tài sản cần chốt trước nhánh sàn.

## Phát hiện từ mã nguồn

| Ưu tiên | Bằng chứng | Ý nghĩa và việc cần làm |
| --- | --- | --- |
| P0 | `src/hooks/useWallet.ts`: create/import/link ghi khóa vào `fun_wallet_pk`; `src/components/wallet/CreateWalletDialog.tsx` mã hóa ở bước sau | Có đường ghi khóa dạng rõ xuống localStorage. Chuyển sang một vault mã hóa; chỉ hoàn tất tạo/nhập sau khi lưu thành công. Migration phải xác minh giải mã trước khi xóa bản cũ và không làm mất ví. |
| P0 | `src/extension/src/content/inject.ts` chuyển tiếp `method` từ page; `src/extension/src/background/service-worker.ts` cùng router xử lý RPC và `APPROVE_*`, `UNLOCK_WALLET`, `CONNECT_DAPP` | Ranh giới quyền chưa được phân tách trong đường mã đã đọc. Chặn method nội bộ từ content script; xác minh nguồn popup bằng sender do Chrome cung cấp; ràng buộc request với origin/tab/frame/account/chain, loại yêu cầu và thời hạn. Đây là phát hiện tĩnh, chưa xác minh khai thác runtime. |
| P0 | `src/lib/walletconnect.ts`: `simulateConnect`; dialog thực sự gọi hàm này | WC hiện tạo session Demo DApp trong localStorage, chưa phải kết nối relay thật. Thay bằng SDK phía ví, duyệt proposal và từng yêu cầu ký; kiểm tra expiry/revoke/reconnect. |
| P0 | `src/lib/staking.ts` mô phỏng stake/unstake/claim và sinh hash ngẫu nhiên | Tách chế độ demo, không hiển thị như giao dịch on-chain thành công. Chỉ bật staking thật khi có hợp đồng, chain, receipt và đánh giá rủi ro cụ thể. |
| P0 | `src/lib/backup.ts`: backup đọc `pk_<address>`, khác kho khóa trong useWallet; cloud backup dùng localStorage | Chuẩn hóa nguồn vault, thử khôi phục trên môi trường sạch; không gọi lưu cục bộ là cloud. Lưu khóa đã mã hóa chưa đủ chứng minh bản backup khôi phục được. |
| P1 | `src/hooks/useSecureWallet.ts`: đổi mật khẩu ghi lại từng ví tuần tự | Có nguy cơ kho khóa dùng lẫn mật khẩu nếu giữa chừng thất bại. Chuẩn bị toàn bộ bản mới, xác minh, rồi commit nguyên khối; thử lỗi giữa chừng. |
| P1 | `src/lib/wallet.ts`: sendToken tự nâng số lượng gần toàn bộ số dư thành toàn bộ số dư | Số lượng ký phải khớp số lượng được người dùng xác nhận. Chỉ gửi hết khi chọn Max và cập nhật màn xác nhận. |
| P1 | `supabase/functions/run-sql/index.ts`: runner SQL tùy ý có kiểm tra secret | Xác minh có triển khai không và còn cần phục hồi không; gỡ khỏi production khi hết nhu cầu. Không kết luận endpoint công khai hoặc không có xác thực. |

Nền tảng có sẵn: React/TypeScript, Supabase, hàm gửi BNB và token qua ethers, module mã hóa AES-GCM, danh mục nhiều mạng, extension có EIP-6963 và handler ký. Có mã nguồn không chứng minh các luồng đã hoạt động end-to-end. Các test tìm thấy trong `tests/` tập trung vào giao diện; cần bổ sung kiểm thử bảo mật, giao dịch và phục hồi.

## Các đợt triển khai và điều kiện nghiệm thu

### Đợt 1 — Bảo vệ khóa và tính trung thực của sản phẩm

- Thống nhất vault và signer giữa các luồng; không ghi khóa/seed dạng rõ ra persistent storage hoặc log.
- Migration có khả năng phục hồi; sao lưu/khôi phục trên thiết bị sạch trả về đúng địa chỉ. Không xóa bản cũ trước khi xác minh bản mới.
- Tách RPC công khai khỏi lệnh nội bộ extension, kiểm tra sender và quyền trong background.
- Chặn hoặc gắn nhãn rõ chức năng mô phỏng; không tạo hash giả trong luồng thực.
- Nghiệm thu: tạo/nhập/khóa/mở/đổi mật khẩu/backup/restore qua được kiểm thử; mã hóa thất bại không báo thành công; page không gọi được lệnh duyệt nội bộ; request hết hạn hoặc sai chain/account bị từ chối.

### Đợt 2 — Kết nối dApp thực sự

- WalletConnect phía ví: pairing, proposal, tài khoản/mạng/method được cấp quyền, request queue, duyệt/từ chối, hết hạn, thu hồi và khôi phục session.
- Hoàn thiện provider EIP-1193 và kiểm thử EIP-6963 đang có: lỗi chuẩn, accountsChanged, chainChanged, coexistence với ví khác.
- Màn ký phải hiện domain, mạng, tài khoản, người nhận, số lượng và phí; giải mã typed data, hạn mức token approval và nội dung Permit.
- Nghiệm thu: dApp test kết nối, ký thông điệp kiểm chứng được, gửi testnet có receipt; từ chối/khóa/ngắt session không tiếp tục ký; nhiều tab không nhận nhầm phản hồi. Không mặc định bật `eth_sign` chỉ vì có trong danh sách method cũ.

### Đợt 3 — Profile Web3 và thanh toán

- FUN ID: một profile liên kết nhiều địa chỉ bằng chứng minh sở hữu qua chữ ký, có unlink và chọn địa chỉ nhận theo mạng.
- SIWE: server phát nonce một lần, xác minh domain/URI/chain/thời hạn/chữ ký và chống replay; hỗ trợ ví hợp đồng nếu nằm trong phạm vi. Không coi địa chỉ người dùng tự nhập là đã xác minh.
- Tên dễ nhớ, sổ địa chỉ, QR/payment link có chainId, token contract và số lượng; luôn hiện địa chỉ đích trước khi duyệt. Kiểm tra lại khi profile đổi địa chỉ nhận.
- SDK “Connect FUN Wallet” cho các platform nội bộ; mỗi platform có phiên và quyền riêng. Thu hồi đăng nhập không đồng nghĩa thu hồi token allowance.
- Lịch sử pending/confirmed/failed/replaced theo receipt và chính sách xác nhận từng mạng; xử lý RPC lỗi, reorg và gửi lặp.
- Nghiệm thu: gửi/nhận giữa hai ví trên testnet, liên kết profile không thể chiếm bằng replay, sai mạng không gửi nhầm, payment link không tự kích hoạt ký.

### Đợt 4 — Trải nghiệm ví nâng cao

- Swap có báo giá, slippage, minimum received, phí và allowance rõ ràng; receipt thật và xử lý quote hết hạn.
- Trung tâm bảo mật: dApp sessions, token approvals/revoke, cảnh báo domain/token và mô phỏng tác động giao dịch khi khả dụng.
- Tiếp theo mới đánh giá ví cứng, passkey/smart account, gas sponsorship, bridge và mạng ngoài EVM. Mỗi tính năng cần mô hình khôi phục và giới hạn rủi ro riêng.
- UI: giữ Gửi, Nhận, Swap, Kết nối ở nhóm chính; đưa tiện ích phụ vào Khám phá. Trong ảnh, phần số dư bị cắt ở phía trên; cần tái hiện trên website trước khi xác định lỗi layout. Giảm màu cạnh tranh và ưu tiên số dư, mạng, địa chỉ, trạng thái giao dịch.

### Nhánh sàn tập trung — chỉ lập dự án riêng sau khi chốt phạm vi

Thiết kế sổ cái kép và đối soát, deposit indexer với confirmation/reorg, withdrawal queue có idempotency và kiểm soát rủi ro, quản lý khóa lưu ký, hot/cold wallets, hạn mức và phân quyền. Sau đó mới đến order management, matching engine, thanh khoản, dữ liệu thị trường và giám sát vận hành. Yêu cầu pháp lý/đối tác fiat phải được đánh giá theo thị trường cụ thể trước triển khai; tài liệu này không đưa ra kết luận pháp lý.

Một trang Trading, Card hay KYC không chứng minh có hệ thống sàn, phát hành thẻ hoặc quy trình tuân thủ hoàn chỉnh. Không đặt thời hạn hay ngân sách tương đương MetaMask/Binance khi chưa định phạm vi và kiểm chứng nền hiện tại.

## Kiến trúc đích

UI ví → yêu cầu có kiểu dữ liệu rõ → kiểm tra quyền và nội dung → người dùng duyệt → signer/vault → RPC → theo dõi receipt.

Kết nối dApp qua extension/WalletConnect cùng dùng chính sách quyền. Backend quản lý profile, nonce đăng nhập, dữ liệu công khai và thông báo; không nhận seed/private key trong mô hình tự quản. Treasury của dự án nên được thiết kế riêng với ví cá nhân và có quy trình phê duyệt nhiều người.

## Tiêu chí phát hành

Không còn phát hiện P0 chưa xử lý; kiểm thử hành vi sai quyền và lỗi khôi phục; testnet end-to-end; đánh giá bảo mật độc lập trước mở rộng sử dụng tiền thật. Theo dõi tỷ lệ kết nối, giao dịch thất bại, thời gian xác nhận và lỗi RPC bằng telemetry không chứa bí mật. Mỗi đợt phải có phương án rollback không làm mất dữ liệu vault.

## Tài liệu chuẩn đã đối chiếu

- EIP-1193 — Provider API: https://eips.ethereum.org/EIPS/eip-1193
- EIP-6963 — khám phá nhiều provider: https://eips.ethereum.org/EIPS/eip-6963
- ERC-4361 — Sign-In with Ethereum: https://eips.ethereum.org/EIPS/eip-4361
- WalletConnect — hướng dẫn xây ví: https://walletconnect.com/blog/how-to-build-a-wallet-with-walletconnect-complete-guide

Thay đổi trong đợt đánh giá này: chỉ thêm tài liệu này. Chưa triển khai các hạng mục nâng cấp hoặc sửa đổi mã xử lý tài sản.
