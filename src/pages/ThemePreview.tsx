import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sun, Moon, ArrowUpRight, ArrowDownLeft, ArrowDownUp, Layers, Plus, Users, Bell, Globe, Shield, Link2, QrCode, Coins, SendHorizontal, ClipboardList, CreditCard, GraduationCap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "@/contexts/ThemeContext";
import { TILE_TOKENS, TOKEN_SWATCHES, RAINBOW_COLORS, type TileColor } from "@/theme/tokens";
import hinh1 from "@/assets/hinh-1-reference.png.asset.json";

function hslToHex(hslStr: string): string {
  const [h, s, l] = hslStr.split(" ").map((v) => parseFloat(v));
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  const [hsl, setHsl] = useState("");
  useEffect(() => {
    const read = () => setHsl(getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim());
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => obs.disconnect();
  }, [cssVar]);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-16" style={{ background: hsl ? `hsl(${hsl})` : undefined }} />
      <div className="p-2 text-xs">
        <div className="font-mono font-semibold">{name}</div>
        <div className="text-muted-foreground font-mono truncate">{hsl}</div>
        <div className="text-muted-foreground font-mono">{hsl ? hslToHex(hsl) : "—"}</div>
      </div>
    </div>
  );
}

const TILE_LABELS: Record<TileColor, string> = {
  red: "Gửi", coral: "Gửi nhiều", orange: "Nhận", yellow: "Swap",
  green: "Stake", cyan: "Thêm/WC", purple: "Giá", magenta: "DApps",
  emerald: "Backup", violet: "QR", teal: "History", pink: "Learn", slate: "Refresh",
};

const TILE_ICONS: Record<TileColor, React.ReactNode> = {
  red: <ArrowUpRight />, coral: <Users />, orange: <ArrowDownLeft />, yellow: <ArrowDownUp />,
  green: <Layers />, cyan: <Plus />, purple: <Bell />, magenta: <Globe />,
  emerald: <Shield />, violet: <QrCode />, teal: <ClipboardList />, pink: <GraduationCap />, slate: <RefreshCw />,
};

const TILE_FG: Record<TileColor, string> = {
  red: "text-white", coral: "text-white", orange: "text-white", yellow: "text-black",
  green: "text-black", cyan: "text-white", purple: "text-white", magenta: "text-white",
  emerald: "text-white", violet: "text-white", teal: "text-white", pink: "text-white", slate: "text-foreground",
};

export default function ThemePreview() {
  const { mode, toggleMode } = useTheme();
  const [overlay, setOverlay] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="font-heading text-xl font-bold">Theme Preview</h1>
              <p className="text-xs text-muted-foreground">Đối chiếu với Hình 1 — hệ màu đã khóa</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={toggleMode} className="gap-2">
            {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {mode === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Section A — Tokens */}
        <section>
          <h2 className="font-heading text-2xl font-bold mb-4">A. Token màu chuẩn</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {TOKEN_SWATCHES.map((t) => (
              <Swatch key={t} name={t} cssVar={`--${t.replace(/([A-Z])/g, "-$1").toLowerCase()}`} />
            ))}
          </div>

          <h3 className="font-heading text-lg font-semibold mt-6 mb-3">Tile palette (Dashboard)</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {(Object.keys(TILE_TOKENS) as TileColor[]).map((k) => (
              <div key={k} className={`rounded-2xl p-4 h-24 flex flex-col items-center justify-center gap-1 bg-tile-${k} ${TILE_FG[k]} shadow-elegant`}>
                <div className="[&_svg]:h-5 [&_svg]:w-5">{TILE_ICONS[k]}</div>
                <div className="text-xs font-semibold">{TILE_LABELS[k]}</div>
                <div className="text-[10px] opacity-70 font-mono">{k}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            {Object.entries(RAINBOW_COLORS).map(([name, hex]) => (
              <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card text-xs font-mono">
                <span className="w-4 h-4 rounded-full" style={{ background: hex }} />
                {name} · {hex}
              </div>
            ))}
          </div>
        </section>

        {/* Section B — Typography */}
        <section>
          <h2 className="font-heading text-2xl font-bold mb-4">B. Typography</h2>
          <Card className="p-6 space-y-2">
            <h1 className="font-heading text-5xl font-bold">Heading 1 — Space Grotesk</h1>
            <h2 className="font-heading text-3xl font-bold">Heading 2</h2>
            <h3 className="font-heading text-xl font-semibold">Heading 3</h3>
            <p className="text-base">Body — Inter. Con dùng font này cho toàn bộ nội dung.</p>
            <p className="text-sm text-muted-foreground">Muted foreground — mô tả phụ.</p>
            <p className="text-3xl font-bold" style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Gradient primary → secondary
            </p>
          </Card>
        </section>

        {/* Section C — Components */}
        <section>
          <h2 className="font-heading text-2xl font-bold mb-4">C. Components</h2>
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Badge</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
            <Input placeholder="Input field" />
          </Card>
        </section>

        {/* Section D — Side-by-side with Hình 1 */}
        <section>
          <h2 className="font-heading text-2xl font-bold mb-2">D. So sánh với Hình 1</h2>
          <p className="text-sm text-muted-foreground mb-4">Kéo slider để overlay: 0 = chỉ UI thật, 100 = chỉ Hình 1.</p>
          <div className="mb-4 max-w-sm">
            <Slider value={[overlay]} onValueChange={(v) => setOverlay(v[0])} max={100} step={1} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-2 overflow-hidden">
              <div className="text-xs font-semibold mb-2 px-2 pt-1">Hình 1 (reference)</div>
              <img src={hinh1.url} alt="Hình 1 reference" className="w-full rounded-lg" />
            </Card>

            <Card className="p-2 overflow-hidden relative">
              <div className="text-xs font-semibold mb-2 px-2 pt-1">Dashboard tiles hiện tại</div>
              <div className="grid grid-cols-6 gap-2 p-2">
                {(["red","coral","orange","yellow","green","cyan","purple","magenta","emerald","cyan","violet","slate","yellow","orange","teal","green","pink"] as TileColor[]).slice(0, 18).map((k, i) => (
                  <div key={i} className={`rounded-xl p-3 h-20 flex flex-col items-center justify-center gap-1 bg-tile-${k} ${TILE_FG[k]}`}>
                    <div className="[&_svg]:h-4 [&_svg]:w-4">{TILE_ICONS[k]}</div>
                    <div className="text-[10px] font-semibold">{TILE_LABELS[k]}</div>
                  </div>
                ))}
              </div>
              {overlay > 0 && (
                <img
                  src={hinh1.url}
                  alt="overlay"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-lg"
                  style={{ opacity: overlay / 100 }}
                />
              )}
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
