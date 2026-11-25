import os
import pytest
from generate_explanation_pdf import build_pdf


def test_pdf_generation(tmp_path):
    """
    Verifies that the PDF generator generates a valid, non-empty,
    professional technical manual in PDF format.
    """
    output_pdf = str(tmp_path / "test_explanation.pdf")
    build_pdf(output_pdf)

    # 1. Check file exists
    assert os.path.exists(output_pdf)

    # 2. Check file size is substantial (> 10 KB)
    file_size = os.path.getsize(output_pdf)
    assert file_size > 10000

    # 3. Check PDF magic bytes (%PDF-)
    with open(output_pdf, 'rb') as f:
        header = f.read(5)
        assert header == b'%PDF-'
