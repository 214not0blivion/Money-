"""Thin wrapper around the Anthropic API with a free, offline dry-run mode.

The factory makes one call per stage. Streaming is used so that long outputs
(full chapters) don't hit the SDK's non-streaming timeout. Refusals are
surfaced as exceptions rather than silently returning empty content.
"""

from __future__ import annotations

import dataclasses

try:
    import anthropic
except ImportError:  # the package is optional in --dry-run mode
    anthropic = None


@dataclasses.dataclass
class LLMConfig:
    model: str = "claude-opus-4-8"
    effort: str = "high"
    dry_run: bool = False


class RefusalError(RuntimeError):
    """Raised when the model declines a request (stop_reason == 'refusal')."""


class LLM:
    def __init__(self, config: LLMConfig):
        self.config = config
        self._client = None
        if not config.dry_run:
            if anthropic is None:
                raise RuntimeError(
                    "The 'anthropic' package is not installed. Run "
                    "`pip install -r requirements.txt`, or use --dry-run."
                )
            # Reads ANTHROPIC_API_KEY from the environment (or a loaded .env).
            self._client = anthropic.Anthropic()

    def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 4000,
        stub: str | None = None,
    ) -> str:
        """Return model text for `prompt`.

        In dry-run mode, returns `stub` (or a generic placeholder) without any
        network call — so the whole pipeline can be exercised for free.
        """
        if self.config.dry_run:
            return (stub or f"[DRY RUN OUTPUT]\n\n{prompt[:300]}").strip()

        kwargs = {
            "model": self.config.model,
            "max_tokens": max_tokens,
            "thinking": {"type": "adaptive"},
            "output_config": {"effort": self.config.effort},
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system

        with self._client.messages.stream(**kwargs) as stream:
            message = stream.get_final_message()

        if message.stop_reason == "refusal":
            detail = getattr(message, "stop_details", None)
            category = getattr(detail, "category", None) if detail else None
            raise RefusalError(
                "The model declined this request"
                + (f" (category: {category})" if category else "")
                + ". Try a different niche or rephrase the brief."
            )

        return "".join(
            b.text for b in message.content if b.type == "text"
        ).strip()
