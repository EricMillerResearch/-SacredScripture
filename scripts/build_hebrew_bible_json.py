#!/usr/bin/env python3
from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path

WLC_DIR = Path("data/oshb/wlc")
OUT_PATH = Path("backend/data/hebrew_bible.json")

BOOK_ORDER = [
    "Gen", "Exod", "Lev", "Num", "Deut",
    "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
    "1Chr", "2Chr", "Ezra", "Neh", "Esth",
    "Job", "Ps", "Prov", "Eccl", "Song",
    "Isa", "Jer", "Lam", "Ezek", "Dan",
    "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",
]

BOOK_NAMES = {
    "Gen": "Genesis",
    "Exod": "Exodus",
    "Lev": "Leviticus",
    "Num": "Numbers",
    "Deut": "Deuteronomy",
    "Josh": "Joshua",
    "Judg": "Judges",
    "Ruth": "Ruth",
    "1Sam": "1 Samuel",
    "2Sam": "2 Samuel",
    "1Kgs": "1 Kings",
    "2Kgs": "2 Kings",
    "1Chr": "1 Chronicles",
    "2Chr": "2 Chronicles",
    "Ezra": "Ezra",
    "Neh": "Nehemiah",
    "Esth": "Esther",
    "Job": "Job",
    "Ps": "Psalms",
    "Prov": "Proverbs",
    "Eccl": "Ecclesiastes",
    "Song": "Song of Songs",
    "Isa": "Isaiah",
    "Jer": "Jeremiah",
    "Lam": "Lamentations",
    "Ezek": "Ezekiel",
    "Dan": "Daniel",
    "Hos": "Hosea",
    "Joel": "Joel",
    "Amos": "Amos",
    "Obad": "Obadiah",
    "Jonah": "Jonah",
    "Mic": "Micah",
    "Nah": "Nahum",
    "Hab": "Habakkuk",
    "Zeph": "Zephaniah",
    "Hag": "Haggai",
    "Zech": "Zechariah",
    "Mal": "Malachi",
}


def clean_word(word: str) -> str:
    return word.replace("/", "")


def parse_book(xml_path: Path) -> dict:
    data: dict[int, dict[int, str]] = {}
    for event, elem in ET.iterparse(xml_path, events=("end",)):
        tag = elem.tag
        if tag.endswith("verse") and "osisID" in elem.attrib:
            osis = elem.attrib["osisID"]
            # osisID like Gen.1.1
            parts = osis.split(".")
            if len(parts) < 3:
                continue
            try:
                chapter = int(parts[1])
                verse = int(parts[2])
            except ValueError:
                continue
            words = []
            for w in elem.iter():
                if w.tag.endswith("w") and w.text:
                    words.append(clean_word(w.text))
            text = " ".join(words).strip()
            if text:
                data.setdefault(chapter, {})[verse] = text
            elem.clear()
    return data


def main():
    if not WLC_DIR.exists():
        raise SystemExit(f"Missing WLC directory: {WLC_DIR}")

    bible = {"books": []}
    for code in BOOK_ORDER:
        xml_path = WLC_DIR / f"{code}.xml"
        if not xml_path.exists():
            continue
        chapters = parse_book(xml_path)
        bible["books"].append({
            "code": code,
            "name": BOOK_NAMES.get(code, code),
            "chapters": chapters,
        })

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(bible, ensure_ascii=False))
    print(OUT_PATH)


if __name__ == "__main__":
    main()
