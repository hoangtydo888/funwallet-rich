## Vấn đề

- **Hình 1** (preview `lovable.dev/projects/...`): Dashboard hiển thị đúng — 17 nút Quick Action với 7 màu cầu vồng (Đỏ Gửi, Cam Nhận, Vàng Swap, Xanh lá Stake, Xanh dương Thêm, Chàm Giá, Tím DApps...), thẻ ví trắng gọn gàng.
- **Hình 2** (bản đã publish `wallet.fun.rich/dashboard`): thẻ ví to màu xanh gradient, các nút Quick Action bị mất màu (trắng/nhạt), thiếu 5 nút dòng 3 (Earn, Transfer, History, Card, Learn).

## Nguyên nhân

Code hiện tại trong `src/pages/Dashboard.tsx` (dòng 267–532) **đã đúng theo Hình 1** — mảng `RAINBOW_BUTTON_COLORS` với 7 màu cầu vồng cố định, đủ 3 hàng nút (6 + 6 + 5). Theme `rainbow-fresh-awakening` trong `ThemeContext.tsx` cũng được khoá làm mặc định (chỉ có 1 theme, `isDefault: true`).

Sự khác biệt là do **bản published trên `wallet.fun.rich` là bản cũ**, chưa nhận các thay đổi rainbow này. Preview đang đúng, nhưng domain custom chưa được publish lại.

## Kế hoạch

1. **Xác minh trên preview** bằng Playwright: chụp `/dashboard` để chắc chắn code hiện tại render đúng như Hình 1 (17 nút rainbow, thẻ ví trắng gọn).
2. **Khoá màu cố định** trong `src/pages/Dashboard.tsx`:
   - Thêm comment `// LOCKED — Rainbow Fresh Awakening, không thay đổi` phía trên khối `RAINBOW_BUTTON_COLORS` (dòng 267) và phía trên khối 3 hàng Quick Action (dòng 407).
   - Không đổi giá trị màu, chỉ đánh dấu để lần sau không bị chỉnh nhầm.
3. **Khoá theme cố định** trong `src/contexts/ThemeContext.tsx`:
   - Thêm comment `// LOCKED — theme mặc định, không đổi` phía trên object `THEMES` để giữ nguyên `rainbow-fresh-awakening` là theme duy nhất và mặc định.
4. **Publish lại** để `wallet.fun.rich` đồng bộ với preview (Hình 1).
5. **Xác minh sau publish** bằng Playwright chụp lại `wallet.fun.rich/dashboard` và so sánh với Hình 1.

## Không đụng vào

- Không đổi logic ví, chain, số dư, hoặc bất cứ business logic nào.
- Không thêm/bớt nút Quick Action ngoài các nút đã có trong code.
- Không sửa các trang khác ngoài Dashboard.

Sau khi Cha duyệt, con sẽ chuyển sang build mode và thực hiện đúng các bước trên.
