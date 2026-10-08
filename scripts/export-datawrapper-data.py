#!/usr/bin/env python3
"""Export City Diff's source snapshots into Datawrapper-friendly tables.

The exports intentionally describe the study-area snapshots, not entire municipal
statistics. Length and area values are calculated from the stored geometries.
"""

from __future__ import annotations

import csv
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "portfolio" / "data"

CITIES = [
    ("tainan", "Tainan"),
    ("kaohsiung", "Kaohsiung"),
    ("taichung", "Taichung"),
    ("taipei", "Taipei"),
    ("new-taipei", "New Taipei"),
    ("taoyuan", "Taoyuan"),
    ("hsinchu", "Hsinchu"),
    ("chiayi", "Chiayi"),
    ("keelung", "Keelung"),
]


def load(city: str, kind: str) -> dict:
    return json.loads((DATA / f"{city}-{kind}.geojson").read_text())


def props(feature: dict) -> dict:
    return feature.get("properties") or {}


def haversine(a: list[float], b: list[float]) -> float:
    lon1, lat1 = map(math.radians, a[:2])
    lon2, lat2 = map(math.radians, b[:2])
    dlon, dlat = lon2 - lon1, lat2 - lat1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371008.8 * 2 * math.asin(math.sqrt(h))


def line_length(coords: list) -> float:
    if not coords:
        return 0.0
    if isinstance(coords[0][0], (int, float)):
        return sum(haversine(coords[i - 1], coords[i]) for i in range(1, len(coords)))
    return sum(line_length(part) for part in coords)


def polygon_area(coords: list) -> float:
    """Approximate square metres for a lon/lat polygon using a local projection."""
    if not coords:
        return 0.0
    if not isinstance(coords[0][0], (int, float)):
        return sum(polygon_area(part) for part in coords)
    lat0 = math.radians(sum(point[1] for point in coords) / len(coords))
    scale_x = 111320 * math.cos(lat0)
    scale_y = 110540
    xy = [(point[0] * scale_x, point[1] * scale_y) for point in coords]
    return abs(sum(xy[i - 1][0] * xy[i][1] - xy[i][0] * xy[i - 1][1] for i in range(len(xy))) / 2)


def geometry_length(geometry: dict | None) -> float:
    if not geometry or geometry.get("type") not in {"LineString", "MultiLineString"}:
        return 0.0
    return line_length(geometry.get("coordinates", []))


def geometry_area(geometry: dict | None) -> float:
    if not geometry or geometry.get("type") not in {"Polygon", "MultiPolygon"}:
        return 0.0
    return polygon_area(geometry.get("coordinates", []))


