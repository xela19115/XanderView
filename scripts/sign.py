"""Sign the generated widget using the Samsung/Tizen SDK and your own profile."""
import argparse
import subprocess
import zipfile
from font_assets import write_widget_archive
from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--tz', required=True, help='Path to Tizen SDK tz executable')
p.add_argument('--profiles', required=True, help='Path to your Tizen profiles.xml')
p.add_argument('--profile', required=True, help='Samsung certificate profile name')
a = p.parse_args()
dist = root/'dist'
dist.mkdir(exist_ok=True)
unsigned = dist/'XanderView-personal-unsigned.wgt'
write_widget_archive(unsigned, include_private=False, include_optional_icons=True)
with zipfile.ZipFile(unsigned, 'a', zipfile.ZIP_DEFLATED) as archive:
    for notice in ('LICENSE', 'THIRD_PARTY_NOTICES.md'):
        archive.write(root/notice, notice)
out = dist/'XanderView.wgt'
subprocess.run([a.tz, 'pack', '-t', 'wgt', '-b', str(unsigned), '-p', a.profiles, '-s', a.profile, '-o', str(out)], check=True)
if not out.is_file():
    raise SystemExit('SDK did not create a signed package.')
print('Signed package:', out)
