from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

DATA_PATH = Path('backend/data/hebrew_bible.json')

router = APIRouter(prefix='/bible', tags=['bible'])


def load_bible():
    if not DATA_PATH.exists():
        raise HTTPException(status_code=500, detail='Hebrew Bible dataset not found')
    data = json.loads(DATA_PATH.read_text(encoding='utf-8'))
    return data


@router.get('/hebrew/books')
def hebrew_books():
    data = load_bible()
    books = [
        {
            'code': b['code'],
            'name': b['name'],
            'chapters': len(b['chapters']),
        }
        for b in data['books']
    ]
    return {'books': books}


@router.get('/hebrew/{book_code}/chapters')
def hebrew_chapters(book_code: str):
    data = load_bible()
    for b in data['books']:
        if b['code'].lower() == book_code.lower():
            return {'chapters': sorted(int(c) for c in b['chapters'].keys())}
    raise HTTPException(status_code=404, detail='Book not found')


@router.get('/hebrew/{book_code}/{chapter}')
def hebrew_chapter(book_code: str, chapter: int):
    data = load_bible()
    for b in data['books']:
        if b['code'].lower() == book_code.lower():
            verses = b['chapters'].get(str(chapter)) or b['chapters'].get(chapter)
            if not verses:
                raise HTTPException(status_code=404, detail='Chapter not found')
            # ensure verse keys sorted numerically
            verses_sorted = [
                {'verse': int(v), 'text': verses[v]}
                for v in sorted(verses.keys(), key=lambda x: int(x))
            ]
            return {'book': b['name'], 'code': b['code'], 'chapter': chapter, 'verses': verses_sorted}
    raise HTTPException(status_code=404, detail='Book not found')
