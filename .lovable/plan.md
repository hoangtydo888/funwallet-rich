## Giai đoạn 4 — NFT Multi-chain + ⭐ Watchlist + LiFi Swap/Bridge ✅ DONE

Cha xác nhận GĐ4 gồm 3 hạng mục:
1. Edge function `nft-scanner` đa chain + mở rộng `useNFT` theo Watchlist
2. Nút ⭐ trên `TokenList` để add token vào Watchlist nhanh
3. Tích hợp **LiFi SDK** cho Swap Aggregator + Bridge

---

### 1. Edge function `nft-scanner` (ERC721 + ERC1155 đa chain)

- File mới `supabase/functions/nft-scanner/index.ts`.
- Validate JWT trong code, CORS chuẩn, Zod validate input `{ address, chainId }`.
- Router theo chain:
  - **BSC (56)**: BscScan `tokennfttx` + `token1155tx` (dùng `BSCSCAN_API_KEY` đã có).
  - **ETH (1) / Polygon (137) / Arbitrum (42161) / Optimism (10) / Base (8453)**: Alchemy NFT API v3 `getNFTsForOwner` (**cần `ALCHEMY_API_KEY`**).
  - Chain khác: trả `{ nfts: [], unsupported: true }`.
- Output chuẩn: `{ contractAddress, tokenId, standard, name, image, collection, chainId, balance }[]`.
- Upsert cache vào bảng `nft_collections` (đã tồn tại) để giảm rate-limit.

### 2. Mở rộng `useNFT`

- Chuyển từ fetch trực tiếp BscScan → `supabase.functions.invoke("nft-scanner", …)`.
- Thêm option `watchlistOnly?: boolean` và `chainIds?: number[]` (fetch song song, merge).
- `NFTGallery`:
  - Badge chain trên mỗi card
  - Toggle "Chỉ Watchlist ⭐"
  - Empty state có CTA về TokenList

### 3. Nút ⭐ trên `TokenList`

- Thêm icon `<Star>` (lucide) mỗi row: filled+vàng khi `isWatched`, outline khi chưa.
- onClick → `useWatchlist().toggle({ chain_id, token_address, symbol, name, logo_url, decimals })`.
- Native token dùng address sentinel `0x000…000`.
- Áp dụng thêm ở `TokenDetailDialog` (⭐ trên header).

### 4. LiFi SDK — Swap + Bridge

- `bun add @lifi/sdk`.
- `src/lib/lifi.ts`: `createConfig({ integrator: "fun-wallet" })`, helpers `getTokens`, `getQuote`, `getRoutes`, `executeRoute`, `getStatus`. Wrap ethers v6 signer từ `useWallet` (unlock PIN nếu cần).
- Refactor `src/components/swap/SwapDialog.tsx`:
  - Tabs **Swap** (same-chain) / **Bridge** (cross-chain)
  - Chain selector nguồn+đích (từ `SUPPORTED_CHAINS`)
  - Token autocomplete từ LiFi `getTokens()`
  - Hiển thị: rate, gas, fee bridge, ETA, provider (Stargate/Across/…)
  - Slippage tolerance (default 0.5%, 0.1–5%)
  - Flow: Approve (nếu cần) → Confirm → progress steps → polling `getStatus`
  - Persist swap/bridge vào bảng `transactions` (đã có), type `swap`/`bridge`
  - Toast persistent để user rời dialog vẫn theo dõi bridge (5–20 phút)

### 5. Cleanup

- Update `.lovable/plan.md`: đánh dấu GĐ4 done.
- Đồng bộ Watchlist tab trong `Wallet.tsx` khi ⭐ toggle từ TokenList.

---

### Secret cần thêm

| Secret | Dùng ở | Nguồn |
|---|---|---|
| `ALCHEMY_API_KEY` | edge fn `nft-scanner` | Cha lấy free tại alchemy.com |

LiFi + Watchlist **không cần** secret.

Nếu Cha chưa có `ALCHEMY_API_KEY`, con vẫn triển khai được — các chain non-BSC sẽ trả `unsupported: true` cho tới khi bổ sung key.

### Thứ tự thực hiện

```text
1. add_secret ALCHEMY_API_KEY (chờ Cha)
2. Edge fn nft-scanner + deploy
3. Refactor useNFT (multi-chain + watchlistOnly)
4. NFTGallery: badge chain + toggle Watchlist
5. Nút ⭐ TokenList + TokenDetailDialog
6. bun add @lifi/sdk + src/lib/lifi.ts
7. Refactor SwapDialog (Swap + Bridge tabs, executeRoute + status polling)
8. Persist tx vào transactions
9. Update .lovable/plan.md
```

### Không đụng

Theme tokens (đã khóa GĐ3), private key encryption, auth flow, database schema.

### Rủi ro

- LiFi cần signer thật → phải unlock ví trước swap (prompt PIN).
- Bridge lâu → cần polling background + toast persistent.
- Alchemy free tier có rate limit → cache 5 phút vào `nft_collections`.
