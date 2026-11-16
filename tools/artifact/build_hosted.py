"""Build the hosted (claude.ai artifact) copy of the app: libraries from cdnjs, fonts from Google Fonts.
Usage: python3 tools/artifact/build_hosted.py OUTDIR"""
import os, re, shutil, sys
SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'app'); OUT = sys.argv[1]
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
for d in ('js', 'demo', 'img'): shutil.copytree(os.path.join(SRC, d), os.path.join(OUT, d))
shutil.copytree(os.path.join(SRC, 'vendor', 'logos'), os.path.join(OUT, 'vendor', 'logos'))
shutil.copytree(os.path.join(SRC, 'vendor', 'ocr'), os.path.join(OUT, 'vendor', 'ocr'))
os.remove(os.path.join(OUT, 'demo', 'demo-mpesa-statement.pdf'))  # hosts may refuse embedded PDFs
s = open(os.path.join(SRC, 'index.html')).read()
s = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '''<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Roboto:wght@400;500&family=Besley:ital,wght@0,400..900;1,400..900&display=swap">
<script>window.PD_PDFJS_LIB='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';window.PD_PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';</script>''', s)
s = s.replace('<script src="vendor/d3.min.js" defer></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js" defer></script>')
s = s.replace('The page loads only its own files: fonts, a chart library, a PDF reader and, if you attach screenshots, a text reader, all served from the same place.', 'This hosted copy loads two open-source libraries (d3 for charts, pdf.js for statements) from cdnjs and its fonts from Google Fonts. Those requests carry none of your data. The screenshot text reader is served from this page itself. The GitHub version serves every file itself.')
s = s.replace('No upload, no sign-up.</p>', 'No upload, no sign-up. In this hosted view, downloads may be blocked; CSV exports are also copied so you can paste them.</p>', 1)
open(os.path.join(OUT, 'index.html'), 'w').write(s)
css = open(os.path.join(SRC, 'pesadithi.css')).read()
open(os.path.join(OUT, 'pesadithi.css'), 'w').write('\n'.join(l for l in css.split('\n') if not l.startswith('@font-face')))
print('built', OUT)
