"""Loading and validating a product brief."""

from __future__ import annotations

import dataclasses
from pathlib import Path

import yaml

PRODUCT_TYPES = {"guide", "prompt_pack", "template_bundle", "checklist_pack"}


@dataclasses.dataclass
class Brief:
    niche: str
    audience: str = ""
    product_type: str = "guide"
    tone: str = "practical, warm, no fluff"
    brand_name: str = "Your Brand"
    sections: int = 8
    target_price_usd: float = 19.0
    model: str = "claude-opus-4-8"
    effort: str = "high"

    def __post_init__(self) -> None:
        if not self.niche or not self.niche.strip():
            raise ValueError("Brief requires a non-empty 'niche'.")
        if self.product_type not in PRODUCT_TYPES:
            raise ValueError(
                f"product_type must be one of {sorted(PRODUCT_TYPES)}, "
                f"got {self.product_type!r}."
            )
        self.sections = max(1, min(int(self.sections), 30))

    @classmethod
    def from_yaml(cls, path: str | Path) -> "Brief":
        data = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
        known = {f.name for f in dataclasses.fields(cls)}
        return cls(**{k: v for k, v in data.items() if k in known})
