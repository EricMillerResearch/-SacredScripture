from __future__ import annotations

import math

SCALE_MAJOR = [0, 2, 4, 5, 7, 9, 11]
SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10]


def gematria_value(word: str) -> int:
    base = sum(ord(c.lower()) - 96 for c in word if c.isalpha())
    growth = 0
    for i, c in enumerate(word):
        if not c.isalpha():
            continue
        growth += (i + 1) * (ord(c.lower()) - 96)
    return base + (growth % 64)


def word_to_frequency(word: str, base_hz: float = 220.0, span_hz: float = 660.0) -> float:
    val = gematria_value(word) % 256
    return base_hz + (val / 255.0) * span_hz


def verse_frequency_profile(verse_text: str) -> list[float]:
    words = [w.strip(".,;:!?()'\"").lower() for w in verse_text.split()]
    words = [w for w in words if w]
    if not words:
        return [440.0]
    return [word_to_frequency(w) for w in words]


def verse_key_frequency(verse_text: str) -> float:
    freqs = verse_frequency_profile(verse_text)
    freqs_sorted = sorted(freqs)
    mid = freqs_sorted[len(freqs_sorted) // 2]
    return mid


def verse_hue_shift(verse_text: str) -> float:
    freqs = verse_frequency_profile(verse_text)
    avg = sum(freqs) / max(1, len(freqs))
    # Map 220–880 Hz -> 0..1
    return max(0.0, min(1.0, (avg - 220.0) / 660.0))


def verse_scale(verse_text: str, sentiment: float) -> list[int]:
    # Use sentiment to pick major/minor; fall back to major
    return SCALE_MAJOR if sentiment >= 0 else SCALE_MINOR

