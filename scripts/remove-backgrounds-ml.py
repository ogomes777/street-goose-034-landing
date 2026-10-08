"""Street Goose 034 — remoção de fundo por IA (rembg) para as fotos que o
flood-fill de scripts/remove-backgrounds.mjs não resolve: sombra/reflexo
embaixo do produto, armação branca sobre fundo branco, foto com fundo não
uniforme. Sempre lê o ORIGINAL em assets/<pasta>/ e grava o PNG transparente
em assets/products-processed/<pasta>/<mesmo nome>.png — o catálogo
(js/catalog.js) usa o processado automaticamente quando ele existe. Nunca
altera o original.

Uso (Python 3.10+, `pip install "rembg[cpu]"`):
  python scripts/remove-backgrounds-ml.py --model birefnet-general \
      products-lupas:21-45 products-outros:4,5 products-moletons:all
Índices são 1-based na ordem alfabética dos arquivos da pasta (a mesma
ordem que o catálogo usa para numerar as peças).
"""
import argparse
import io
import pathlib
import sys

from PIL import Image
from rembg import new_session, remove

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def parse_target(spec: str):
    folder, _, sel = spec.partition(":")
    files = sorted(p for p in (ASSETS / folder).iterdir() if p.suffix.lower() in EXTS)
    if not sel or sel == "all":
        return folder, files
    picked = set()
    for part in sel.split(","):
        if "-" in part:
            a, b = part.split("-")
            picked.update(range(int(a), int(b) + 1))
        else:
            picked.add(int(part))
    return folder, [f for i, f in enumerate(files, 1) if i in picked]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="+", help="pasta:índices (ex: products-lupas:21-45)")
    ap.add_argument("--model", default="birefnet-general")
    ap.add_argument("--out", default=str(ASSETS / "products-processed"), help="raiz de saída")
    ap.add_argument("--matting", action="store_true",
                    help="refino de borda via pymatting (bem mais lento em CPU; o BiRefNet já entrega alpha suave)")
    args = ap.parse_args()

    session = new_session(args.model)
    out_root = pathlib.Path(args.out)
    for spec in args.targets:
        folder, files = parse_target(spec)
        (out_root / folder).mkdir(parents=True, exist_ok=True)
        for src in files:
            img = Image.open(src).convert("RGBA")
            # alpha matting (opcional) refina borda fina — haste de óculos,
            # cordão, tampa de perfume — ao custo de ~1 min/imagem em CPU
            cut = remove(img, session=session, alpha_matting=args.matting,
                         alpha_matting_foreground_threshold=240,
                         alpha_matting_background_threshold=12,
                         alpha_matting_erode_size=6)
            dst = out_root / folder / (src.stem + ".png")
            buf = io.BytesIO()
            cut.save(buf, "PNG", optimize=True)
            dst.write_bytes(buf.getvalue())
            print(f"ok  {folder}/{src.name} -> {dst.relative_to(out_root)}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
