#!/usr/bin/env python3

import json
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import zipfile

from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]

XLSX_FILE = (
    ROOT
    / "scripts"
    / "siigo"
    / "catalogos"
    / "Lista-de-ciudades.xlsx"
)

ENV_FILE = (
    ROOT
    / ".env.local"
)

APPLY = "--apply" in sys.argv


NS = {
    "m":
        "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
}


def load_env(path):
    values = {}

    if not path.exists():
        raise RuntimeError(
            f"No existe {path}"
        )

    for raw_line in path.read_text(
        encoding="utf-8"
    ).splitlines():

        line = raw_line.strip()

        if (
            not line
            or line.startswith("#")
            or "=" not in line
        ):
            continue

        key, value = line.split(
            "=",
            1,
        )

        key = key.strip()
        value = value.strip()

        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in ('"', "'")
        ):
            value = value[1:-1]

        values[key] = value

    return values


def normalize_key(value):
    value = str(
        value or ""
    ).strip()

    value = unicodedata.normalize(
        "NFKD",
        value,
    )

    value = "".join(
        char
        for char in value
        if not unicodedata.combining(
            char
        )
    )

    value = value.upper()

    value = re.sub(
        r"[^A-Z0-9]+",
        " ",
        value,
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    return value.strip()


def column_from_reference(
    reference,
):
    match = re.match(
        r"([A-Z]+)",
        reference,
    )

    if not match:
        return None

    return match.group(1)


def read_shared_strings(
    archive,
):
    try:
        xml = archive.read(
            "xl/sharedStrings.xml"
        )
    except KeyError:
        return []

    root = ET.fromstring(xml)

    strings = []

    for item in root.findall(
        "m:si",
        NS,
    ):
        parts = []

        for node in item.findall(
            ".//m:t",
            NS,
        ):
            if node.text:
                parts.append(
                    node.text
                )

        strings.append(
            "".join(parts)
        )

    return strings


def read_cell(
    cell,
    shared_strings,
):
    cell_type = cell.attrib.get(
        "t"
    )

    if cell_type == "inlineStr":
        parts = []

        for node in cell.findall(
            ".//m:t",
            NS,
        ):
            if node.text:
                parts.append(
                    node.text
                )

        return "".join(parts)

    value_node = cell.find(
        "m:v",
        NS,
    )

    if value_node is None:
        return ""

    raw = value_node.text or ""

    if cell_type == "s":
        try:
            return shared_strings[
                int(raw)
            ]
        except (
            ValueError,
            IndexError,
        ):
            return ""

    return raw


def read_workbook(
    path,
):
    if not path.exists():
        raise RuntimeError(
            f"No existe el archivo Excel: {path}"
        )

    with zipfile.ZipFile(
        path
    ) as archive:

        shared_strings = (
            read_shared_strings(
                archive
            )
        )

        sheet_xml = archive.read(
            "xl/worksheets/sheet1.xml"
        )

        root = ET.fromstring(
            sheet_xml
        )

        result = []

        for row in root.findall(
            ".//m:sheetData/m:row",
            NS,
        ):
            values = {}

            for cell in row.findall(
                "m:c",
                NS,
            ):
                reference = (
                    cell.attrib.get(
                        "r",
                        "",
                    )
                )

                column = (
                    column_from_reference(
                        reference
                    )
                )

                if not column:
                    continue

                values[column] = (
                    read_cell(
                        cell,
                        shared_strings,
                    )
                )

            result.append(
                [
                    values.get(
                        "A",
                        "",
                    ),
                    values.get(
                        "B",
                        "",
                    ),
                    values.get(
                        "C",
                        "",
                    ),
                    values.get(
                        "D",
                        "",
                    ),
                    values.get(
                        "E",
                        "",
                    ),
                    values.get(
                        "F",
                        "",
                    ),
                ]
            )

    return result


def prepare_rows(
    rows,
):
    expected_headers = [
        "CityCode",
        "CityName",
        "StateCode",
        "StateName",
        "CountryCode",
        "CountryName",
    ]

    if not rows:
        raise RuntimeError(
            "El Excel está vacío."
        )

    headers = [
        str(value).strip()
        for value in rows[0]
    ]

    if headers != expected_headers:
        raise RuntimeError(
            "Las columnas del Excel no son las esperadas.\n"
            f"Esperadas: {expected_headers}\n"
            f"Encontradas: {headers}"
        )

    prepared = []
    seen = set()

    for row_number, row in enumerate(
        rows[1:],
        start=2,
    ):
        (
            city_code,
            city_name,
            state_code,
            state_name,
            country_code,
            country_name,
        ) = [
            str(value or "").strip()
            for value in row
        ]

        if not any(
            (
                city_code,
                city_name,
                state_code,
                state_name,
                country_code,
                country_name,
            )
        ):
            continue

        if not all(
            (
                city_code,
                city_name,
                state_code,
                state_name,
                country_code,
                country_name,
            )
        ):
            raise RuntimeError(
                f"Fila {row_number} incompleta: {row}"
            )

        country_code = (
            country_code.upper()
        )

        pk = (
            country_code,
            state_code,
            city_code,
        )

        if pk in seen:
            raise RuntimeError(
                "El Excel contiene una clave duplicada: "
                f"{pk}"
            )

        seen.add(pk)

        prepared.append({
            "country_code":
                country_code,

            "country_name":
                country_name,

            "state_code":
                state_code,

            "state_name":
                state_name,

            "city_code":
                city_code,

            "city_name":
                city_name,

            "country_key":
                normalize_key(
                    country_name
                ),

            "state_key":
                normalize_key(
                    state_name
                ),

            "city_key":
                normalize_key(
                    city_name
                ),

            "source":
                "SIIGO",
        })

    return prepared


def post_batch(
    base_url,
    service_key,
    rows,
):
    endpoint = (
        base_url.rstrip("/")
        + "/rest/v1/siigo_cities"
        + "?on_conflict="
        + urllib.parse.quote(
            "country_code,state_code,city_code",
            safe=",",
        )
    )

    payload = json.dumps(
        rows,
        ensure_ascii=False,
    ).encode(
        "utf-8"
    )

    request = urllib.request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "apikey":
                service_key,

            "Authorization":
                f"Bearer {service_key}",

            "Content-Type":
                "application/json",

            "Prefer":
                "resolution=merge-duplicates,return=minimal",
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=60,
        ) as response:

            if not (
                200
                <= response.status
                < 300
            ):
                raise RuntimeError(
                    f"Supabase respondió {response.status}"
                )

    except urllib.error.HTTPError as error:
        detail = (
            error.read()
            .decode(
                "utf-8",
                errors="replace",
            )
        )

        raise RuntimeError(
            "Supabase rechazó el lote "
            f"({error.code}): {detail}"
        ) from error


