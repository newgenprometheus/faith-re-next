import { promises as fs } from "fs";
import path from "path";

// Patch une classe Tailwind sur l'élément ancré par son texte. Dev-only, sans IA.
// Robuste sur éléments à texte simple ; échec gracieux sur className dynamique (cn/clsx).
const FAMILIES: Record<string, RegExp> = {
  size: /\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/g,
  weight: /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g,
  align: /\btext-(left|center|right|justify)\b/g,
};

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ ok: false, reason: "disabled in production" }, { status: 403 });
  }
  let body: { file?: string; anchorText?: string; family?: string; newClass?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "invalid JSON" }, { status: 400 });
  }
  const { file, anchorText, family, newClass } = body;
  if (!file || !anchorText || !family || !FAMILIES[family]) {
    return Response.json({ ok: false, reason: "missing/invalid params" }, { status: 400 });
  }

  const projectRoot = path.resolve(process.cwd());
  const abs = path.resolve(projectRoot, file);
  if (!abs.startsWith(projectRoot) || !/\.(tsx|jsx|ts|js)$/.test(abs)) {
    return Response.json({ ok: false, reason: "invalid file" }, { status: 400 });
  }
  let content: string;
  try {
    content = await fs.readFile(abs, "utf8");
  } catch {
    return Response.json({ ok: false, reason: "file not found" }, { status: 404 });
  }

  // Ancre tolérante : 6 premiers mots, espaces souples (gère le wrap de lignes JSX).
  const words = anchorText.trim().split(/\s+/).slice(0, 6).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length < 2) return Response.json({ ok: false, reason: "ancre trop courte" }, { status: 409 });
  const re = new RegExp(words.join("\\s+"), "g");
  const all = [...content.matchAll(re)];
  if (all.length === 0) return Response.json({ ok: false, reason: "ancre introuvable" }, { status: 409 });
  if (all.length > 1) return Response.json({ ok: false, reason: "ancre ambiguë" }, { status: 409 });
  const idx = all[0].index ?? -1;
  if (idx < 0) return Response.json({ ok: false, reason: "ancre introuvable" }, { status: 409 });

  // Balise ouvrante qui contient directement le texte ancre.
  const gt = content.lastIndexOf(">", idx);
  const lt = gt >= 0 ? content.lastIndexOf("<", gt) : -1;
  if (lt < 0 || content[lt + 1] === "/") {
    return Response.json({ ok: false, reason: "balise ouvrante introuvable (markup imbriqué — phase 2.1)" }, { status: 409 });
  }
  const openTag = content.slice(lt, gt + 1);

  const cm = openTag.match(/className=("([^"]*)"|'([^']*)')/);
  if (!cm) {
    if (/className=\{/.test(openTag)) {
      return Response.json({ ok: false, reason: "className dynamique (cn/clsx) — édite en code" }, { status: 409 });
    }
    // Pas de className -> on en ajoute un
    const newTag = openTag.replace(/^(<[A-Za-z][\w.-]*)/, `$1 className="${newClass}"`);
    await fs.writeFile(abs, content.slice(0, lt) + newTag + content.slice(gt + 1), "utf8");
    return Response.json({ ok: true, file: path.relative(projectRoot, abs), className: newClass });
  }

  const quote = cm[1][0];
  const classes = cm[2] ?? cm[3] ?? "";
  let updated = classes.replace(FAMILIES[family], "").replace(/\s+/g, " ").trim();
  if (newClass) updated = (updated + " " + newClass).trim();
  const newTag = openTag.replace(cm[0], `className=${quote}${updated}${quote}`);
  await fs.writeFile(abs, content.slice(0, lt) + newTag + content.slice(gt + 1), "utf8");

  return Response.json({ ok: true, file: path.relative(projectRoot, abs), className: updated });
}
