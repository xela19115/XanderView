"""Sign the generated widget using the Samsung/Tizen SDK and your own profile."""
import argparse
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--tz', required=True, help='Path to Tizen SDK tz executable')
p.add_argument('--profiles', required=True, help='Path to your Tizen profiles.xml')
p.add_argument('--profile', required=True, help='Samsung certificate profile name')
a = p.parse_args()
subprocess.run(['python3', str(root/'scripts/export-public.py')], check=True)
out = root/'dist/XanderView.wgt'
subprocess.run([a.tz, 'pack', '-t', 'wgt', '-b', str(root/'dist/XanderView-public-unsigned.wgt'), '-p', a.profiles, '-s', a.profile, '-o', str(out)], check=True)
if not out.is_file():
    raise SystemExit('SDK did not create a signed package.')
print('Signed package:', out)
