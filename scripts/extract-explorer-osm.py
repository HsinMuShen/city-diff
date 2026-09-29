#!/usr/bin/env python3
"""Create compact Explorer GeoJSON snapshots from a Geofabrik Taiwan OSM extract."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import osmium


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://download.geofabrik.de/asia/taiwan.html"
WALK_CLASSES = {
    "primary", "secondary", "tertiary", "residential", "unclassified", "living_street",
    "pedestrian", "service", "footway", "path", "steps", "track",
}
ROAD_CLASSES = {
    "primary", "secondary", "tertiary", "residential", "unclassified", "living_street", "pedestrian",
}
CLASS_LABELS = {
    "primary": "主要道路", "secondary": "次要道路", "tertiary": "地區道路", "residential": "住宅道路",
    "unclassified": "一般道路", "living_street": "生活街道", "pedestrian": "行人街道", "service": "服務道路",
    "footway": "步道", "path": "通路", "steps": "階梯", "track": "產業道路",
}
CITIES = {
    "new-taipei": {"studyArea": "板橋舊城與府中核心", "bbox": [121.444, 24.997, 121.476, 25.026]},
    "taoyuan": {"studyArea": "桃園舊城與車站核心", "bbox": [121.294, 24.981, 121.329, 25.011]},
    "hsinchu": {"studyArea": "竹塹舊城核心", "bbox": [120.952, 24.792, 120.984, 24.818]},
    "chiayi": {"studyArea": "嘉義舊城與車站核心", "bbox": [120.432, 23.465, 120.466, 23.494]},
    "keelung": {"studyArea": "港區與市中心核心", "bbox": [121.724, 25.116, 121.758, 25.145]},
}


def intersects(coords: list[list[float]], bbox: list[float]) -> bool:
    west, south, east, north = bbox
    return any(west <= lon <= east and south <= lat <= north for lon, lat in coords)


class HighwayHandler(osmium.SimpleHandler):
    def __init__(self, cities: dict[str, dict]):
        super().__init__()
        self.cities = cities
        self.features = {city_id: {"roads": [], "walk": []} for city_id in cities}

    def way(self, way):
        highway = way.tags.get("highway")
        if highway not in WALK_CLASSES or way.tags.get("access") == "private":
            return
        try:
            coords = [[node.lon, node.lat] for node in way.nodes]
        except osmium.InvalidLocationError:
            return
        if len(coords) < 2:
            return

        for city_id, config in self.cities.items():
            if not intersects(coords, config["bbox"]):
                continue
            tags = way.tags
            name = tags.get("name") or tags.get("name:zh")
            properties = {
                "osm_id": way.id,
                "name": name or f"{CLASS_LABELS.get(highway, '無名通路')} #{way.id}",
                "name_en": tags.get("name:en"),
                "highway": highway,
                "lanes": tags.get("lanes"),
                "oneway": tags.get("oneway"),
                "surface": tags.get("surface"),
                "source": "OpenStreetMap",
            }
            feature = {
                "type": "Feature",
                "id": way.id,
                "properties": properties,
                "geometry": {"type": "LineString", "coordinates": coords},
            }
            self.features[city_id]["walk"].append(feature)
            if highway in ROAD_CLASSES and name:
                self.features[city_id]["roads"].append(feature)


def write_collection(city_id: str, kind: str, features: list[dict], config: dict, timestamp: str | None, source_file: str):
    suffix = "roads" if kind == "roads" else "walk-network"
    collection = {
        "type": "FeatureCollection",
        "name": f"{city_id} historic core {'named roads' if kind == 'roads' else 'walk network'}",
        "features": features,
    }
    serialized = json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n"
    output_path = PROJECT_ROOT / "public" / "data" / f"{city_id}-{suffix}.geojson"
    output_path.write_text(serialized, encoding="utf-8")

    accepted = sorted(ROAD_CLASSES if kind == "roads" else WALK_CLASSES)
    limitations = [
        "OpenStreetMap is contributor-maintained and may be incomplete.",
        "Ways are road centreline segments, not legal road boundaries or proof of public access.",
        "The snapshot covers the named study area, not the entire modern municipality.",
    ]
    if kind == "walk":
        limitations.insert(1, "Unnamed ways receive a generated display label containing their OSM way ID; the label is not a street name.")
    metadata = {
        "cityId": city_id,
        "studyArea": config["studyArea"],
        "title": f"{config['studyArea']}{'具名道路中心線' if kind == 'roads' else ' OSM 步行路網分析快照'}",
        "source": "OpenStreetMap contributors via Geofabrik Taiwan extract",
        "sourceUrl": SOURCE_URL,
        "endpoint": source_file,
        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "osmDataTimestamp": timestamp,
        "license": "Open Database License (ODbL)",
        "bbox": [config["bbox"][1], config["bbox"][0], config["bbox"][3], config["bbox"][2]],
        "filters": {
            "requiredTags": ["highway"] + (["name"] if kind == "roads" else []),
            "excludedAccess": ["private"],
            "acceptedHighwayClasses": accepted,
        },
        "featureCount": len(features),
        "sha256": hashlib.sha256(serialized.encode()).hexdigest(),
        "limitations": limitations,
    }
    metadata_path = PROJECT_ROOT / "public" / "data" / f"{city_id}-{suffix}.meta.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{city_id}: wrote {len(features)} {suffix} features")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pbf", type=Path, help="Path to a Taiwan .osm.pbf extract")
    parser.add_argument("cities", nargs="*", metavar="CITY")
    args = parser.parse_args()
    city_ids = args.cities or list(CITIES.keys())
    unknown = [city_id for city_id in city_ids if city_id not in CITIES]
    if unknown:
        parser.error(f"unknown cities: {', '.join(unknown)}")
    selected = {city_id: CITIES[city_id] for city_id in city_ids}

    reader = osmium.io.Reader(str(args.pbf))
    timestamp = reader.header().get("osmosis_replication_timestamp")
    reader.close()

    handler = HighwayHandler(selected)
    handler.apply_file(str(args.pbf), locations=True, idx="flex_mem")
    for city_id, config in selected.items():
        roads = sorted(handler.features[city_id]["roads"], key=lambda item: (item["properties"]["name"], item["id"]))
        walk = sorted(handler.features[city_id]["walk"], key=lambda item: item["id"])
        if len(roads) < 50 or len(walk) < 300:
            raise RuntimeError(f"Insufficient data for {city_id}: {len(roads)} roads, {len(walk)} walk features")
        write_collection(city_id, "roads", roads, config, timestamp, args.pbf.name)
        write_collection(city_id, "walk", walk, config, timestamp, args.pbf.name)


if __name__ == "__main__":
    main()
