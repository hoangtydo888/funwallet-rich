import { useState } from "react";

export const SLIPPAGES = [0.1, 0.5, 1, 2];
const MIN = 0.01, MAX = 20;

/** Preset slippage buttons plus a custom percentage, like Binance's "Tùy chỉnh". */
export const SlippagePicker = ({ value, onChange, accent = "yellow" }: { value: number; onChange: (v: number) => void; accent?: "yellow" | "neutral" }) => {
  const custom = !SLIPPAGES.includes(value);
  const [text, setText] = useState(custom ? String(value) : "");
  const active = accent === "yellow" ? "border-yellow-500 bg-yellow-400/20 font-semibold" : "border-foreground font-semibold";
  const commit = (raw: string) => {
    setText(raw);
    const v = Math.round(Number(raw.replace(",", ".")) * 100) / 100;
    if (Number.isFinite(v) && v >= MIN && v <= MAX) onChange(v);
  };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap justify-end gap-1">
        {SLIPPAGES.map(v => (
          <button key={v} type="button" onClick={() => { onChange(v); setText(""); }}
            className={`px-1.5 py-0.5 rounded border text-xs ${value === v ? active : "border-border"}`}>{v}%</button>
        ))}
        <label className={`flex items-center rounded border px-1.5 text-xs ${custom ? active : "border-border"}`}>
          <input inputMode="decimal" placeholder="Tùy chỉnh" value={text} onChange={e => commit(e.target.value)} aria-label="Trượt giá tùy chỉnh (%)"
            className="w-[4.5rem] bg-transparent py-0.5 text-right outline-none placeholder:text-muted-foreground" />%
        </label>
      </div>
      {text && !(Number(text.replace(",", ".")) >= MIN && Number(text.replace(",", ".")) <= MAX) && <p className="text-xs text-destructive text-right">Nhập từ {MIN}% đến {MAX}%</p>}
      {value > 5 && <p className="text-xs text-amber-600 text-right">Trượt giá cao: bạn có thể nhận ít hơn đáng kể</p>}
      {value < 0.5 && <p className="text-xs text-muted-foreground text-right">Trượt giá thấp: nếu giá nhích, lệnh tự hủy (chỉ mất phí gas vài xu)</p>}
    </div>
  );
};
