#!/data/data/com.termux/files/usr/bin/bash

echo "=== DNS GRADIUM ==="

echo
echo "--- GOOGLE ---"
getent hosts google.com 2>&1 || true

echo
echo "--- GRADIUM ---"
getent hosts api.gradium.ai 2>&1 || true

echo
echo "--- NODE DNS ---"
node --input-type=module <<'NODE'
import dns from 'dns/promises';

try {
  const r = await dns.lookup('api.gradium.ai');
  console.log('✅', r.address, 'IPv' + r.family);
} catch (e) {
  console.log('❌', e.code, e.message);
}
NODE

echo
echo "--- HTTPS GRADIUM ---"
curl -I --connect-timeout 10 https://api.gradium.ai 2>&1 || true

echo
echo "=== FIM ==="
