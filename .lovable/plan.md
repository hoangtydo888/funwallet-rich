# Khôi phục màu Dashboard tiles theo Hình 1

## Vấn đề
Dashboard hiện tại (Hình 2) dùng bảng màu `PALETTE` gồm `primary/teal/gold/emerald/neutral/ghost` — kết quả là các tile bị nhạt (trắng/emerald/gold lặp lại). Hình 1 (bản gốc) mỗi tile có một màu cầu vồng riêng: đỏ, coral, cam, vàng, xanh lá, cyan, tím đậm, magenta, emerald, cyan, violet, xám, vàng, cam, teal, xanh lá, hồng.

Các token `bg-tile-*` (red, coral, orange, yellow, green, cyan, purple, magenta, emerald, violet, teal, pink, slate) đã tồn tại sẵn trong `src/theme/tokens.ts` + `index.css` + `tailwind.config.ts` — chỉ cần gán lại vào từng `QuickAction`.

## Thay đổi (chỉ 1 file)

**`src/pages/Dashboard.tsx`**

1. Trong component `QuickAction` (khoảng dòng 862+): đảm bảo `colorClass` được áp lên tile, và với các tile màu sáng (yellow/green/slate) chữ dùng `text-black`, còn lại `text-white`. Cách nhanh: bỏ text color cứng khỏi PALETTE, thay bằng `colorClass` chứa cả bg + text.

2. Thay bảng `PALETTE` bằng map trực tiếp theo Hình 1:

   Hàng 1 (6 tile): Gửi=red, Gửi nhiều=coral, Nhận=orange, Swap=yellow, Stake=green, Thêm=cyan
   Hàng 2 (6 tile): Giá=purple, DApps=magenta, Backup=emerald, WC=cyan, QR=violet, Refresh=slate
   Hàng 3 (5 tile): Earn=yellow, Transfer=orange, History=teal, Card=green, Learn=pink

3. Với mỗi tile: `colorClass="bg-tile-<name> <fg> shadow-elegant rounded-2xl"` — trong đó `<fg>` = `text-black` cho yellow/green/cyan/slate, `text-white` cho các màu còn lại (theo bảng `TILE_FG` đã có trong `ThemePreview.tsx`).

4. Giữ nguyên toàn bộ logic khác (icon, onClick, disabled, grid, header, wallet card).

## Không đụng tới
- `index.css`, `tailwind.config.ts`, `theme/tokens.ts` (các token đã đúng).
- Các trang khác, edge functions, hooks.

## Kỹ thuật
Chỉ chỉnh presentation trong `Dashboard.tsx`, không đổi business logic. Sau khi apply, `/dashboard` sẽ trùng khớp Hình 1.
