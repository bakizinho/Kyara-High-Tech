#!/data/data/com.termux/files/usr/bin/bash

echo "=============================================="
echo "     KYARA — TESTE DE COMPATIBILIDADE TTS"
echo "=============================================="
echo

echo "[1] Arquitetura"
uname -m
echo

echo "[2] Python"
python3 --version
echo

echo "[3] Pip"
python3 -m pip --version
echo

echo "[4] Verificando pacotes possíveis"
python3 -m pip index versions onnxruntime 2>&1 | head -n 15
echo

echo "[5] Verificando onnxruntime"
python3 - <<'PY'
try:
    import onnxruntime
    print("✅ onnxruntime já está instalado.")
    print("Versão:", onnxruntime.__version__)
except Exception as e:
    print("❌ onnxruntime não está instalado.")
    print("Detalhe:", e)
PY

echo

echo "[6] Verificando pacote kokoro"
python3 -m pip index versions kokoro 2>&1 | head -n 15
echo

echo "[7] Verificando espaço"
df -h "$HOME"
echo

echo "[8] Verificando memória"
free -h
echo

echo "=============================================="
echo "              RESULTADO"
echo "=============================================="
echo
echo "Não instalamos nada neste teste."
echo "Nenhum arquivo do bot foi alterado."
echo
echo "Envie toda a saída acima."
echo
