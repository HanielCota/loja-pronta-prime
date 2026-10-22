"""Read the minimal import fields from a Hotmart OOXML report, including mislabeled .xls files."""

import json
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
FIELDS = {
    "A": ("Nome do Produto", "productName"),
    "E": ("Transação", "transaction"),
    "Q": ("Data de Venda", "soldAt"),
    "R": ("Data de Confirmação", "confirmedAt"),
    "S": ("Status", "status"),
    "T": ("Nome", "name"),
    "V": ("Email", "email"),
    "AH": ("Código do Produto", "productId"),
}


def extract(filename):
    with zipfile.ZipFile(filename) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = workbook.findall("m:sheets/m:sheet", NS)
        if len(sheets) != 1 or sheets[0].get("name") != "Report":
            raise ValueError("Expected a single Report worksheet")
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relationship_id = sheets[0].get(
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        )
        target = next(r.get("Target") for r in relationships if r.get("Id") == relationship_id)
        sheet_path = target.lstrip("/") if target.startswith("/") else "xl/" + target
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = [
                "".join(t.text or "" for t in item.findall(".//m:t", NS))
                for item in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)
            ]
        result = []
        header_seen = False
        with archive.open(sheet_path) as stream:
            for _, row in ET.iterparse(stream, events=("end",)):
                if row.tag != "{" + NS["m"] + "}row":
                    continue
                values = {}
                for cell in row.findall("m:c", NS):
                    column = "".join(c for c in cell.get("r", "") if c.isalpha())
                    if column not in FIELDS:
                        continue
                    if cell.find("m:f", NS) is not None:
                        raise ValueError("Import fields must contain source values, not formulas")
                    value = cell.findtext("m:v", "", NS)
                    if cell.get("t") == "s":
                        value = strings[int(value)]
                    elif cell.get("t") == "inlineStr":
                        value = "".join(t.text or "" for t in cell.findall(".//m:t", NS))
                    values[column] = value
                if not header_seen:
                    if any(values.get(col) != title for col, (title, _) in FIELDS.items()):
                        raise ValueError("Unexpected Hotmart report columns")
                    header_seen = True
                elif any(values.values()):
                    result.append({"sourceRow": int(row.get("r")), **{
                        field: values.get(col, "") for col, (_, field) in FIELDS.items()
                    }})
                row.clear()
        if not header_seen or not result:
            raise ValueError("Report contains no sales")
        return result


if __name__ == "__main__":
    try:
        print(json.dumps(extract(sys.argv[1]), ensure_ascii=False))
    except Exception as error:
        # Do not print source values or personal data in terminal errors.
        print(f"Sales extraction failed: {type(error).__name__}", file=sys.stderr)
        sys.exit(1)
