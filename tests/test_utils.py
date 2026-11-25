import pytest
from io import BytesIO
from werkzeug.datastructures import FileStorage
from utils import (
    format_inr, allowed_file,
    save_uploaded_file, export_csv_response
)


def test_format_inr_positive():
    """Test standard Indian Rupee formatting for positive numbers."""
    assert format_inr(0) == "₹0.00"
    assert format_inr(500) == "₹500.00"
    assert format_inr(1500) == "₹1,500.00"
    assert format_inr(25000) == "₹25,000.00"
    assert format_inr(125000) == "₹1,25,000.00"
    assert format_inr(10000000) == "₹1,00,00,000.00"


def test_format_inr_negative():
    """Test INR formatting for negative values."""
    formatted = format_inr(-4500)
    assert formatted == "-₹4,500.00"


def test_format_inr_edge_cases():
    """Test format_inr with None, string, or invalid inputs."""
    assert format_inr(None) == "₹0.00"
    assert format_inr("not-a-number") == "₹0.00"
    assert format_inr("1234.50") == "₹1,234.50"


def test_allowed_file():
    """Test file upload extension allowlist."""
    assert allowed_file("photo.jpg") is True
    assert allowed_file("receipt.PNG") is True
    assert allowed_file("document.webp") is True
    assert allowed_file("script.py") is False
    assert allowed_file("malicious.exe") is False
    assert allowed_file("no_extension") is False


def test_save_uploaded_file_empty(tmp_path):
    """Test save_uploaded_file with empty or missing file."""
    assert save_uploaded_file(None, str(tmp_path)) == ''
    
    empty_file = FileStorage(stream=BytesIO(b""), filename="")
    assert save_uploaded_file(empty_file, str(tmp_path)) == ''


def test_save_uploaded_file_valid(tmp_path):
    """Test save_uploaded_file with valid image upload."""
    sample_img = FileStorage(
        stream=BytesIO(b"dummy-image-bytes"),
        filename="test_receipt.jpg"
    )
    res = save_uploaded_file(sample_img, str(tmp_path), prefix="receipt")
    assert res.startswith("uploads/")
    assert "receipt_" in res


def test_export_csv_response():
    """Test CSV response generation with UTF-8 BOM."""
    headers = ["ID", "Name", "Amount"]
    rows = [
        [1, "Everest Spices", 15000],
        [2, "Colgate-Palmolive", 22000]
    ]
    response = export_csv_response("test_export.csv", headers, rows)
    assert response.status_code == 200
    assert "attachment; filename=\"test_export.csv\"" in response.headers["Content-Disposition"]
    
    data = response.get_data()
    # Check UTF-8 BOM
    assert data.startswith(b'\xef\xbb\xbf')
    assert b"Everest Spices" in data
    assert b"Colgate-Palmolive" in data
