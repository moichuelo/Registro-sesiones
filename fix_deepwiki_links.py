#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reescribe enlaces DeepWiki dentro de Markdown para que apunten a archivos .md
(enlaces relativos, sin '/' inicial). MkDocs se encargará de convertirlos a .html
según la configuración (use_directory_urls).

Uso:
  python fix_deepwiki_links.py                 # por defecto docs/mkdocs
  python fix_deepwiki_links.py docs/mkdocs
  python fix_deepwiki_links.py docs/mkdocs --verbose
  python fix_deepwiki_links.py docs/mkdocs --no-backup
  python fix_deepwiki_links.py docs/mkdocs --backup-dir .bk
"""

import os
import re
import sys
import shutil
from pathlib import Path

# ---------------- Flags / args ----------------
VERBOSE   = "--verbose"   in sys.argv
NO_BACKUP = "--no-backup" in sys.argv

def get_arg_value(flag: str, default=None):
    if flag in sys.argv:
        i = sys.argv.index(flag)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default

BACKUP_DIRNAME = get_arg_value("--backup-dir", ".deepwiki_backup")

def arg_path():
    for a in sys.argv[1:]:
        if not a.startswith("-"):
            return a
    return None

# ---------------- Utilidades ----------------
def slugify(s: str) -> str:
    """Normaliza el slug: minúsculas y guiones; conserva puntos para '6.2-...'."""
    s = s.lower()
    s = re.sub(r"[\s_]+", "-", s)
    s = s.replace("(", "-").replace(")", "-")
    s = re.sub(r"[^a-z0-9\-\.]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s

def normalize_subpath_to_anchor(subpath: str | None) -> str:
    """Convierte '/algo/otro' -> '#algo/otro'."""
    if not subpath:
        return ""
    t = subpath.lstrip("/")
    return "" if not t else "#" + t

def build_target_md(md_name: str, sub_anchor: str, tail_anchor: str, query: str) -> str:
    # enlaces a fuente .md; MkDocs reescribe a .html al servir/compilar
    return md_name + sub_anchor + tail_anchor + query

# ---------------- Mapas ----------------
SLUG_MAP = {
    "overview": "Overview.md",
    "getting-started": "Getting-Started.md",

    "architecture-overview": "Architecture-Overview.md",
    "system-components": "System-Components.md",
    "technology-stack": "Technology-Stack.md",
    "request-processing-pipeline": "Request-Processing-Pipeline.md",

    "application-bootstrap": "Application-Bootstrap.md",

    "routing-system": "Routing-System.md",
    "public-routes": "Public-Routes.md",
    "protected-routes": "Protected-Routes.md",
    "api-endpoints": "API-Endpoints.md",

    "authentication-and-authorization": "Authentication-&-Authorization.md",
    "user-registration-and-login": "User-Registration-&-Login.md",
    "jwt-token-management": "JWT-Token-Management.md",
    "verifytoken-middleware": "verifyToken-Middleware.md",
    "verifyadmin-middleware": "verifyAdmin-Middleware.md",

    "security-measures": "Security-Measures.md",

    "real-time-communication-system": "Real-time-Communication-System.md",
    "socket-io-server-setup": "Socket.IO-Server-Setup.md",
    "websocket-authentication": "WebSocket-Authentication.md",
    "room-management": "Room-Management.md",
    "message-handling": "Message-Handling.md",
    "websocket-events": "WebSocket-Events.md",

    "product-management": "Product-Management.md",

    "support-chat-system": "Support-Chat-System.md",
    "user-chat-interface": "User-Chat-Interface.md",
    "admin-chat-interface": "Admin-Chat-Interface.md",

    "pdf-generation": "PDF-Generation.md",
    "puppeteer-pdf-generation": "Puppeteer-PDF-Generation.md",
    "pdfkit-pdf-generation": "PDFKit-PDF-Generation.md",

    "internationalization-i18n": "Internationalization-(i18n).md",

    "view-layer-and-templates": "Template-Structure.md",  # landing
    "template-structure": "Template-Structure.md",
    "partial-components": "Partial-Components.md",
    "page-views": "Page-Views.md",

    "static-assets-and-styling": "Static-Assets-&-Styling.md",

    "database-schema": "Database-Schema.md",
    "usuarios-table": "usuarios-Table.md",
    "productos-table": "productos-Table.md",
    "mensajes-table": "mensajes-Table.md",

    "api-reference": "API-Reference.md",
    "http-endpoints": "HTTP-Endpoints.md",

    "deployment-and-configuration": "Deployment-&-Configuration.md",
    "readme": "README.md",
}

NUM_MAP = {
    1:  "Overview.md",
    2:  "Getting-Started.md",
    3:  "Architecture-Overview.md",
    4:  "Application-Bootstrap.md",
    5:  "Routing-System.md",
    6:  "Authentication-&-Authorization.md",
    7:  "Real-time-Communication-System.md",
    8:  "Product-Management.md",
    9:  "Support-Chat-System.md",
    10: "PDF-Generation.md",
    11: "Internationalization-(i18n).md",
    12: "Template-Structure.md",
    13: "Static-Assets-&-Styling.md",
    14: "Database-Schema.md",
    15: "API-Reference.md",
    16: "Deployment-&-Configuration.md",
}

IGNORE_NEXT = {"blob"}  # ignora /registro/blob/...

# ---------------- Matching genérico ----------------
# Acepta: 'https://.../moichuelo/registro/...' o '/moichuelo/registro/...' o 'moichuelo/registro/...'
CORE = r"(?:https?://[^\s)]+/|/)?moichuelo/registro/(?P<rest>[^)\s>]+)"

INLINE_RE = re.compile(r"\((" + CORE + r")\)", re.I)
REF_RE    = re.compile(r"^(\[[^\]]+\]:\s*)(" + CORE + r")\s*$", re.I | re.M)
AUTO_RE   = re.compile(r"<(" + CORE + r")>", re.I)
BARE_RE   = re.compile(r"(?<![<\(\[])(" + CORE + r")", re.I)

# Limpieza de enlaces internos absolutos `/Algo.md` o `/Algo.html`
INLINE_ABS = re.compile(r"\(/([A-Za-z0-9._&\-\(\)]+\.m(?:d|arkdown|kdn)|[A-Za-z0-9._&\-\(\)]+\.html)(#[^)]+)?(\?[^\)]*)?\)")
REF_ABS    = re.compile(r"^(\[[^\]]+\]:\s*)/([A-Za-z0-9._&\-\(\)]+\.(?:md|markdown|mkdn|html)(?:#[^\s]+)?(?:\?[^\s]+)?)\s*$", re.M)
AUTO_ABS   = re.compile(r"</([A-Za-z0-9._&\-\(\)]+\.(?:md|markdown|mkdn|html)[^>]*)>")
BARE_ABS   = re.compile(r"(?<!:)/([A-Za-z0-9._&\-\(\)]+\.(?:md|markdown|mkdn|html)(?:#[^\s\)>]+)?(?:\?[^\s\)>]+)?)")

# ---------------- Conversor principal ----------------
def convert_rest(rest: str) -> str | None:
    """Convierte 'rest' (después de /moichuelo/registro/) a 'Archivo.md[#anchor][?query]'."""
    # Separar query (?...) y anchor (#...) del final
    query = ""
    anchor_tail = ""
    base = rest

    m = re.search(r"\?[^#]+$", base)
    if m:
        query = m.group(0)
        base = base[:m.start()]

    m = re.search(r"\#[^/]+$", base)
    if m:
        anchor_tail = m.group(0)  # incluye '#'
        base = base[:m.start()]

    # Subruta (se convertirá a anchor)
    sub_anchor = ""
    if "/" in base:
        base_part, sub = base.split("/", 1)
        sub_anchor = normalize_subpath_to_anchor(sub)
    else:
        base_part = base

    base_part = base_part.strip("/")
    if not base_part:
        return None

    # Ignorar tokens problemáticos
    first_token = base_part.split("-", 1)[0].split(".", 1)[0].lower()
    if first_token in IGNORE_NEXT:
        return None

    # 1) Sólo número
    if re.fullmatch(r"\d+", base_part):
        n = int(base_part)
        md = NUM_MAP.get(n)
        return build_target_md(md, sub_anchor, anchor_tail, query) if md else None

    # 2) numseq + '-' + slug (ej: '6.2-jwt-token-management')
    m = re.fullmatch(r"(?P<numseq>\d+(?:\.\d+)*)-(?P<slug>.+)", base_part)
    if m:
        slug = slugify(m.group("slug"))
        if slug in ("internationalization-i18n", "internationalization-"):
            slug = "internationalization-i18n"
        md = SLUG_MAP.get(slug)
        return build_target_md(md, sub_anchor, anchor_tail, query) if md else None

    # 3) sólo slug
    slug = slugify(base_part)
    if slug in ("internationalization-i18n", "internationalization-"):
        slug = "internationalization-i18n"
    md = SLUG_MAP.get(slug)
    return build_target_md(md, sub_anchor, anchor_tail, query) if md else None

def replace_inline(m):
    rest = m.group("rest")
    tgt = convert_rest(rest)
    if VERBOSE and tgt: print(f"    - inline: {rest} -> {tgt}")
    return f"({tgt})" if tgt else m.group(0)

def replace_ref(m):
    prefix, rest = m.group(1), m.group("rest")
    tgt = convert_rest(rest)
    if VERBOSE and tgt: print(f"    - ref: {rest} -> {tgt}")
    return f"{prefix}{tgt}" if tgt else m.group(0)

def replace_auto(m):
    rest = m.group("rest")
    tgt = convert_rest(rest)
    if VERBOSE and tgt: print(f"    - autolink: {rest} -> {tgt}")
    return f"<{tgt}>" if tgt else m.group(0)

def replace_bare(m):
    rest = m.group("rest")
    tgt = convert_rest(rest)
    if VERBOSE and tgt: print(f"    - bare: {rest} -> {tgt}")
    return tgt if tgt else m.group(0)

def strip_leading_slash_for_internal_links(text: str) -> tuple[str, int]:
    """Elimina '/' inicial en enlaces internos a .md/.html (inline, ref, autolink, texto)."""
    changes = 0
    old = text; text = INLINE_ABS.sub(lambda mm: f"({mm.group(1)}{mm.group(2) or ''}{mm.group(3) or ''})", text); changes += len(list(INLINE_ABS.finditer(old)))
    old = text; text = REF_ABS.sub(r"\1\2", text);     changes += len(list(REF_ABS.finditer(old)))
    old = text; text = AUTO_ABS.sub(r"<\1>", text);    changes += len(list(AUTO_ABS.finditer(old)))
    old = text; text = BARE_ABS.sub(r"\1", text);      changes += len(list(BARE_ABS.finditer(old)))
    return text, changes

def rewrite(text: str) -> tuple[str, int]:
    changes = 0
    for regex, repl in [
        (INLINE_RE, replace_inline),
        (REF_RE,    replace_ref),
        (AUTO_RE,   replace_auto),
        (BARE_RE,   replace_bare),
    ]:
        before = text
        text = regex.sub(repl, text)
        if text != before:
            changes += len(list(regex.finditer(before)))
    text, ch2 = strip_leading_slash_for_internal_links(text)
    return text, changes + ch2

# ---------------- Main ----------------
def main():
    root = Path(arg_path()).resolve() if arg_path() else Path("docs/mkdocs").resolve()
    if not root.exists():
        print(f"✖ No existe la ruta: {root}")
        sys.exit(2)

    total_files = total_updated = total_changes = 0

    for dirpath, dirnames, filenames in os.walk(root, topdown=True):
        # No entrar en backups
        dirnames[:] = [d for d in dirnames if d != BACKUP_DIRNAME]

        for name in filenames:
            if not name.lower().endswith(".md"):
                continue
            total_files += 1
            p = Path(dirpath) / name
            s = p.read_text(encoding="utf-8", errors="ignore")
            if VERBOSE:
                print(f"[SCAN] {p.relative_to(root)}")
            new, ch = rewrite(s)
            if ch:
                if not NO_BACKUP:
                    b = Path(dirpath) / BACKUP_DIRNAME
                    b.mkdir(exist_ok=True)
                    shutil.copy2(p, b / p.name)
                p.write_text(new, encoding="utf-8")
                total_updated += 1
                total_changes += ch
                print(f"[UPDATED] {p.relative_to(root)} (+{ch} enlaces)")

    print("\n--- Reporte ---")
    print(f"Carpeta raíz: {root}")
    print(f"Markdown escaneados: {total_files}")
    print(f"Archivos modificados: {total_updated}")
    print(f"Enlaces reescritos:   {total_changes}")

if __name__ == "__main__":
    main()
