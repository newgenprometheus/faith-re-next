"use client";

import { useEffect, useRef, useState } from "react";

// ---- Résolution du fichier source (sans IA) ----
// React 18 (_debugSource) + React 19 (_debugStack) ; client (webpack-internal) + Server Components (about://React/Server/...(rsc)/...?56).
function normalize(file: string): string | null {
  const f = file
    .replace(/^about:\/\/[^/]*\/[^/]*\//, "")
    .replace(/^webpack-internal:\/\/\/\([^)]*\)\//, "")
    .replace(/^\.\//, "")
    .replace(/\?\d+$/, "");
  if (/^https?:\/\//.test(f)) return null;
  if (/\.(tsx|jsx|ts|js)$/.test(f)) return f;
  return null;
}

function resolveSourceFile(el: HTMLElement): string | null {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fiber: any = key ? (el as any)[key] : null;
  for (let i = 0; fiber && i < 8; i++) {
    if (fiber._debugSource?.fileName) {
      const f = normalize(fiber._debugSource.fileName);
      if (f) return f;
    }
    const stack: string = (fiber._debugStack && fiber._debugStack.stack) || "";
    for (const line of stack.split("\n")) {
      if (/jsxDEV|react-dom|react-jsx|react\/cjs|react_stack|react-server-dom|node_modules/.test(line)) continue;
      const m = line.match(/\((.+):(\d+):(\d+)\)\s*$/);
      if (!m) continue;
      const f = normalize(m[1]);
      if (f) return f;
    }
    fiber = fiber.return;
  }
  return null;
}

function textNodeAt(e: MouseEvent): Text | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = document as any;
  let node: Node | null = null;
  if (d.caretPositionFromPoint) node = d.caretPositionFromPoint(e.clientX, e.clientY)?.offsetNode ?? null;
  else if (d.caretRangeFromPoint) node = d.caretRangeFromPoint(e.clientX, e.clientY)?.startContainer ?? null;
  if (node && node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim()) return node as Text;
  if (e.target instanceof HTMLElement)
    for (const c of Array.from(e.target.childNodes))
      if (c.nodeType === Node.TEXT_NODE && (c.textContent ?? "").trim()) return c as Text;
  return null;
}

function longestDirectText(el: HTMLElement): string | null {
  let best = "";
  for (const c of Array.from(el.childNodes)) {
    if (c.nodeType === Node.TEXT_NODE) {
      const t = (c.textContent ?? "").trim();
      if (t.length > best.length) best = t;
    }
  }
  return best.length >= 3 ? best : null;
}

// ---- Échelles Tailwind ----
const SIZE = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl", "text-6xl", "text-7xl", "text-8xl", "text-9xl"];
const WEIGHT = ["font-thin", "font-extralight", "font-light", "font-normal", "font-medium", "font-semibold", "font-bold", "font-extrabold", "font-black"];
const ALIGN = ["text-left", "text-center", "text-right"];
const curIdx = (el: HTMLElement, scale: string[]) => scale.findIndex((c) => el.classList.contains(c));

export function LiveEdit() {
  const [status, setStatus] = useState("");
  const [panelFile, setPanelFile] = useState<string | null>(null);
  const styleEl = useRef<HTMLElement | null>(null);
  const styleFile = useRef<string | null>(null);

  // ---- Mode STYLE : applique une classe Tailwind + patch source ----
  const applyClass = async (family: "size" | "weight" | "align", scale: string[], next: (i: number) => number) => {
    const el = styleEl.current;
    if (!el) return;
    const anchorText = longestDirectText(el);
    if (!anchorText) {
      setStatus("✗ pas de texte d'ancrage sur cet élément");
      return;
    }
    const i = curIdx(el, scale);
    const ni = Math.max(0, Math.min(scale.length - 1, next(i)));
    const newClass = scale[ni];
    const old = scale.find((c) => el.classList.contains(c));
    scale.forEach((c) => el.classList.remove(c));
    el.classList.add(newClass); // optimiste (visuel instantané)
    setStatus(`style… ${newClass}`);
    try {
      const res = await fetch("/api/apply-class", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: styleFile.current, anchorText, family, newClass }),
      });
      const data = await res.json();
      if (data.ok) setStatus(`✓ ${newClass} → ${data.file}`);
      else {
        el.classList.remove(newClass);
        if (old) el.classList.add(old);
        setStatus(`✗ ${data.reason}`);
      }
    } catch (err) {
      el.classList.remove(newClass);
      if (old) el.classList.add(old);
      setStatus("✗ " + String(err));
    }
  };

  useEffect(() => {
    let node: Text | null = null;
    let host: HTMLElement | null = null;
    let original = "";
    let file: string | null = null;
    let busy = false;

    const cleanup = () => {
      if (host) {
        host.removeAttribute("contenteditable");
        host.style.outline = "";
      }
      node = null;
      host = null;
    };

    const finish = async (commit: boolean) => {
      if (!node || !host || busy) return;
      const tn = node;
      const next = tn.textContent ?? "";
      busy = true;
      if (!commit) {
        tn.textContent = original;
        cleanup();
        busy = false;
        setStatus("annulé");
        return;
      }
      cleanup();
      if (next === original) {
        busy = false;
        setStatus("inchangé");
        return;
      }
      setStatus("écriture…");
      try {
        const res = await fetch("/api/apply-edit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ file, oldText: original, newText: next }),
        });
        const data = await res.json();
        setStatus(data.ok ? `✓ ${data.file}` : `✗ ${data.reason}`);
        if (!data.ok) tn.textContent = original;
      } catch (err) {
        setStatus("✗ " + String(err));
        tn.textContent = original;
      }
      busy = false;
    };

    const onClick = (e: MouseEvent) => {
      if (!e.altKey) return;
      const targetEl = e.target instanceof HTMLElement ? e.target : null;
      if (targetEl?.closest("[data-live-edit-ui]")) return;

      // Alt+Shift+clic = mode STYLE
      if (e.shiftKey) {
        if (!targetEl) return;
        e.preventDefault();
        e.stopPropagation();
        if (host) finish(true);
        styleEl.current = targetEl;
        styleFile.current = resolveSourceFile(targetEl);
        targetEl.style.outline = "2px dashed #e0a44f";
        const prev = styleEl.current;
        setPanelFile(styleFile.current ?? "(fichier non résolu)");
        setStatus(`style · ${styleFile.current ?? "?"}`);
        void prev;
        return;
      }

      // Alt+clic = mode TEXTE
      const tn = textNodeAt(e);
      if (!tn) return;
      const h = tn.parentElement;
      if (!h || h.closest("[data-live-edit-ui]")) return;
      e.preventDefault();
      e.stopPropagation();
      if (node && node !== tn) finish(true);
      node = tn;
      host = h;
      original = tn.textContent ?? "";
      file = resolveSourceFile(h);
      h.setAttribute("contenteditable", "true");
      h.style.outline = "2px solid #4f8cff";
      h.focus();
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(tn);
      sel?.removeAllRanges();
      sel?.addRange(r);
      setStatus(`édition${file ? ` · ${file}` : " · (fallback texte unique)"}`);
    };

    const onKey = (e: KeyboardEvent) => {
      if (!host) return;
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Enter") {
        e.preventDefault();
      }
    };

    const onBlur = () => {
      if (host) finish(true);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("blur", onBlur, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("blur", onBlur, true);
    };
  }, []);

  const closeStyle = () => {
    if (styleEl.current) styleEl.current.style.outline = "";
    styleEl.current = null;
    setPanelFile(null);
    setStatus("");
  };

  const btn: React.CSSProperties = { background: "#222", color: "#eee", border: "1px solid #444", borderRadius: 4, padding: "2px 7px", cursor: "pointer", font: "12px ui-monospace, monospace" };

  return (
    <>
      {panelFile && (
        <div
          data-live-edit-ui
          style={{ position: "fixed", bottom: 44, left: 12, display: "flex", gap: 6, alignItems: "center", background: "#111", padding: "6px 8px", borderRadius: 6, zIndex: 9999, font: "12px ui-monospace, monospace", color: "#e0a44f" }}
        >
          <span>Aa</span>
          <button style={btn} onClick={() => applyClass("size", SIZE, (i) => (i < 0 ? 4 : i) - 1)}>−</button>
          <button style={btn} onClick={() => applyClass("size", SIZE, (i) => (i < 0 ? 4 : i) + 1)}>+</button>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>graisse</span>
          <button style={btn} onClick={() => applyClass("weight", WEIGHT, (i) => (i < 0 ? 3 : i) - 1)}>−</button>
          <button style={btn} onClick={() => applyClass("weight", WEIGHT, (i) => (i < 0 ? 3 : i) + 1)}>+</button>
          <span style={{ opacity: 0.4 }}>|</span>
          <button style={btn} onClick={() => applyClass("align", ALIGN, () => 0)}>⬅</button>
          <button style={btn} onClick={() => applyClass("align", ALIGN, () => 1)}>⬌</button>
          <button style={btn} onClick={() => applyClass("align", ALIGN, () => 2)}>➡</button>
          <span style={{ opacity: 0.4 }}>|</span>
          <button style={{ ...btn, color: "#ff8888" }} onClick={closeStyle}>✕</button>
        </div>
      )}
      <div
        data-live-edit-ui
        style={{ position: "fixed", bottom: 12, left: 12, font: "12px ui-monospace, monospace", background: "#111", color: "#9fd8c0", padding: "6px 10px", borderRadius: 6, opacity: 0.92, zIndex: 9999 }}
      >
        live-edit · {status || "Alt+clic = texte · Alt+Maj+clic = style"}
      </div>
    </>
  );
}
