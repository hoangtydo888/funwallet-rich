import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DASHBOARD_TILES, TILE_STYLES, TILE_TOKENS } from "@/theme/tiles";

/**
 * Public diagnostics screen for Dashboard tile colors.
 * Shows, per tile: label, applied Tailwind class, CSS token, and the
 * browser-computed background color in both enabled and disabled state.
 */
const TileDiagnostics = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [computed, setComputed] = useState<Record<string, string>>({});
  const buildVersion =
    document.querySelector('meta[name="build-version"]')?.getAttribute("content") ?? "dev";

  useEffect(() => {
    const next: Record<string, string> = {};
    gridRef.current?.querySelectorAll<HTMLElement>("[data-tile-key]").forEach((el) => {
      next[el.dataset.tileKey!] = getComputedStyle(el).backgroundColor;
    });
    setComputed(next);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Chẩn đoán màu tile Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Đối chiếu màu thiết kế (Hình 1) với màu thực tế trình duyệt đang vẽ.
          </p>
          <p className="text-xs text-muted-foreground">
            Build: <span className="font-mono">{buildVersion}</span> ·{" "}
            <Link to="/theme-preview" className="underline">
              Theme preview
            </Link>{" "}
            ·{" "}
            <Link to="/dashboard" className="underline">
              Dashboard
            </Link>
          </p>
        </header>

        <div ref={gridRef} className="space-y-3">
          {DASHBOARD_TILES.map((tile, i) => {
            const cls = TILE_STYLES[tile.color];
            const enabledKey = `${i}-enabled`;
            const disabledKey = `${i}-disabled`;
            return (
              <div
                key={`${tile.label}-${i}`}
                className="rounded-2xl border border-border bg-card p-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]"
              >
                <div className="min-w-0 space-y-1">
                  <div className="font-semibold">{tile.label}</div>
                  <div className="text-xs font-mono break-all text-muted-foreground">{cls}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    --tile-{tile.color}: {TILE_TOKENS[tile.color]}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    enabled: {computed[enabledKey] ?? "…"} · disabled: {computed[disabledKey] ?? "…"}
                  </div>
                </div>

                <button
                  data-tile-key={enabledKey}
                  data-tile-color={tile.color}
                  data-tile-state="enabled"
                  className={`w-28 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${cls}`}
                >
                  <span className="w-8 h-8 rounded-xl bg-white/15" />
                  bật
                </button>

                <button
                  disabled
                  data-tile-key={disabledKey}
                  data-tile-color={tile.color}
                  data-tile-state="disabled"
                  className={`w-28 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium disabled:cursor-not-allowed ${cls}`}
                >
                  <span className="w-8 h-8 rounded-xl bg-white/15" />
                  mờ
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TileDiagnostics;
