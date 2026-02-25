import sys
try:
    import pypdf
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "--quiet"])
    import pypdf

reader = pypdf.PdfReader(sys.argv[1])
text = ""
for page in reader.pages:
    extracted = page.extract_text()
    if extracted:
        text += extracted + "\n"

with open("pdf_extracted_text.txt", "w", encoding="utf-8") as f:
    f.write(text)
print("Extracted successfully.")
