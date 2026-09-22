#!/usr/bin/env python3
"""Crea dist/ldmcraft.html: un unico file con CSS e JavaScript incorporati,
pronto da aprire nel browser o da pubblicare."""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
index = open(os.path.join(here, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(here, 'css', 'style.css'), encoding='utf-8').read()
index = index.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '</style>')
def inline(m):
    code = open(os.path.join(here, m.group(1)), encoding='utf-8').read()
    return '<script>\n' + code + '</script>'
index = re.sub(r'<script src="(js/[^"]+)"></script>', inline, index)
os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
out = os.path.join(here, 'dist', 'ldmcraft.html')
open(out, 'w', encoding='utf-8').write(index)
print('Creato', out, f'({len(index)//1024} KB)')
