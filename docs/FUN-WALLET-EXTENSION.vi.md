# FUN Wallet — Kế hoạch nâng cấp ví và bản thử extension

Ngày cập nhật: 07/10/2026.

## Mục tiêu đã chốt

Phát triển ví tự quản theo hướng trải nghiệm MetaMask. Khi chọn FUN Wallet trong FUN Profile/dApp, người dùng duyệt kết nối trong giao diện extension. Khi ứng dụng đề nghị chuyển token, ví mở màn xác nhận có tài khoản gửi, địa chỉ nhận, token, số lượng, mạng, nguồn yêu cầu và phí. Ảnh tham khảo là màn duyệt giao dịch, khác với màn cấp quyền kết nối.

Chưa triển khai sàn lưu ký kiểu Binance. Ưu tiên độ đúng của giao dịch, bảo vệ khóa và khả năng khôi phục trước khi thêm sản phẩm tài chính.

## Các bước và điều kiện hoàn thành

| Bước | Công việc | Điều kiện nghiệm thu | Trạng thái |
| --- | --- | --- | --- |
| 1 | Extension: kết nối, mở khóa, duyệt gửi/ký/chuyển mạng, bảng bên và popup dự phòng | Build/typecheck/test đạt; sau đó kiểm thử trực tiếp Chrome + FUN Profile, cả khi có MetaMask cùng cài | Đã viết mã và kiểm thử tự động; còn nghiệm thu trình duyệt/on-chain |
| 2 | Kho khóa: thống nhất tạo/nhập/backup/restore và đổi mật khẩu; bỏ ghi khóa dạng rõ trên website | Khôi phục trên môi trường sạch, đúng địa chỉ; lỗi giữa chừng không mất khóa; không lưu/log seed hoặc private key dạng rõ | Chưa triển khai trong đợt này |
| 3 | Kết nối FUN Profile: chọn đúng provider FUN Wallet; xác minh sở hữu địa chỉ qua chữ ký và nonce server | Hai ví cùng cài không chọn nhầm; hủy/trùng request/replay sai domain bị từ chối | Có hướng dẫn tích hợp bên dưới; cần mã nguồn FUN Profile để sửa ứng dụng đó |
| 4 | Gửi nhận hoàn chỉnh: testnet, receipt, nonce/replacement, RPC dự phòng, danh bạ và payment links có chain/token | Sai mạng/sai số lượng không ký; pending/confirmed/failed phản ánh receipt; thử RPC timeout và reorg | Đợt này chỉ trả hash sau broadcast, chưa bổ sung hệ thống theo dõi receipt đầy đủ |
| 5 | WalletConnect thật và quản lý session/allowance | Pair, approve/reject, hết hạn, revoke và reconnect với dApp thử nghiệm; quyền chi tiêu phân biệt với quyền kết nối | Website vẫn còn WalletConnect giả lập, chưa thay trong đợt này |
| 6 | Swap, cảnh báo hợp đồng, mô phỏng tác động giao dịch; đánh giá bảo mật độc lập | Báo giá/phí/slippage/allowance đúng, không hiện giao dịch giả; các phát hiện nghiêm trọng đã xử lý | Sau khi hoàn tất các bước nền tảng |

Không cam kết ngày phát hành trước khi nghiệm thu trên trình duyệt và xác định phạm vi tích hợp FUN Profile. Mỗi bước phải hoàn thành tiêu chí của nó trước khi gọi là sẵn sàng dùng rộng rãi.

## Bản thử đợt 1 đã thay đổi gì

