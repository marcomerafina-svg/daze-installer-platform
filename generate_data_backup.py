#!/usr/bin/env python3
import json

# Tutti i dati estratti dalle query SQL
data = {
    "area_managers": [
        {"id": "7206460b-adf7-4745-b29f-4bb5f1703eae", "user_id": None, "name": "Luca Falconi", "email": "luca.falconi@daze.eu", "phone": "+393441604820", "regions": ["Valle d'Aosta", "Piemonte", "Liguria", "Lombardia", "Trentino-Alto Adige", "Veneto", "Friuli-Venezia Giulia", "Emilia-Romagna", "Toscana", "Umbria", "Marche"], "created_at": "2025-10-29T16:59:39.403769+00:00", "updated_at": "2025-10-29T16:59:39.403769+00:00"},
        {"id": "4d8359f1-66ce-4d05-b166-853dcb7a3a00", "user_id": None, "name": "Alessandro Marinelli", "email": "alessandro.marinelli@daze.eu", "phone": "+393441604820", "regions": ["Lazio", "Abruzzo", "Molise", "Campania", "Puglia", "Basilicata", "Calabria", "Sicilia", "Sardegna"], "created_at": "2025-10-29T16:59:39.403769+00:00", "updated_at": "2025-10-29T16:59:39.403769+00:00"}
    ]
}

def format_value(v):
    if v is None:
        return 'NULL'
    elif isinstance(v, bool):
        return 'true' if v else 'false'
    elif isinstance(v, (int, float)):
        return str(v)
    elif isinstance(v, list):
        items = ', '.join([f"'{item}'" for item in v])
        return f"ARRAY[{items}]"
    elif isinstance(v, dict):
        return f"'{json.dumps(v)}'::jsonb"
    else:
        # Escape single quotes
        escaped = str(v).replace("'", "''")
        return f"'{escaped}'"

def generate_insert(table_name, records):
    if not records:
        return f"-- No data for {table_name}\n"

    output = f"\n-- Data for table: {table_name}\n"
    output += f"-- Records: {len(records)}\n"

    for record in records:
        columns = list(record.keys())
        values = [format_value(record[col]) for col in columns]

        output += f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(values)});\n"

    return output

# Generate for area_managers
print(generate_insert("area_managers", data["area_managers"]))
