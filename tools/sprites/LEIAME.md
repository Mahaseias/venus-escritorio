# Conversão dos sprites (Gemini → escritório)

1. Coloque as folhas geradas (fundo verde #00FF00) em `tools/sprites/in/<id>.jpg` (ex.: `livia.jpg`).
2. `python3 detect.py` numera os quadros (`ann_*.png`) e `python3 process.py` gera prévias reduzidas (`prev_*.png`).
3. Ajuste o mapa de poses em `hires.py` (`P`) e rode `python3 hires.py` (gera o atlas em alta resolução; `build.py` é a versão antiga, de baixa resolução).
4. Copie `sprites.png` e `sprites.json` para `public/`.

Requer Python 3 com Pillow, NumPy e SciPy.