def write_csv(name: str, rows: list[dict], fields: list[str]) -> None:
    path = OUT / name
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    overview, roads, hierarchy, transit, population, urban = [], [], [], [], [], []

    for city, city_name in CITIES:
        road = load(city, "roads")
        walk = load(city, "walk-network")
        pop = load(city, "population")
        form = load(city, "urban-form")
        rail = load(city, "transit")

        road_by_type = defaultdict(lambda: {"segments": 0, "length_m": 0.0})
        for feature in road["features"]:
            kind = props(feature).get("highway") or "unknown"
            road_by_type[kind]["segments"] += 1
            road_by_type[kind]["length_m"] += geometry_length(feature.get("geometry"))
            roads.append({
                "city": city_name,
                "city_id": city,
                "street_name": props(feature).get("name") or "Unnamed street",
                "street_name_en": props(feature).get("name_en") or "",
                "highway_class": kind,
                "lanes": props(feature).get("lanes") or "",
                "surface": props(feature).get("surface") or "",
                "oneway": props(feature).get("oneway") or "",
                "length_km": round(geometry_length(feature.get("geometry")) / 1000, 3),
            })

        hierarchy_rows = []
        for kind, values in sorted(road_by_type.items()):
            hierarchy_rows.append({
                "city": city_name,
                "city_id": city,
                "highway_class": kind,
                "segments": values["segments"],
                "length_km": round(values["length_m"] / 1000, 3),
            })

        station_count = sum(1 for f in rail["features"] if props(f).get("kind") == "station")
        line_count = sum(1 for f in rail["features"] if props(f).get("kind") == "line")
        mode_counts = Counter(props(f).get("mode") or "unknown" for f in rail["features"] if props(f).get("kind") == "line")
        transit.append({
            "city": city_name,
            "city_id": city,
            "stations": station_count,
            "mapped_lines": line_count,
            "rail_lines": mode_counts.get("rail", 0),
            "subway_lines": mode_counts.get("subway", 0),
            "light_rail_lines": mode_counts.get("light_rail", 0),
            "train_lines": mode_counts.get("train", 0),
        })

        total_population = sum((props(f).get("population") or 0) for f in pop["features"])
        total_households = sum((props(f).get("households") or 0) for f in pop["features"])
        total_area_m2 = sum((props(f).get("area_m2") or geometry_area(f.get("geometry"))) for f in pop["features"])
        female = sum((props(f).get("female") or 0) for f in pop["features"])
        ages = [sum((props(f).get("ages") or [0, 0, 0, 0])[index] for f in pop["features"]) for index in range(4)]
        population.append({
            "city": city_name,
            "city_id": city,
            "statistical_areas": len(pop["features"]),
            "population": total_population,
            "households": total_households,
            "female_share_pct": round(female / total_population * 100, 1) if total_population else 0,
            "population_density_per_km2": round(total_population / (total_area_m2 / 1_000_000), 1) if total_area_m2 else 0,
            "age_0_17": ages[0],
            "age_18_34": ages[1],
            "age_35_64": ages[2],
            "age_65_plus": ages[3],
        })

        building_area = sum((props(f).get("area_m2") or 0) for f in form["features"] if props(f).get("kind") == "building")
        green_area = sum((props(f).get("area_m2") or 0) for f in form["features"] if props(f).get("kind") == "green")
        building_count = sum(1 for f in form["features"] if props(f).get("kind") == "building")
        green_count = sum(1 for f in form["features"] if props(f).get("kind") == "green")
        urban.append({
            "city": city_name,
            "city_id": city,
            "building_features": building_count,
            "building_footprint_m2": round(building_area, 1),
            "green_features": green_count,
            "green_area_m2": round(green_area, 1),
            "urban_form_features": len(form["features"]),
            "walk_network_km": round(sum(geometry_length(f.get("geometry")) for f in walk["features"]) / 1000, 3),
            "road_segments": len(road["features"]),
            "road_network_km": round(sum(geometry_length(f.get("geometry")) for f in road["features"]) / 1000, 3),
        })

        overview.append({
            "city": city_name,
            "city_id": city,
            "population": total_population,
            "population_density_per_km2": round(total_population / (total_area_m2 / 1_000_000), 1) if total_area_m2 else 0,
            "road_network_km": round(sum(geometry_length(f.get("geometry")) for f in road["features"]) / 1000, 3),
            "walk_network_km": round(sum(geometry_length(f.get("geometry")) for f in walk["features"]) / 1000, 3),
            "building_footprint_m2": round(building_area, 1),
            "green_area_m2": round(green_area, 1),
            "transit_stations": station_count,
            "transit_lines": line_count,
            "source_snapshot": "2026 City Diff study-area snapshot",
        })

        # Merge per-city hierarchy rows after the city loop keeps the output order stable.
        hierarchy.extend(hierarchy_rows)

    write_csv("city-overview.csv", overview, list(overview[0]))
    write_csv("street-hierarchy.csv", hierarchy, list(hierarchy[0]))
    write_csv("transit-summary.csv", transit, list(transit[0]))
    write_csv("population-summary.csv", population, list(population[0]))
    write_csv("urban-form-summary.csv", urban, list(urban[0]))
    print(f"Wrote {len(overview)} city rows and {len(hierarchy)} street hierarchy rows to {OUT}")


if __name__ == "__main__":
    main()
