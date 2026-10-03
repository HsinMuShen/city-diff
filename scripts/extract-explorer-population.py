#!/usr/bin/env python3
"""Build compact population snapshots for Explorer study areas.

Sources are Taiwan Ministry of the Interior smallest statistical areas, December
2024 population totals, and five-year age bands. Generator dependencies:
`python3 -m pip install pyshp pyproj==3.6.1`.
"""

from __future__ import annotations

import hashlib
import json
import ssl
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import shapefile
import certifi
from pyproj import Transformer


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_API = "https://data.gov.tw/api/v2/rest/dataset/{}"
BOUNDARY_DATASET = 25128
POPULATION_DATASET = 18681
AGE_DATASET = 18255
BOUNDARY_SOURCE = "https://data.gov.tw/dataset/25128"
POPULATION_SOURCE = "https://data.gov.tw/dataset/18681"
AGE_SOURCE = "https://data.gov.tw/dataset/18255"
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

CITIES = {
    "tainan": {"county": "臺南市", "studyArea": "中西區與北區歷史核心", "bbox": [120.187, 22.982, 120.219, 23.008]},
    "kaohsiung": {"county": "高雄市", "studyArea": "鹽埕—哈瑪星歷史核心", "bbox": [120.269, 22.614, 120.306, 22.638]},
    "taichung": {"county": "臺中市", "studyArea": "中區舊城核心", "bbox": [120.668, 24.132, 120.697, 24.154]},
    "taipei": {"county": "臺北市", "studyArea": "艋舺—大稻埕歷史核心", "bbox": [121.493, 25.029, 121.529, 25.067]},
    "new-taipei": {"county": "新北市", "studyArea": "板橋舊城與府中核心", "bbox": [121.444, 24.997, 121.476, 25.026]},
    "taoyuan": {"county": "桃園市", "studyArea": "桃園舊城與車站核心", "bbox": [121.294, 24.981, 121.329, 25.011]},
    "hsinchu": {"county": "新竹市", "studyArea": "竹塹舊城核心", "bbox": [120.952, 24.792, 120.984, 24.818]},
    "chiayi": {"county": "嘉義市", "studyArea": "嘉義舊城與車站核心", "bbox": [120.432, 23.465, 120.466, 23.494]},
    "keelung": {"county": "基隆市", "studyArea": "港區與市中心核心", "bbox": [121.724, 25.116, 121.758, 25.145]},
}


def get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "City-Diff-data-builder/1.0"})
    with urllib.request.urlopen(request, timeout=120, context=SSL_CONTEXT) as response:
        return json.load(response)


def download(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "City-Diff-data-builder/1.0"})
    with urllib.request.urlopen(request, timeout=180, context=SSL_CONTEXT) as response:
        destination.write_bytes(response.read())


def resource_url(dataset: dict, description: str) -> str:
    resource = next(item for item in dataset["distribution"] if item["resourceDescription"] == description)
    return resource["resourceDownloadUrl"]


def parse_rows(path: Path) -> tuple[dict[str, dict[str, str]], str]:
    root = ET.parse(path).getroot()
    rows = {}
    period = ""
    for row in root.findall("./RowDataList/RowData"):
        values = {child.tag: child.text or "" for child in row}
        rows[values["CODEBASE"]] = values
        period = values.get("INFO_TIME", period)
    return rows, period


def number(row: dict[str, str] | None, key: str) -> int:
    if not row:
        return 0
    try:
        return int(float(row.get(key, "0") or 0))
    except ValueError:
        return 0


def transform_coords(value, transformer: Transformer):
    if value and isinstance(value[0], (int, float)):
        lon, lat = transformer.transform(value[0], value[1])
        return [round(lon, 6), round(lat, 6)]
    return [transform_coords(item, transformer) for item in value]


def intersects_bbox(shape_bbox, bbox, transformer: Transformer, margin=.012) -> bool:
    west, south = transformer.transform(shape_bbox[0], shape_bbox[1])
    east, north = transformer.transform(shape_bbox[2], shape_bbox[3])
    return not (east < bbox[0] - margin or west > bbox[2] + margin or north < bbox[1] - margin or south > bbox[3] + margin)


def grouped_ages(row: dict[str, str] | None) -> list[int]:
    bands = [number(row, f"A{start}A{start + 4}_CNT") for start in range(0, 100, 5)]
    return [sum(bands[0:4]), sum(bands[4:8]), sum(bands[8:13]), sum(bands[13:20]) + number(row, "A100UP_5_CNT")]


