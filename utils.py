"""
Utility functions and helper services for Anupama Agencies FMCG Distribution Portal.

This module provides reusable helper routines for data formatting (such as Indian Rupee
currency styling), file upload sanitization and storage, CSV streaming exports with UTF-8
Byte Order Marks (BOM) for Excel compatibility, and centralized re-exports of core business
logic engines.
"""

import os
import io
import csv
import math
from datetime import datetime, date
from typing import List, Any, Optional, Set
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from flask import Response

# Supported image file extensions for godown staff portraits and fuel receipts
ALLOWED_EXTENSIONS: Set[str] = {'png', 'jpg', 'jpeg', 'webp', 'gif'}


def allowed_file(filename: str) -> bool:
    """Validates whether a filename carries an approved image file extension.

    Args:
        filename (str): The original filename provided by the client upload.

    Returns:
        bool: True if the file extension is in ALLOWED_EXTENSIONS, False otherwise.

    Examples:
        >>> allowed_file("worker_portrait.jpg")
        True
        >>> allowed_file("receipt.pdf")
        False
    """
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def save_uploaded_file(
    file_storage: Optional[FileStorage],
    target_folder: str,
    prefix: str = "upload"
) -> str:
    """Saves an uploaded multipart file securely to disk within static uploads.

    Generates a collision-resistant timestamped filename and persists the stream.

    Args:
        file_storage (Optional[FileStorage]): Werkzeug FileStorage instance from request.files.
        target_folder (str): Absolute or relative filesystem directory path.
        prefix (str, optional): Filename prefix (e.g., 'worker', 'receipt'). Defaults to 'upload'.

    Returns:
        str: Relative web URL path (e.g., 'uploads/workers/worker_20261125_120000.jpg')
            suitable for database storage and template rendering, or an empty string if omitted/invalid.
    """
    if not file_storage or file_storage.filename == '':
        return ''

    if not allowed_file(file_storage.filename):
        return ''

    os.makedirs(target_folder, exist_ok=True)
    original_ext = file_storage.filename.rsplit('.', 1)[1].lower()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    safe_name = f"{prefix}_{timestamp}.{original_ext}"
    full_path = os.path.join(target_folder, safe_name)
    file_storage.save(full_path)

    # Return relative path from 'static/'
    subfolder = os.path.basename(target_folder)
    return f"uploads/{subfolder}/{safe_name}"


def format_inr(amount: Any) -> str:
    """Formats a numeric value into the standard Indian Rupee (INR) numbering system.

    Formats amounts using Indian grouping (e.g., thousands, lakhs, crores):
    1,00,000.00 instead of international 100,000.00.

    Args:
        amount (Any): Numerical or string monetary value to format.

    Returns:
        str: Formatted currency string prefixed with ₹ (e.g., '₹1,50,000.00' or '-₹4,500.00').
            Returns '₹0.00' on invalid or None input.

    Examples:
        >>> format_inr(1500)
        '₹1,500.00'
        >>> format_inr(125000)
        '₹1,25,000.00'
        >>> format_inr(-4500)
        '-₹4,500.00'
    """
    if amount is None:
        return "₹0.00"
    try:
        val = float(amount)
        if not math.isfinite(val):
            return "₹0.00"
        is_negative = val < 0
        val = abs(val)

        parts = f"{val:.2f}".split('.')
        whole = parts[0]
        decimal = parts[1]

        if len(whole) <= 3:
            res = whole
        else:
            last3 = whole[-3:]
            rest = whole[:-3]
            chunks: List[str] = []
            while len(rest) > 2:
                chunks.insert(0, rest[-2:])
                rest = rest[:-2]
            if rest:
                chunks.insert(0, rest)
            chunks.append(last3)
            res = ",".join(chunks)

        prefix = "-₹" if is_negative else "₹"
        return f"{prefix}{res}.{decimal}"
    except (ValueError, TypeError):
        return "₹0.00"


def export_csv_response(
    filename: str,
    headers: List[str],
    rows: List[List[Any]]
) -> Response:
    """Generates an HTTP streaming response for CSV downloads with Excel UTF-8 BOM.

    Writes the UTF-8 Byte Order Mark (\\ufeff) so Microsoft Excel opens the spreadsheet
    without corrupted Unicode symbols or Rupee characters.

    Args:
        filename (str): Target filename shown in the user's browser save prompt.
        headers (List[str]): List of column header names for the top row.
        rows (List[List[Any]]): 2D list containing row records.

    Returns:
        Response: Flask Response object with attachment headers and MIME type text/csv.
    """
    output = io.StringIO()
    # Write UTF-8 BOM so Excel opens with proper encoding
    output.write('\ufeff')
    writer = csv.writer(output, lineterminator='\r\n')
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)

    csv_data = output.getvalue()
    output.close()

    response = Response(csv_data, mimetype='text/csv; charset=utf-8')
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# Re-export business logic engines and catalog for convenience
from business_logic import (
    FMCG_CATALOG,
    FEFOEngine,
    AttendanceEngine,
    KhataEngine,
    PayrollEngine,
    FleetAnalyticsEngine,
    DispatchEngine,
    DamageClaimsEngine,
    BackupEngine,
    parse_date
)
