"""Set a unique Tizen package identity consistently before signing."""
import argparse
import re
import xml.etree.ElementTree as ET
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('package', help='Unique ten-character alphanumeric Tizen package ID')
args = parser.parse_args()
if not re.fullmatch(r'[A-Za-z0-9]{10}', args.package):
    parser.error('Package ID must contain exactly ten ASCII letters or digits.')
manifest = root / 'app/config.xml'
ns = {'t': 'http://tizen.org/ns/widgets'}
node = ET.parse(manifest).getroot().find('t:application', ns)
old_package, old_id = node.get('package'), node.get('id')
new_id = args.package + '.XanderView'
# Keep every runtime, validation and test reference in sync, without touching stored preferences.
for path in [manifest, root/'app/device.js', root/'app/return-home.js', root/'scripts/check.py', root/'scripts/check-browser.mjs', root/'scripts/check-return-home.cjs']:
    text = path.read_text()
    text = text.replace(old_id, new_id)
    if path == manifest:
        text = text.replace('package="' + old_package + '"', 'package="' + args.package + '"')
    elif path.name == 'check.py':
        text = text.replace("get('package') == '" + old_package + "'", "get('package') == '" + args.package + "'")
    path.write_text(text)
print('Configured app ID:', new_id)
