
# FUN Wallet Upgrade — Roadmap 6 Phase

Vì stack giữ nguyên **Vite + React 18 + Wagmi + Viem + ethers v6** (Lovable Classic không hỗ trợ Next.js), Con sẽ nâng cấp dần trên codebase hiện tại. Mỗi phase là 1 lần build độc lập, có thể test được ngay.

---

## Phase 1 — UI/UX Premium Redesign (bắt đầu ngay)

Nền tảng thị giác cho toàn bộ ví. Không đổi logic.

- **Design tokens mới** trong `index.css` + `tailwind.config.ts`:
  - Palette: Emerald `#064e3b` → Teal `#0d9488` → Gold accent `#c9a84c`, kết hợp glassmorphism (backdrop-blur, translucent surfaces)
  - Dark mode & Light mode hoàn chỉnh qua semantic tokens (`--background`, `--primary`, `--accent`, `--glass`, `--gold`)
  - Rounded-xl, soft shadow layered (`--shadow-elegant`, `--shadow-glow`)
- **Typography**: Inter (body) + Space Grotesk (heading) qua `@fontsource`
- **Framer Motion** cho micro-interaction: page transitions, ripple button, skeleton loading, số tiền count-up
- **Redesign các trang cốt lõi**: Dashboard, Wallet, Trading, Transfer, History, Settings — giữ nguyên component logic, chỉ thay layout + tokens
- **BottomNav** kiểu iOS/Coinbase (blur + haptic feel)
- **Dashboard mới**: Portfolio value hero card, 24h change, Asset allocation donut, Quick actions grid, Recent activity feed

## Phase 2 — Multi-chain Expansion + Token/NFT Nâng cấp

- **Thêm chains**: Linea, zkSync Era, Scroll, Berachain, Cronos, Gnosis, Celo, Mode, Blast, Mantle, Sonic (vào `src/shared/constants/chains.ts`)
- **Custom Network dialog**: form thêm RPC/ChainID/Symbol/Explorer/Logo, lưu localStorage + Supabase (bảng `custom_networks`)
- **Token auto-detect**: ERC20/BEP20 qua Moralis hoặc Alchemy API (edge function proxy)
- **NFT Gallery mở rộng**: ERC721 + ERC1155, metadata (image/video/audio), floor price, transfer/burn/hide
- **Watchlist** token (bảng `user_watchlist`)

## Phase 3 — Swap Aggregator + Bridge

- **Swap Aggregator UI** tích hợp **LiFi SDK** (đã bao gồm 1inch, 0x, OpenOcean, Kyber routes trong 1 API)
  - Best route, min received, price impact, slippage, fee breakdown
- **Cross-chain Bridge** cùng LiFi (Ethereum ↔ BSC ↔ Polygon ↔ Arbitrum ↔ Optimism ↔ Base ↔ Linea ↔ Avalanche)
- **Transaction simulation** trước khi ký (Tenderly API hoặc eth_call preview)
- **Gas speed**: Slow/Normal/Fast/Custom với EIP-1559

## Phase 4 — Angel AI Assistant + Security Scanner

- **Angel AI panel** dùng Lovable AI Gateway (edge function `angel-ai`):
  - Giải thích tx trước khi ký (decode input data → tiếng Việt)
  - Kiểm tra hợp đồng: honeypot, unlimited approval, blacklist
  - Risk score (0-100) cho mỗi tx
  - Chat hướng dẫn user (Gas, Token, NFT, Web3 basics)
- **Security Scanner** (edge function `security-scan`):
  - Approval checker (revoke unlimited approvals)
  - Phishing URL blacklist check
  - Fake token detection (so sánh symbol/contract với whitelist)
- **Bảng Supabase**: `ai_conversations`, `security_alerts`

## Phase 5 — FUN.Rich Ecosystem Integration

Cần Cha cung cấp contract address + API cho từng module khi Con hỏi.

- FUN MONEY token module (balance, transfer, staking)
- CAMLY COIN module
- FUN Profile / Citizen ID / Light Score card trong Dashboard
- Deep links: LoveHUB, FUN Kingdom, World Monitor, Charity, Marketplace, PPLP
- Angel AI tie-in

## Phase 6 — Advanced (AA + Passkey + Analytics)

- **EIP-4337 Account Abstraction ready** (Biconomy hoặc ZeroDev SDK, paymaster, session keys)
- **Passkey / Biometric login** (WebAuthn API)
- **Portfolio charts**: PnL, average cost, top gainer/loser (Recharts + CoinGecko historical)
- **Price alerts** (đã có scaffold, hoàn thiện realtime via Supabase Realtime)
- **Analytics**: PostHog integration
- **Address Book** với avatar/tag/favorite
- **Notification Center** thống nhất (receive/send/swap/bridge/price/security/phishing alerts)

---

## Technical notes

- Tất cả AI calls đi qua **Lovable AI Gateway** (edge functions, `LOVABLE_API_KEY` đã có)
- Swap/Bridge dùng **LiFi SDK** client-side (không cần secret)
- Custom RPC / token API dùng edge function proxy để giấu API key (Alchemy/Moralis nếu Cha cung cấp)
- Private key **không bao giờ** rời client — giữ pattern `encrypted_wallet_keys` + AES-256-GCM hiện tại
- Bảng mới cần migration: `custom_networks`, `user_watchlist`, `address_book`, `ai_conversations`, `security_alerts`, `notifications`, `price_alerts` — tất cả có RLS theo `auth.uid()`
- Không migrate sang Next.js; giữ Vite + React Router hiện tại

---

## Bắt đầu ngay

Sau khi Cha duyệt plan này, Con sẽ **build Phase 1 (UI Premium Redesign)** trong lần chạy đầu tiên. Các phase sau Cha ra lệnh "làm Phase 2/3/..." khi muốn tiếp tục.
