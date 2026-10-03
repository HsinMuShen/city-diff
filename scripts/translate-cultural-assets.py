#!/usr/bin/env python3
"""Add cached English display fields to the official Chinese monument snapshot.

Translations are stored separately so `fetch-cultural-assets.mjs` can reapply
them after a source refresh. The official Chinese values remain unchanged.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "public" / "data" / "taiwan-monuments.geojson"
META_PATH = PROJECT_ROOT / "public" / "data" / "taiwan-monuments.meta.json"
TRANSLATION_PATH = PROJECT_ROOT / "public" / "data" / "taiwan-monuments.en.json"
TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
CLASSIFICATIONS = {
    "國定古蹟": "National monument",
    "直轄市定古蹟": "Municipal monument",
    "縣(市)定古蹟": "County or city monument",
}


def translate_batch(values: list[str]) -> list[str]:
    if not values:
        return []
    joined = "\n".join(values)
    for attempt in range(4):
        try:
            response = requests.get(TRANSLATE_URL, params={"client": "gtx", "sl": "zh-TW", "tl": "en", "dt": "t", "q": joined}, timeout=60)
            response.raise_for_status()
            translated = "".join(part[0] for part in response.json()[0]).splitlines()
            if len(translated) == len(values):
                return [clean_translation(value) for value in translated]
        except (requests.RequestException, ValueError, TypeError):
            pass
        time.sleep(1.5 * (attempt + 1))
    if len(values) > 1:
        return [translate_batch([value])[0] for value in values]
    raise RuntimeError(f"Could not translate: {values[0]}")


def clean_translation(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    return value[:1].upper() + value[1:] if value else value


def translate_values(values: list[str], cached: dict[str, str]) -> dict[str, str]:
    missing = [value for value in sorted(set(values)) if value and not cached.get(value)]
    for index in range(0, len(missing), 18):
        batch = missing[index:index + 18]
        translated = translate_batch(batch)
        cached.update(zip(batch, translated))
        print(f"translated {min(index + len(batch), len(missing))}/{len(missing)}")
        time.sleep(.12)
    return cached


def main() -> None:
    collection = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    existing = json.loads(TRANSLATION_PATH.read_text(encoding="utf-8")) if TRANSLATION_PATH.exists() else {}
    name_cache = dict(existing.get("names", {}))
    district_cache = dict(existing.get("districts", {}))
    name_cache = translate_values([feature["properties"]["name"] for feature in collection["features"]], name_cache)
    district_cache = translate_values([feature["properties"]["district"] for feature in collection["features"]], district_cache)

    translations = {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "provider": "Google Translate",
        "sourceLanguage": "Traditional Chinese",
        "targetLanguage": "English",
        "notice": "Display translations are automated and are not official English monument names.",
        "names": name_cache,
        "districts": district_cache,
        "classifications": CLASSIFICATIONS,
    }
    TRANSLATION_PATH.write_text(json.dumps(translations, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for feature in collection["features"]:
        properties = feature["properties"]
        properties["name_en"] = name_cache.get(properties["name"], properties["name"])
        properties["classification_en"] = CLASSIFICATIONS.get(properties["classification"], properties["classification"])
        properties["district_en"] = district_cache.get(properties["district"], properties["district"])

    serialized = json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n"
    DATA_PATH.write_text(serialized, encoding="utf-8")
    metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
    metadata["sha256"] = hashlib.sha256(serialized.encode()).hexdigest()
    metadata["englishDisplayTranslation"] = {
        "provider": translations["provider"],
        "generatedAt": translations["generatedAt"],
        "notice": translations["notice"],
    }
    META_PATH.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote English display fields for {len(collection['features'])} monuments")


if __name__ == "__main__":
    main()
