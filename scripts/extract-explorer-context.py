#!/usr/bin/env python3
"""Extract built form, green space, and rail transit from a Taiwan OSM PBF."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import osmium


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://download.geofabrik.de/asia/taiwan.html"
RAIL_MODES = {"rail", "subway", "light_rail", "tram", "monorail"}
GREEN_LEISURE = {"park", "garden", "recreation_ground", "nature_reserve", "playground"}
GREEN_LANDUSE = {"grass", "forest", "recreation_ground", "village_green"}
CITIES = {
    "tainan": {"studyArea": "中西區與北區歷史核心", "bbox": [120.187, 22.982, 120.219, 23.008]},
    "kaohsiung": {"studyArea": "鹽埕—哈瑪星歷史核心", "bbox": [120.269, 22.614, 120.306, 22.638]},
    "taichung": {"studyArea": "中區舊城核心", "bbox": [120.668, 24.132, 120.697, 24.154]},
    "taipei": {"studyArea": "艋舺—大稻埕歷史核心", "bbox": [121.493, 25.029, 121.529, 25.067]},
    "new-taipei": {"studyArea": "板橋舊城與府中核心", "bbox": [121.444, 24.997, 121.476, 25.026]},
    "taoyuan": {"studyArea": "桃園舊城與車站核心", "bbox": [121.294, 24.981, 121.329, 25.011]},
    "hsinchu": {"studyArea": "竹塹舊城核心", "bbox": [120.952, 24.792, 120.984, 24.818]},
    "chiayi": {"studyArea": "嘉義舊城與車站核心", "bbox": [120.432, 23.465, 120.466, 23.494]},
    "keelung": {"studyArea": "港區與市中心核心", "bbox": [121.724, 25.116, 121.758, 25.145]},
}


def intersects(coords: list[list[float]], bbox: list[float], margin=.002) -> bool:
    west, south, east, north = bbox
    return any(west - margin <= lon <= east + margin and south - margin <= lat <= north + margin for lon, lat in coords)


def polygon_area_m2(coords: list[list[float]]) -> float:
    if len(coords) < 4:
        return 0
    latitude = sum(point[1] for point in coords) / len(coords)
    x_scale = 111_320 * math.cos(math.radians(latitude))
    y_scale = 110_540
    area = 0.0
    for first, second in zip(coords, coords[1:]):
        area += first[0] * x_scale * second[1] * y_scale - second[0] * x_scale * first[1] * y_scale
    return abs(area) / 2


def centroid(coords: list[list[float]]) -> list[float]:
    points = coords[:-1] if coords and coords[0] == coords[-1] else coords
    return [round(sum(point[0] for point in points) / len(points), 6), round(sum(point[1] for point in points) / len(points), 6)]


class ContextHandler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.urban = defaultdict(list)
        self.transit = defaultdict(list)

    def node(self, node):
        tags = node.tags
        railway = tags.get("railway")
        public_transport = tags.get("public_transport")
        if railway not in {"station", "halt", "tram_stop"} and public_transport != "station":
            return
        try:
            coords = [node.location.lon, node.location.lat]
        except osmium.InvalidLocationError:
            return
        for city_id, config in CITIES.items():
            if not intersects([coords], config["bbox"]):
                continue
            self.transit[city_id].append({
                "type": "Feature", "id": f"n{node.id}",
                "properties": {
                    "kind": "station", "mode": tags.get("station") or railway or public_transport,
                    "name": tags.get("name") or tags.get("name:en") or "Unnamed station",
                    "name_en": tags.get("name:en"), "network": tags.get("network"), "operator": tags.get("operator"),
                },
                "geometry": {"type": "Point", "coordinates": [round(coords[0], 6), round(coords[1], 6)]},
            })

    def way(self, way):
        tags = way.tags
        building = tags.get("building")
        is_green = tags.get("leisure") in GREEN_LEISURE or tags.get("landuse") in GREEN_LANDUSE
        railway = tags.get("railway")
        needs_polygon = building is not None or is_green
        needs_line = railway in RAIL_MODES and tags.get("service") not in {"yard", "siding", "spur"}
        if not needs_polygon and not needs_line:
            return
        try:
            coords = [[round(node.lon, 6), round(node.lat, 6)] for node in way.nodes]
        except osmium.InvalidLocationError:
            return
        if len(coords) < 2:
            return
        for city_id, config in CITIES.items():
            if not intersects(coords, config["bbox"]):
                continue
            if needs_polygon and len(coords) >= 4 and coords[0] == coords[-1]:
                kind = "building" if building is not None else "green"
                area = polygon_area_m2(coords)
                if area >= 8:
                    self.urban[city_id].append({
                        "type": "Feature", "id": f"w{way.id}",
                        "properties": {
                            "kind": kind, "category": building if kind == "building" else tags.get("leisure") or tags.get("landuse"),
                            "name": tags.get("name"), "area_m2": round(area, 1), "centroid": centroid(coords),
                        },
                        "geometry": {"type": "Polygon", "coordinates": [coords]},
                    })
            if needs_line:
                self.transit[city_id].append({
                    "type": "Feature", "id": f"w{way.id}",
                    "properties": {
                        "kind": "line", "mode": railway, "name": tags.get("name") or tags.get("line") or tags.get("ref"),
                        "name_en": tags.get("name:en"), "network": tags.get("network"), "operator": tags.get("operator"),
                    },
                    "geometry": {"type": "LineString", "coordinates": coords},
                })


def write_collection(city_id: str, kind: str, features: list[dict], config: dict, timestamp: str | None, source_file: str):
    collection = {"type": "FeatureCollection", "name": f"{city_id} {kind}", "features": features}
    serialized = json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n"
    output_path = PROJECT_ROOT / "public" / "data" / f"{city_id}-{kind}.geojson"
    output_path.write_text(serialized, encoding="utf-8")
    metadata = {
        "cityId": city_id,
        "studyArea": config["studyArea"],
        "title": f"{config['studyArea']} OSM {kind} snapshot",
        "source": "OpenStreetMap contributors via Geofabrik Taiwan extract",
        "sourceUrl": SOURCE_URL,
        "endpoint": source_file,
        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "osmDataTimestamp": timestamp,
        "license": "Open Database License (ODbL)",
        "featureCount": len(features),
        "sha256": hashlib.sha256(serialized.encode()).hexdigest(),
        "limitations": [
            "OpenStreetMap is contributor-maintained and may be incomplete.",
            "Polygon statistics use closed OSM ways; multipolygon relations are not included.",
            "Features are assigned to a study circle by centroid or sampled line segments, so circle-edge values are approximate.",
        ],
    }
    (PROJECT_ROOT / "public" / "data" / f"{city_id}-{kind}.meta.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{city_id}: wrote {len(features)} {kind} features")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pbf", type=Path, help="Path to a Taiwan .osm.pbf extract")
    args = parser.parse_args()
    reader = osmium.io.Reader(str(args.pbf))
    timestamp = reader.header().get("osmosis_replication_timestamp")
    reader.close()
    handler = ContextHandler()
    handler.apply_file(str(args.pbf), locations=True, idx="flex_mem")
    for city_id, config in CITIES.items():
        urban = sorted(handler.urban[city_id], key=lambda item: str(item["id"]))
        transit = sorted(handler.transit[city_id], key=lambda item: str(item["id"]))
        write_collection(city_id, "urban-form", urban, config, timestamp, args.pbf.name)
        write_collection(city_id, "transit", transit, config, timestamp, args.pbf.name)


if __name__ == "__main__":
    main()
