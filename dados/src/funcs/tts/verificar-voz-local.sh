#!/data/data/com.termux/files/usr/bin/bash

echo "=============================================="
echo "       KYARA — DIAGNÓSTICO DE VOZ LOCAL"
echo "=============================================="
echo

echo "[CPU]"
uname -m
echo

echo "[NODE]"
node --version 2>/dev/null || echo "Node não encontrado."
echo

echo "[PYTHON]"
python3 --version 2>/dev/null || echo "Python3 não encontrado."
echo

echo "[PIP]"
python3 -m pip --version 2>/dev/null || echo "pip não encontrado."
echo

echo "[FFMPEG]"
ffmpeg -version 2>/dev/null | head -n 1 || echo "ffmpeg não encontrado."
echo

echo "[MEMÓRIA]"
free -h 2>/dev/null || true
echo

echo "[ARMAZENAMENTO]"
df -h "$HOME" 2>/dev/null || true
echo

echo "[ONNXRUNTIME]"
python3 - <<'PY'
try:
    import onnxruntime
    print("OK: onnxruntime instalado.")
    print("Versão:", onnxruntime.__version__)
except Exception as e:
    print("onnxruntime ainda não está disponível.")
    print("Motivo:", str(e))
PY

echo
echo "=============================================="
echo "Diagnóstico concluído."
echo "=============================================="
