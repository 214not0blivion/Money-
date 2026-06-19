"""Command-line entry point for the Digital Product Factory."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from .config import Brief, PRODUCT_TYPES
from .pipeline import build_product


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader so ANTHROPIC_API_KEY is picked up without extra deps."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="factory",
        description="Generate a finished, sellable digital product from a brief.",
    )
    parser.add_argument("--config", help="Path to a YAML brief (see config.example.yaml).")
    parser.add_argument("--niche", help="Quick brief: the product niche.")
    parser.add_argument("--audience", default="", help="Who it's for.")
    parser.add_argument(
        "--type", dest="product_type", default="guide", choices=sorted(PRODUCT_TYPES),
        help="Product type (default: guide).",
    )
    parser.add_argument("--sections", type=int, default=8, help="Number of sections.")
    parser.add_argument("--price", type=float, default=19.0, help="Target price in USD.")
    parser.add_argument("--out", default="output", help="Output directory.")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Run the full pipeline with NO API calls and NO cost (placeholder text).",
    )
    args = parser.parse_args(argv)

    _load_dotenv(Path(".env"))

    if args.config:
        brief = Brief.from_yaml(args.config)
    elif args.niche:
        brief = Brief(
            niche=args.niche,
            audience=args.audience,
            product_type=args.product_type,
            sections=args.sections,
            target_price_usd=args.price,
        )
    else:
        parser.error("Provide either --config <file.yaml> or --niche \"...\".")

    if not args.dry_run and not os.environ.get("ANTHROPIC_API_KEY"):
        print(
            "No ANTHROPIC_API_KEY found. Either:\n"
            "  - copy .env.example to .env and add your key, or\n"
            "  - run with --dry-run to preview the pipeline for free.",
            file=sys.stderr,
        )
        return 2

    print("=" * 64)
    print("  Digital Product Factory")
    print("=" * 64)
    try:
        build_product(brief, dry_run=args.dry_run, out_root=Path(args.out))
    except Exception as exc:  # noqa: BLE001 — surface a clean message to the user
        print(f"\nError: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