def main():
    print(
        "\n"
        + (
            "🚀 MODO APLICAR"
            if APPLY
            else "🔎 MODO VISTA PREVIA"
        )
    )

    raw_rows = read_workbook(
        XLSX_FILE
    )

    rows = prepare_rows(
        raw_rows
    )

    countries = {
        row["country_code"]
        for row in rows
    }

    colombia_rows = [
        row
        for row in rows
        if row["country_code"]
        == "CO"
    ]

    print(
        "\n========================================"
    )
    print(
        "CATÁLOGO DE CIUDADES SIIGO"
    )
    print(
        "========================================"
    )

    print(
        f"\nRegistros: {len(rows)}"
    )

    print(
        f"Países: {len(countries)}"
    )

    print(
        f"Ciudades Colombia: {len(colombia_rows)}"
    )

    samples = {
        "BOGOTA",
        "CHIA",
        "CALI",
        "MEDELLIN",
        "CARTAGENA",
        "MADRID",
    }

    sample_rows = [
        row
        for row in colombia_rows
        if row["city_key"]
        in samples
    ]

    print(
        "\nEjemplos Colombia:"
    )

    for row in sample_rows:
        print(
            " • "
            f"{row['city_name']} → "
            f"{row['country_code']} / "
            f"{row['state_code']} / "
            f"{row['city_code']}"
        )

    if not APPLY:
        print(
            "\n✅ Vista previa terminada. "
            "No se modificó Supabase."
        )
        return

    env = load_env(
        ENV_FILE
    )

    base_url = env.get(
        "NEXT_PUBLIC_SUPABASE_URL",
        "",
    ).strip()

    service_key = env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
        "",
    ).strip()

    if not base_url:
        raise RuntimeError(
            "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local"
        )

    if not service_key:
        raise RuntimeError(
            "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local"
        )

    batch_size = 300

    total_batches = (
        len(rows)
        + batch_size
        - 1
    ) // batch_size

    for batch_number, start in enumerate(
        range(
            0,
            len(rows),
            batch_size,
        ),
        start=1,
    ):
        batch = rows[
            start:
            start + batch_size
        ]

        post_batch(
            base_url,
            service_key,
            batch,
        )

        print(
            f"✅ Lote {batch_number}/{total_batches}: "
            f"{len(batch)} registros"
        )

    print(
        "\n✅ Catálogo SIIGO importado correctamente."
    )


if __name__ == "__main__":
    try:
        main()

    except Exception as error:
        print(
            f"\n❌ {error}",
            file=sys.stderr,
        )

        sys.exit(1)
