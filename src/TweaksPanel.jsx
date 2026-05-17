import React from 'react';

const STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:260px;
    display:flex;flex-direction:column;
    background:rgba(22,22,24,.92);color:oklch(0.92 0 0);
    -webkit-backdrop-filter:blur(24px) saturate(120%);backdrop-filter:blur(24px) saturate(120%);
    border:0.5px solid rgba(255,255,255,.12);border-radius:14px;
    box-shadow:0 12px 40px rgba(0,0,0,.5);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none;
    border-bottom:0.5px solid rgba(255,255,255,.08)}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em;color:oklch(0.92 0 0)}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(255,255,255,.4);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:22px;
    display:grid;place-items:center}
  .twk-x:hover{background:rgba(255,255,255,.08);color:oklch(0.92 0 0)}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent}
  .twk-body::-webkit-scrollbar{width:6px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(255,255,255,.5)}
  .twk-lbl>span:first-child{font-weight:500;color:oklch(0.75 0 0)}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(255,255,255,.3);padding:10px 0 0}
  .twk-sect:first-child{padding-top:4px}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(255,255,255,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.15);box-shadow:0 1px 2px rgba(0,0,0,.3);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:rgba(255,255,255,.7);font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:pointer;padding:4px 6px;line-height:1.2}
  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(255,255,255,.12);transition:background .15s;cursor:pointer;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.35);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}
`;

export function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues(prev => ({ ...prev, ...edits }));
  }, []);
  return [values, setTweak];
}

export function TweaksPanel({ title = 'Tweaks', open, onClose, children }) {
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({ x: 16, y: 16 });

  const clamp = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const PAD = 16;
    const maxRight  = Math.max(PAD, window.innerWidth  - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight,  Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right  = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [open, clamp]);

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const startRight  = window.innerWidth  - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const sx = e.clientX, sy = e.clientY;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight  - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clamp();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <>
      <style>{STYLE}</style>
      <div ref={dragRef} className="twk-panel" style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="twk-body">{children}</div>
      </div>
    </>
  );
}

export function TweakSection({ label }) {
  return <div className="twk-sect">{label}</div>;
}

export function TweakRadio({ label, value, options, onChange }) {
  const opts = options.map(o => typeof o === 'object' ? o : { value: o, label: o });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const trackRef = React.useRef(null);

  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e) => {
    const v0 = segAt(e.clientX);
    if (v0 !== value) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== value) onChange(v);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown} className="twk-seg">
        <div className="twk-seg-thumb"
          style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`, width: `calc((100% - 4px) / ${n})` }} />
        {opts.map(o => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
            style={{ color: o.value === value ? '#fff' : undefined }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