def build_city(city_id: str, config: dict, boundary_dataset: dict, population_dataset: dict, age_dataset: dict) -> None:
    county = config["county"]
    boundary_url = resource_url(boundary_dataset, f"{county}最小統計區圖")
    population_url = resource_url(population_dataset, f"{county}統計區人口統計_最小統計區")
    age_url = resource_url(age_dataset, f"{county}統計區五歲年齡組人口統計_最小統計區")

    with tempfile.TemporaryDirectory(prefix=f"city-diff-{city_id}-") as temp_name:
        temp = Path(temp_name)
        boundary_zip = temp / "boundaries.zip"
        population_xml = temp / "population.xml"
        age_xml = temp / "age.xml"
        download(boundary_url, boundary_zip)
        download(population_url, population_xml)
        download(age_url, age_xml)
        with zipfile.ZipFile(boundary_zip) as archive:
            archive.extractall(temp / "boundaries")

        population, population_period = parse_rows(population_xml)
        ages, age_period = parse_rows(age_xml)
        shape_path = next((temp / "boundaries").glob("*.shp"))
        cpg_path = shape_path.with_suffix(".cpg")
        declared_encoding = cpg_path.read_text(encoding="ascii", errors="ignore").strip().lower() if cpg_path.exists() else "big5"
        shape_encoding = "utf-8" if "utf" in declared_encoding else "big5"
        reader = shapefile.Reader(str(shape_path), encoding=shape_encoding)
        transformer = Transformer.from_crs(3826, 4326, always_xy=True)
        features = []

        for item in reader.iterShapeRecords():
            if not intersects_bbox(item.shape.bbox, config["bbox"], transformer):
                continue
            record = item.record.as_dict()
            code = record["CODEBASE"]
            population_row = population.get(code)
            age_row = ages.get(code)
            geometry = item.shape.__geo_interface__
            centroid_lon, centroid_lat = transformer.transform(float(record["X"]), float(record["Y"]))
            area_m2 = float(record["AREA"] or 0)
            people = number(population_row, "P_CNT")
            features.append({
                "type": "Feature",
                "id": code,
                "properties": {
                    "code": code,
                    "district": record["TOWN"],
                    "area_m2": round(area_m2, 1),
                    "centroid": [round(centroid_lon, 6), round(centroid_lat, 6)],
                    "population": people,
                    "households": number(population_row, "H_CNT"),
                    "male": number(population_row, "M_CNT"),
                    "female": number(population_row, "F_CNT"),
                    "ages": grouped_ages(age_row),
                    "density_km2": round(people / area_m2 * 1_000_000) if area_m2 else 0,
                },
                "geometry": {
                    "type": geometry["type"],
                    "coordinates": transform_coords(geometry["coordinates"], transformer),
                },
            })

    collection = {
        "type": "FeatureCollection",
        "name": f"{city_id} smallest statistical areas",
        "features": features,
    }
    serialized = json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n"
    output_path = PROJECT_ROOT / "public" / "data" / f"{city_id}-population.geojson"
    output_path.write_text(serialized, encoding="utf-8")
    metadata = {
        "cityId": city_id,
        "studyArea": config["studyArea"],
        "title": f"{config['studyArea']} population by smallest statistical area",
        "source": "Ministry of the Interior Department of Statistics (Taiwan)",
        "sourceUrls": [BOUNDARY_SOURCE, POPULATION_SOURCE, AGE_SOURCE],
        "resourceUrls": [boundary_url, population_url, age_url],
        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "populationPeriod": population_period,
        "agePeriod": age_period,
        "license": "Open Government Data License, version 1.0",
        "featureCount": len(features),
        "sha256": hashlib.sha256(serialized.encode()).hexdigest(),
        "limitations": [
            "Population is assigned to a study circle when a statistical area's official centroid falls inside it.",
            "Small statistical area boundaries are the published 2015 geometry; population and age totals are December 2024.",
            "Circle-edge estimates are approximate because statistical areas are not clipped or proportionally allocated.",
        ],
    }
    (PROJECT_ROOT / "public" / "data" / f"{city_id}-population.meta.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{city_id}: wrote {len(features)} population areas ({population_period})")


def main() -> None:
    boundary_dataset = get_json(DATASET_API.format(BOUNDARY_DATASET))["result"]
    population_dataset = get_json(DATASET_API.format(POPULATION_DATASET))["result"]
    age_dataset = get_json(DATASET_API.format(AGE_DATASET))["result"]
    for city_id, config in CITIES.items():
        build_city(city_id, config, boundary_dataset, population_dataset, age_dataset)


if __name__ == "__main__":
    main()
