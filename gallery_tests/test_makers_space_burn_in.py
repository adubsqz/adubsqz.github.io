"""Day-1 maker's space publishes must carry JPEG © burn-in (durable half of double watermark)."""

from __future__ import annotations

from pathlib import Path

from gallery.config import PUBLISH_STILL_LIFE_REL
from gallery.optimize_publish import _publish_options
from gallery.verify_manifest import _check_watermark_heuristic

# Keep in sync with src/makers-space-day1.ts DAY1_SEATS
DAY1_SEATS = (
    "color/driftwood-in-the-wash.jpg",
    "color/creeper-wall.jpg",
    "color/rain-puddle-ripples.jpg",
    "bw/000220500003-pier.jpg",
    "people/bench-dog-waterfront.jpg",
    "shooks_run/tudor.jpg",
    "shooks_run/drawn_tutor.jpg",
)


def test_day1_makers_space_seats_have_burn_in_watermark() -> None:
    repo = Path(__file__).resolve().parents[1]
    pub = repo / PUBLISH_STILL_LIFE_REL
    opts = _publish_options()
    missing: list[str] = []
    for rel in DAY1_SEATS:
        path = pub / rel
        assert path.is_file(), f"missing day-1 publish {rel}"
        err = _check_watermark_heuristic(path, opts)
        if err:
            missing.append(err)
    assert missing == [], "\n".join(missing)
