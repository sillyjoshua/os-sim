import type { WindowsThemeId } from "@/lib/windows-themes";
import { WINDOWS_THEMES } from "@/lib/windows-themes";
import type { FsNode } from "@/lib/fs-types";
import { createNode, getNode, listChildren, updateNode } from "@/lib/local-fs";

export type OssRunResult = {
  output: string[];
  errors: string[];
};

export function runOssScript(
  source: string,
  opts: {
    startFolderId: number | null;
    onTheme?: (id: WindowsThemeId) => void;
  },
): OssRunResult {
  const output: string[] = [];
  const errors: string[] = [];
  const vars = new Map<string, string>();

  let cwd: number | null = opts.startFolderId;

  const lines = source.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const lineNo = i + 1;

    const line = stripComments(raw).trim();
    if (!line) continue;

    try {
      const tokens = tokenize(line).map((t) => substituteVars(t, vars));
      if (tokens.length === 0) continue;

      const cmd = tokens[0].toLowerCase();

      if (cmd === "print") {
        output.push(tokens.slice(1).join(" "));
        continue;
      }

      if (cmd === "let") {
        // let name = "Ada"
        const eqIdx = tokens.indexOf("=");
        if (tokens.length < 4 || eqIdx !== 2) {
          throw new Error('Usage: let name = "value"');
        }
        const name = tokens[1];
        const value = tokens.slice(3).join(" ");
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
          throw new Error("Invalid variable name");
        }
        vars.set(name, value);
        continue;
      }

      if (cmd === "ls") {
        const children = listChildren(cwd);
        if (children.length === 0) {
          output.push("(empty)");
        } else {
          for (const n of children) {
            output.push(`${n.type === "folder" ? "[DIR]" : "[FILE]"} ${n.name}`);
          }
        }
        continue;
      }

      if (cmd === "cd") {
        if (tokens.length !== 2) throw new Error('Usage: cd "Folder" | cd ".."');
        const target = tokens[1];

        if (target === "..") {
          if (cwd === null) {
            cwd = null;
          } else {
            const cur = getNode(cwd);
            cwd = cur?.parentId ?? null;
          }
          continue;
        }

        const children = listChildren(cwd);
        const match = children.find(
          (n) => n.type === "folder" && n.name.toLowerCase() === target.toLowerCase(),
        );
        if (!match) throw new Error(`Folder not found: ${target}`);
        cwd = match.id;
        continue;
      }

      if (cmd === "mkdir") {
        if (tokens.length !== 2) throw new Error('Usage: mkdir "Folder"');
        const name = tokens[1];

        const children = listChildren(cwd);
        const existing = children.find(
          (n) => n.type === "folder" && n.name.toLowerCase() === name.toLowerCase(),
        );

        if (!existing) {
          createNode({ parentId: cwd, type: "folder", name });
          output.push(`Created folder: ${name}`);
        } else {
          output.push(`Folder exists: ${existing.name}`);
        }
        continue;
      }

      if (cmd === "write" || cmd === "append") {
        if (tokens.length < 3) throw new Error(`Usage: ${cmd} "file.txt" "content"`);
        const filename = tokens[1];
        const text = tokens.slice(2).join(" ");

        const children = listChildren(cwd);
        const existing = children.find(
          (n) => n.type === "file" && n.name.toLowerCase() === filename.toLowerCase(),
        );

        if (!existing) {
          createNode({ parentId: cwd, type: "file", name: filename, content: text });
          output.push(`Wrote file: ${filename}`);
        } else {
          const prev = existing.content ?? "";
          const next = cmd === "append" ? prev + text : text;
          updateNode(existing.id, { content: next });
          output.push(`${cmd === "append" ? "Appended" : "Overwrote"}: ${existing.name}`);
        }
        continue;
      }

      if (cmd === "theme") {
        if (tokens.length !== 2) throw new Error("Usage: theme win95|winxp|win7|win10|win11");
        const id = tokens[1] as WindowsThemeId;
        const ok = Object.prototype.hasOwnProperty.call(WINDOWS_THEMES, id);
        if (!ok) throw new Error(`Unknown theme: ${tokens[1]}`);
        opts.onTheme?.(id);
        output.push(`Theme set: ${WINDOWS_THEMES[id as keyof typeof WINDOWS_THEMES].label}`);
        continue;
      }

      throw new Error(`Unknown command: ${tokens[0]}`);
    } catch (e) {
      errors.push(`Line ${lineNo}: ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  return { output, errors };
}

function substituteVars(input: string, vars: Map<string, string>) {
  return input.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, name: string) => {
    return vars.get(name) ?? "";
  });
}

function stripComments(line: string) {
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== "\\") inQuotes = !inQuotes;
    if (!inQuotes && ch === "#") return line.slice(0, i);
  }
  return line;
}

function tokenize(line: string) {
  const tokens: string[] = [];
  let i = 0;

  while (i < line.length) {
    while (i < line.length && /\s/.test(line[i]!)) i += 1;
    if (i >= line.length) break;

    if (line[i] === '"') {
      const { value, nextIndex } = readQuoted(line, i);
      tokens.push(value);
      i = nextIndex;
      continue;
    }

    // unquoted token
    let j = i;
    while (j < line.length && !/\s/.test(line[j]!)) j += 1;
    tokens.push(line.slice(i, j));
    i = j;
  }

  return tokens;
}

function readQuoted(line: string, startIdx: number) {
  // line[startIdx] is a double quote
  let i = startIdx + 1;
  let out = "";

  while (i < line.length) {
    const ch = line[i]!;
    if (ch === '"') {
      return { value: unescapeString(out), nextIndex: i + 1 };
    }
    if (ch === "\\") {
      const next = line[i + 1];
      if (next === undefined) {
        out += "\\";
        i += 1;
      } else {
        out += `\\${next}`;
        i += 2;
      }
      continue;
    }
    out += ch;
    i += 1;
  }

  throw new Error("Unterminated string");
}

function unescapeString(s: string) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

export function isOssFile(node: FsNode) {
  return node.type === "file" && node.name.toLowerCase().endsWith(".oss");
}
