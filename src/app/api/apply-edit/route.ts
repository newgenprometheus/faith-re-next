import { promises as fs } from "fs";
import path from "path";

// Bridge live-edit -> code. AUCUNE IA, AUCUN réseau externe. Dev-only.
// Si `file` est résolu (via _debugStack/_debugSource), patch scopé à ce fichier.
// Sinon : recherche unique dans app/ ou src/app/ (fallback).

const EXT = /\.(tsx|jsx|ts|js)$/;

async function listSourceFiles(dir: string): Promise<string[]> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listSourceFiles(full)));
    else if (EXT.test(e.name)) out.push(full);
  }
  return out;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ ok: false, reason: "disabled in production" }, { status: 403 });
  }

  let body: { file?: string | null; oldText?: string; newText?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "invalid JSON" }, { status: 400 });
  }

  const oldText = (body.oldText ?? "").trim();
  const newText = body.newText ?? "";
  if (!oldText) return Response.json({ ok: false, reason: "oldText required" }, { status: 400 });
  if (oldText === newText) return Response.json({ ok: true, unchanged: true });

  const projectRoot = path.resolve(process.cwd());

  let candidates: string[];
  if (body.file) {
    const abs = path.resolve(projectRoot, body.file);
    if (!abs.startsWith(projectRoot) || !EXT.test(abs)) {
      return Response.json({ ok: false, reason: "invalid file" }, { status: 400 });
    }
    candidates = [abs];
  } else {
    candidates = [
      ...(await listSourceFiles(path.join(projectRoot, "app"))),
      ...(await listSourceFiles(path.join(projectRoot, "src", "app"))),
    ];
  }

  const matches: { file: string; count: number }[] = [];
  for (const f of candidates) {
    let content: string;
    try {
      content = await fs.readFile(f, "utf8");
    } catch {
      continue;
    }
    const count = content.split(oldText).length - 1;
    if (count > 0) matches.push({ file: f, count });
  }

  const total = matches.reduce((a, m) => a + m.count, 0);
  if (total === 0) return Response.json({ ok: false, reason: "text not found" }, { status: 409 });
  if (total > 1) {
    return Response.json(
      { ok: false, reason: `ambiguous: ${total} occurrences`, files: matches.map((m) => path.relative(projectRoot, m.file)) },
      { status: 409 },
    );
  }

  const { file } = matches[0];
  const content = await fs.readFile(file, "utf8");
  await fs.writeFile(file, content.replace(oldText, newText), "utf8");

  return Response.json({ ok: true, file: path.relative(projectRoot, file), scoped: !!body.file, oldText, newText });
}
