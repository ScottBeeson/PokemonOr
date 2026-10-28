"""Extract short factual reveals from downloaded Handbook of Mineralogy sheets.

Requires pypdf. Run update-expansions.mjs rock first. No PDFs ship with the game.
"""
import json
import re
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
folder = root / 'artifacts' / 'pack-sources' / 'minerals'
snapshot = json.loads((folder / 'records.json').read_text(encoding='utf-8'))
entries = []
records = []
for record in snapshot['records']:
    text = ' '.join(PdfReader(folder / (record['name'] + '.pdf')).pages[0].extract_text().split())
    system = re.search(r'Crystal Data:\s*(Monoclinic|Triclinic|Orthorhombic|Tetragonal|Hexagonal|Trigonal|Cubic)', text, re.I)
    # Older handbook fonts expose an en dash as "{" to PDF text extraction.
    number = r'(?:\d+(?:\.\d+)?|\.\d+)'
    hardness = re.search(r'Hardness\s*=\s*(' + number + r'\s*[-–−{]\s*' + number + '|' + number + ')', text)
    if not system or not hardness:
        print('Needs manual review:', record['name'])
        continue
    # Compare letters only because older PDF fonts split ligatures and accents.
    heading = re.sub(r'[^a-z]', '', text[:len(record['name']) + 12].lower())
    if re.sub(r'[^a-z]', '', record['name'].lower()) not in heading:
        print('Heading mismatch:', record['name'])
        continue
    hardness_text = re.sub(r'\s+', '', hardness[1]).replace('–', '-').replace('−', '-').replace('{', '-')
    if hardness_text.startswith('.'):
        hardness_text = '0' + hardness_text
    # Preserve material qualifications rather than presenting a directional or
    # massive-specimen value as a universal hardness.
    if record['name'] == 'Kyanite':
        if not re.search(r'Hardness = 5\.5 k \[001\], 7 k \[100\]', text):
            raise ValueError('Kyanite hardness evidence changed; review the sheet')
        hardness_text = '5.5-7 (direction-dependent)'
    if record['name'] == 'Pyrolusite':
        if 'to 2 when massive' not in text:
            raise ValueError('Pyrolusite hardness evidence changed; review the sheet')
        hardness_text += ' (2 when massive)'
    system_text = system[1].lower()
    article = 'An' if system_text[0] in 'aeiou' else 'A'
    description = f'{article} {system_text} mineral. Mohs hardness: {hardness_text}.'
    entries.append(dict(name=record['name'], category='mineral', description=description, url=record['url'], TooObvious=False))
    records.append(dict(**record, crystalSystem=system_text, hardness=hardness_text, evidence=text[system.start():system.start()+100], hardnessEvidence=text[hardness.start():hardness.start()+65]))

if len(entries) < 100:
    raise ValueError(f'Only {len(entries)} verified minerals; refusing to replace snapshot')
previous_path = root / 'data' / 'rock.json'
previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else []
flags = {entry['name']: entry['TooObvious'] for entry in previous}
for entry in entries:
    entry['TooObvious'] = flags.get(entry['name'], entry['name'] in ['Gypsum', 'Halite', 'Hematite', 'Malachite', 'Pyrite', 'Topaz'])
entries.sort(key=lambda entry: entry['name'])
(root / 'data' / 'rock.json').write_text(json.dumps(entries, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
(root / 'data' / 'rock-provenance.json').write_text(json.dumps(dict(verifiedAt=snapshot['verifiedAt'], records=records), indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'Rock: {len(entries)} stored, {sum(not e["TooObvious"] for e in entries)} playable')