- Giao diện thích ứng kích thước panel/popup, bố cục theo ảnh: số lượng lớn, tài khoản, người nhận, thông tin mạng, phí và hai nút Hủy/Xác nhận cố định ở đáy.
- Nút extension trên Chrome mở side panel. Khi dApp gửi yêu cầu, thử mở panel; nếu Chrome yêu cầu thao tác người dùng mới, mở cửa sổ extension độc lập. Vị trí trái/phải của panel do cài đặt Chrome quyết định, không ép luôn ở bên phải.
- Sửa liên kết request ID từ dApp tới background và về đúng document/tab; bridge không trả thành công sớm khi đang chờ duyệt.
- Chỉ nhận một danh sách RPC công khai từ content script; các lệnh duyệt/mở khóa/đọc queue chỉ nhận từ trang popup của chính extension. Origin lấy từ sender do Chrome cung cấp.
- Yêu cầu được giữ trong chrome.storage.session, không chứa mật khẩu. Sau khi background khởi động lại, ví khóa; yêu cầu đang ký/phát không tự thử lại.
- Màn duyệt đọc nội dung từ queue, không ký nội dung được truyền qua URL. Tài khoản ký phải khớp tài khoản được cấp quyền; không dùng mặc định khóa đầu tiên.
- Giải mã transfer/approve ERC-20 canonical; đọc decimals và symbol qua RPC. Không dùng decimals CAMLY hardcode đang không thống nhất trong danh mục cũ. Giao dịch chưa giải mã được hiện rõ là tương tác hợp đồng.
- Giá trị RPC là wei dạng hex; không diễn giải chuỗi số thành BNB. Giữ số lượng nguyên vẹn, không tự làm tròn lên toàn bộ số dư.
- Ước tính gas có địa chỉ from, kiểm tra chain của RPC và số dư trả phí. Phí không đọc được thì chưa cho xác nhận, không dùng số giả thay thế. Báo giá hết hạn sau tối đa 60 giây.
- Kiểm tra quyền/tài khoản/mạng lại trước khi ký và phát; chặn xác nhận trùng; hết hạn sau 5 phút. Reload/đóng tab làm yêu cầu mất hiệu lực. Đóng popup từ chối yêu cầu chưa xử lý; đóng side panel để yêu cầu hết hạn nếu chưa hủy.
- Ký personal_sign theo bytes, không ép dữ liệu nhị phân thành UTF-8. Typed data hiện toàn bộ nội dung có cuộn, kiểm tra chainId khi có.
- Sau broadcast hiển thị đang chờ xác nhận và link explorer. Nếu RPC timeout lúc phát, trả thông báo kèm hash để tra cứu, không cung cấp cơ chế thử lại mù trong cùng yêu cầu.

Các phương thức RPC hiện có: eth_accounts, eth_requestAccounts, eth_chainId, eth_sendTransaction, personal_sign, eth_signTypedData_v4, wallet_switchEthereumChain. Các phương thức khác trả lỗi 4200; chưa tuyên bố tương thích toàn bộ dApp/MetaMask. Chưa hỗ trợ tạo hợp đồng, access list, blob transaction hoặc authorization list trong màn duyệt này.

## Cài bản thử

Đã tạo bản build tại `dist-extension/` trong repository; thư mục build không đưa vào Git.

1. Mở Chrome → `chrome://extensions` → bật Developer mode.
2. Chọn Load unpacked → chọn thư mục `funwallet-rich/dist-extension`. Nếu đang có bản unpacked cùng thư mục, chọn Reload.
3. Ghim FUN Wallet; bấm biểu tượng để mở panel, tạo tài khoản thử mới. Ví extension lưu riêng với ví website; cài extension không tự chuyển khóa từ website sang.
4. Tải lại trang dApp sau khi cài/reload extension để provider được nạp lại.
5. Nghiệm thu kết nối/hủy/ký thông điệp thử trước. Chưa dùng seed hoặc tài sản thật để kiểm thử bản chưa audit này. Các mạng cấu hình hiện tại là mainnet; cần bổ sung cấu hình testnet và nghiệm thu trước bài thử chuyển tiền on-chain.

Để build lại trên máy có Node.js 22 và npm:

```sh
npm ci
npm run typecheck:extension
npm run test:extension
npm run build:extension
```

