import sys
from pypdf import PdfReader

for path in sys.argv[1:]:
    print(f"\n{'='*80}\nARCHIVO: {path}")
    try:
        r = PdfReader(path)
        print(f"PAGINAS: {len(r.pages)}")
        for i, p in enumerate(r.pages, 1):
            t = (p.extract_text() or "").strip()
            if t:
                print(f"\n--- pag {i} ---\n{t}")
    except Exception as e:
        print(f"ERROR: {e}")
