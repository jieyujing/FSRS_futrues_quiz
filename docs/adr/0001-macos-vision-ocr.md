# macOS Vision OCR for PDF Extraction

To extract text from encrypted and image-based PDF question banks without adding Python library dependencies (such as `pycryptodome`), we decided to use a native Swift script leveraging macOS's built-in Vision framework when running on Darwin.

This avoids external Python library installation errors while enabling high-accuracy offline Chinese/English OCR and decryption natively on macOS, falling back to PyPDF2 on other platforms.
