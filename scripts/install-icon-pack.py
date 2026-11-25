"""Download and extract the optional Projectivy artwork; the APK is never executed."""
import argparse
import hashlib
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://raw.githubusercontent.com/SicMundus86/ProjectivyIconPack/be9af6dc32b40078b08d0917386defcae044d1ee/Latestrelease/projectivyiconpack-latest.apk'
SHA256 = 'c3343564f6ff7a5ab51542a086f52820997fadbf26d947c1d30c3ef7bdad2d83'
NAMES = ('apple_tv', 'disney_plus', 'hdhomerun', 'netflix', 'plex', 'prime_video', 'youtube')

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--apk', type=Path, help='Use an already downloaded copy of the pinned APK')
args = p.parse_args()
try:
    from androguard.core.apk import APK
    from loguru import logger
except ImportError:
    raise SystemExit('Install the optional dependency first: python3 -m pip install -r requirements-icons.txt')
logger.remove()
with tempfile.TemporaryDirectory(prefix='xanderview-icons-') as tmp:
    apk = Path(tmp)/'icon-pack.apk'
    if args.apk:
        data = args.apk.read_bytes()
    else:
        req = urllib.request.Request(URL, headers={'User-Agent':'XanderView-icon-setup/0.8'})
        with urllib.request.urlopen(req, timeout=60) as response:
            data = response.read(50_000_001)
    if len(data) > 50_000_000 or hashlib.sha256(data).hexdigest() != SHA256:
        raise SystemExit('Icon-pack checksum did not match the pinned release; no files were installed.')
    apk.write_bytes(data)
    resources = APK(str(apk)).get_android_resources()
    packages = resources.get_packages_names()
    if packages != ['dev.projectivy.blueprint.app']:
        raise SystemExit('Unexpected Android resource package; no files were installed.')
    extracted = {}
    with zipfile.ZipFile(apk) as archive:
        available = set(archive.namelist())
        for name in NAMES:
            rid = resources.get_res_id_by_key(packages[0], 'drawable', name)
            if not rid:
                raise SystemExit('Missing icon ' + name + '; no files were installed.')
            paths = [value for _, value in resources.get_resolved_res_configs(rid)
                     if isinstance(value, str) and value in available and value.startswith('res/')]
            if len(paths) != 1:
                raise SystemExit('Ambiguous icon ' + name + '; no files were installed.')
            image = archive.read(paths[0])
            if not image.startswith(b'\x89PNG\r\n\x1a\n') or len(image) > 2_000_000:
                raise SystemExit('Invalid icon ' + name + '; no files were installed.')
            extracted[name] = image
    dest = ROOT/'app/assets/icons/projectivy'
    dest.mkdir(parents=True, exist_ok=True)
    for name, image in extracted.items():
        (dest/(name+'.png')).write_bytes(image)
print('Installed seven optional icons locally. Rebuild and sign the TV package to include them.')
