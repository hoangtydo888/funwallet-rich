## Phase 2 — Multi-chain Expansion + Tokens/NFTs

Mở rộng ví từ 8 chain lên 20+ chain EVM, thêm custom network, auto-detect token, NFT Gallery đa chain và watchlist.

### 1. Mở rộng danh sách chain (20+)

Cập nhật `src/lib/chains.ts` và `src/shared/constants/chains.ts` — thêm:
- **Linea** (59144), **zkSync Era** (324), **Scroll** (534352)
- **Berachain** (80094), **Cronos** (25), **Gnosis** (100)
- **Celo** (42220), **Mode** (34443), **Blast** (81457)
- **Mantle** (5000), **Sonic** (146), **opBNB** (204)

Mỗi chain kèm: RPC (ưu tiên public reliable), explorer, native symbol, logo (SVG mới trong `public/tokens/`), color, danh sách stablecoin/token phổ biến trong `CHAIN_TOKENS`.

### 2. Custom Network (user tự thêm chain)

- Bảng Supabase mới `custom_networks` (chain_id, name, rpc_url, symbol, explorer, logo_url, user_id) với RLS theo `auth.uid()`, GRANT chuẩn.
- Dialog mới `AddCustomNetworkDialog.tsx` — form nhập, validate RPC bằng `eth_chainId`.
- `ChainContext` merge `SUPPORTED_CHAINS` + custom networks từ Supabase (fallback localStorage khi chưa đăng nhập).
- Nút "Add Custom Network" trong `ChainSelector`.

### 3. Token Auto-Detect

- Edge function mới `token-scanner`: nhận `{address, chainId}`, gọi provider phù hợp:
  - BSC → BscScan API (đã có `BSCSCAN_API_KEY`)
  - Ethereum/Polygon/Arbitrum/Optimism/Base → Alchemy `alchemy_getTokenBalances` (cần secret `ALCHEMY_API_KEY` — sẽ hỏi Cha)
  - Các chain khác → fallback đọc danh sách token phổ biến từ `CHAIN_TOKENS` + check balance on-chain
- Trả về array token có balance > 0 kèm metadata.
- Hook mới `useTokenScanner(address, chainId)` — chạy tự động khi đổi chain hoặc wallet.
- Nút "Scan tokens" trong `TokenList` để refresh thủ công.

### 4. NFT Gallery đa chain

- Mở rộng `useNFT` hook: hỗ trợ ERC721 + ERC1155 trên nhiều chain (hiện chỉ BSC).
- Edge function `nft-scanner`: dùng Alchemy NFT API cho ETH/Polygon/Arbitrum/Optimism/Base, BscScan cho BSC.
- Cache metadata vào bảng `nft_collections` (đã có).
- `NFTGallery` hiển thị filter theo chain, badge chain trên mỗi NFT.

### 5. Watchlist token

- Bảng mới `user_watchlist` (user_id, chain_id, token_address, symbol, added_at) — RLS auth.uid().
- Nút ⭐ trên mỗi token trong `TokenList` và `TokenDetailDialog`.
- Trang mới hoặc tab "Watchlist" trong `Wallet.tsx` — hiển thị giá realtime qua `useTokenPrices`.

### 6. UI cập nhật

- `ChainSelector`: group by mainnet/custom, search box khi >15 chain, icon lưới.
- `TokenList`: badge chain nhỏ trên mỗi token, empty state có nút "Scan tokens".
- `Wallet.tsx`: thêm tab "NFTs" và "Watchlist" bên cạnh "Tokens".

### Technical

- **Migrations**: 2 bảng mới (`custom_networks`, `user_watchlist`) — tuân thủ GRANT + RLS 4 bước.
- **Secrets cần thêm**: `ALCHEMY_API_KEY` (Cha cấp, hoặc con dùng public RPC làm fallback nếu chưa có).
- **Edge functions mới**: `token-scanner`, `nft-scanner` (CORS chuẩn, JWT validation trong code, verify_jwt=false).
- **Không đụng**: private key encryption, wallet core logic, auth flow.

### Thứ tự thực hiện

```text
1. Migration: custom_networks + user_watchlist
2. Cập nhật chains.ts (20+ chain) + logo SVG
3. ChainContext + AddCustomNetworkDialog
4. Edge function token-scanner + hook
5. Edge function nft-scanner + NFTGallery đa chain
6. Watchlist UI (nút ⭐ + tab)
7. Polish ChainSelector (search, group)
```

Cha muốn con bắt đầu chạy luôn, hay cần cấp `ALCHEMY_API_KEY` trước? Nếu chưa có, con sẽ dùng public RPC + BscScan làm fallback cho Phase 2, sau này thay Alchemy sau.