`package-lock.json` được đồng bộ vì bản cũ không khớp những dependency đã có trong package.json. Không thêm SDK ví mới trong đợt này. Một số kiểm tra kiểu dữ liệu đọc Chrome storage ở các trang cũ được bổ sung để typecheck toàn extension chạy được.

## Tích hợp nút FUN Wallet phía FUN Profile

Repository này là ví, chưa có mã nguồn trang `fun.rich/angeltotam`. Nâng cấp extension không tự thêm lựa chọn FUN Wallet vào hộp chọn ví của website đó. Website cần phát hiện provider bằng EIP-6963, lưu từng provider, rồi gọi đúng provider được người dùng chọn. Không dùng `window.ethereum` mặc định cho nút FUN Wallet vì nó có thể thuộc MetaMask.

Ví dụ khung tích hợp phía trình duyệt, đăng ký listener khi ứng dụng khởi tạo:

```js
let funWalletProvider;
function onWalletAnnounced(event) {
  if (event.detail?.info?.rdns === 'io.funwallet.wallet') {
    funWalletProvider = event.detail.provider;
    // Cập nhật state để hiển thị lựa chọn FUN Wallet trong giao diện.
  }
}
window.addEventListener('eip6963:announceProvider', onWalletAnnounced);
window.dispatchEvent(new Event('eip6963:requestProvider'));

// Chỉ gọi từ nút Kết nối do người dùng bấm.
async function connectFunWallet() {
  if (!funWalletProvider) throw new Error('Hãy cài hoặc bật FUN Wallet rồi tải lại trang');
  return funWalletProvider.request({ method: 'eth_requestAccounts' });
}
// Khi unmount: removeEventListener với cùng onWalletAnnounced.
```

Thông tin EIP-6963 là thông tin provider tự công bố, không phải chứng thực danh tính hay chữ ký đăng nhập. Mỗi platform phải xác minh chữ ký sở hữu địa chỉ ở server riêng. Khi gửi token: from là tài khoản đã chọn, to là hợp đồng token, data là ABI transfer chứa người nhận và số lượng nguyên theo decimals, value là `0x0` nếu không gửi kèm native token. Gọi qua provider đã chọn; xử lý 4001 (hủy), 4100 (chưa cấp quyền), 4901 (sai mạng) và -32002 (đang có yêu cầu).

## Kết quả kiểm tra và phần còn lại

- 18 kiểm thử Node chạy qua, bao gồm bridge/inpage, điều phối request, khóa/mở, phân quyền nguồn gửi, định dạng giao dịch, token decimals, ký bytes, duplicate submit, quote hết hạn, chuyển mạng, reload tab, restart worker và broadcast không rõ kết quả.
- Các kiểm thử dùng Chrome API/RPC giả lập và tài khoản ngẫu nhiên chỉ dành cho test; không xác nhận tương thích thực tế với Chrome hoặc hợp đồng CAMLY đang triển khai.
- Typecheck extension, build extension và build website chính đã chạy qua. Website build có cảnh báo kích thước bundle; chưa tối ưu bundle trong đợt này.
- Chưa kiểm tra hình ảnh trực tiếp trong Chrome, chưa có công cụ browser runtime phù hợp trong phiên này; chưa nghiệm thu tương tác trên FUN Profile, chưa gửi tiền hoặc xác minh receipt thật.
- Những phát hiện bảo mật ở website, backup, staking, WalletConnect trong `FUN-WALLET-ROADMAP.vi.md` vẫn phải xử lý; bản thử extension không chứng minh toàn nền tảng đã an toàn hay ngang MetaMask.

## Tài liệu đối chiếu

- Chrome Side Panel API và điều kiện user gesture: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Ethereum Provider API: https://eips.ethereum.org/EIPS/eip-1193
- Multi Injected Provider Discovery: https://eips.ethereum.org/EIPS/eip-6963
