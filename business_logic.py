"""
Anupama Agencies — FMCG Distributor Management Portal
Central Business Logic & Data Processing Engine

This module encapsulates all core distribution domain calculations, FEFO prioritization,
attendance muster aggregations, advance khata reconciliations, wage settlements,
fleet fuel analytics, dispatch safety validations, and damage return valuations.

Author: Anupama Agencies Engineering Team
Distribution Scope: Everest Spices & Colgate-Palmolive (Authorized Regional Depot)
"""

from datetime import datetime, date, timedelta
from calendar import monthrange
from typing import Dict, List, Optional, Union, Any, Tuple
import json
import re

# -------------------------------------------------------------------
# FMCG PRODUCT CATALOG (Everest Spices & Colgate-Palmolive)
# -------------------------------------------------------------------
FMCG_CATALOG: Dict[str, List[str]] = {
    'Everest Spices': [
        'Everest Garam Masala 100g',
        'Everest Kashmiri Mirch Powder 100g',
        'Everest Kitchen King Masala 100g',
        'Everest Chhole Masala 100g',
        'Everest Pav Bhaji Masala 100g',
        'Everest Chaat Masala 100g',
        'Everest Chicken Masala 100g',
        'Everest Turmeric Powder 200g',
        'Everest Coriander Powder 200g',
        'Everest Cumin Seeds (Jeera) 100g',
        'Everest Sambhar Masala 100g',
        'Everest Meat Masala 100g'
    ],
    'Colgate-Palmolive': [
        'Colgate MaxFresh Blue Gel 150g',
        'Colgate MaxFresh Red Peppermint 150g',
        'Colgate Strong Teeth Dental Cream 200g',
        'Colgate Strong Teeth Dental Cream 100g',
        'Colgate Vedshakti Ayurvedic Herbal 100g',
        'Colgate Total Active Health 120g',
        'Colgate ZigZag Charcoal Toothbrush (Pack of 6)',
        'Colgate Super Flexi Toothbrush (Medium)'
    ]
}


def get_val(obj: Any, key: str, default: Any = None) -> Any:
    """Safely retrieves a dictionary key or an object attribute with fallback.

    Avoids returning the default when obj is a dict that explicitly contains
    the key with a falsy but non-None value.

    Args:
        obj: A dictionary or class instance (e.g., SQLAlchemy model instance).
        key: The attribute or dictionary key name to retrieve.
        default: Fallback value if the key or attribute does not exist or is None.

    Returns:
        Any: The resolved value from obj or the specified default fallback.
    """
    if isinstance(obj, dict):
        val = obj.get(key)
        return val if val is not None else default
    val = getattr(obj, key, None)
    return val if val is not None else default


def parse_date(date_val: Union[datetime, date, str]) -> date:
    """Parses a date input from datetime, date, or formatted date string.

    Supports standard ISO 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', and 'YYYY/MM/DD'.

    Args:
        date_val: Date representation as date object, datetime instance, or string.

    Returns:
        date: Standardized Python datetime.date instance.

    Raises:
        ValueError: If date_val is None or cannot be parsed into any recognized format.
    """
    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val
    if isinstance(date_val, str):
        clean_str = date_val.strip()
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d'):
            try:
                return datetime.strptime(clean_str, fmt).date()
            except ValueError:
                continue
    raise ValueError(f"Unable to parse date: {date_val}")


# -------------------------------------------------------------------
# 1. FEFO (FIRST-EXPIRY-FIRST-OUT) & STOCK BATCH ENGINE
# -------------------------------------------------------------------
class FEFOEngine:
    """Warehouse First-Expiry-First-Out prioritization and crate verification engine.

    Handles shelf-life percentage calculations, expiration warning thresholds,
    crate barcode/QR encoding, and dispatch eligibility rules.
    """
    EXPIRY_NEAR_DAYS_THRESHOLD: int = 60

    @classmethod
    def calculate_expiry_info(
        cls,
        exp_date_val: Union[date, str, datetime],
        mfg_date_val: Optional[Union[date, str, datetime]] = None,
        ref_date: Optional[Union[date, str, datetime]] = None
    ) -> Dict[str, Any]:
        """Determines days remaining, FEFO status tier, shelf-life percentage, and action.

        Classification Tiers:
        - 'expired' (days <= 0): Quarantine immediately. Do not dispatch.
        - 'near_expiry' (1-60 days): Urgent priority delivery beat dispatch.
        - 'safe' (> 60 days): Standard godown storage. Safe for stock rotation.

        Args:
            exp_date_val: Expiration date of the FMCG inventory batch.
            mfg_date_val: Optional manufacturing date used for total shelf-life ratio.
            ref_date: Optional reference evaluation date (defaults to today).

        Returns:
            Dict[str, Any]: Dictionary containing days_left, status, status_label,
                badge_class, description, action, shelf_life_percent, and is_dispatchable.
        """
        today = parse_date(ref_date) if ref_date else date.today()
        exp = parse_date(exp_date_val)
        diff_days = (exp - today).days

        if diff_days <= 0:
            status = 'expired'
            badge_class = 'text-rose-700 bg-rose-50 border-rose-200'
            label = f"EXPIRED ({abs(diff_days)} days ago)"
            status_desc = "Quarantine immediately. Do not dispatch to market."
            action = "quarantine"
        elif diff_days <= cls.EXPIRY_NEAR_DAYS_THRESHOLD:
            status = 'near_expiry'
            badge_class = 'text-amber-700 bg-amber-50 border-amber-200'
            label = f"NEAR EXPIRY ({diff_days} days left)"
            status_desc = "FEFO Priority: High velocity dispatch recommended."
            action = "priority_dispatch"
        else:
            status = 'safe'
            badge_class = 'text-emerald-700 bg-emerald-50 border-emerald-200'
            label = f"SAFE ({diff_days} days left)"
            status_desc = "Standard godown storage. Safe for delivery beats."
            action = "standard"

        # Shelf life percentage computation if MFG date is supplied
        shelf_life_pct = 100
        if mfg_date_val:
            try:
                mfg = parse_date(mfg_date_val)
                total_shelf_days = (exp - mfg).days
                if total_shelf_days > 0:
                    remaining_days = max(0, (exp - today).days)
                    ratio = (remaining_days / total_shelf_days) * 100
                    shelf_life_pct = max(0, min(100, round(ratio, 1)))
            except Exception:
                shelf_life_pct = 100 if status == 'safe' else (30 if status == 'near_expiry' else 0)

        return {
            'days_left': diff_days,
            'status': status,
            'status_label': label,
            'badge_class': badge_class,
            'description': status_desc,
            'action': action,
            'shelf_life_percent': shelf_life_pct,
            'is_dispatchable': status != 'expired'
        }

    @classmethod
    def rank_batches_fefo(
        cls,
        batches: List[Dict[str, Any]],
        ref_date: Optional[Union[date, str, datetime]] = None
    ) -> List[Dict[str, Any]]:
        """Ranks warehouse stock batches strictly by FEFO velocity sequence.

        Priority Order:
        1. Near-expiry batches first (ascending days left - earliest expiration first)
        2. Safe batches next (ascending days left)
        3. Expired batches at the end (blocked quarantine items)

        Args:
            batches: List of raw stock batch dictionaries with expiry/mfg fields.
            ref_date: Optional reference evaluation date.

        Returns:
            List[Dict[str, Any]]: Enriched list of batches sorted by dispatch urgency.
        """
        today = parse_date(ref_date) if ref_date else date.today()
        enriched = []
        for b in batches:
            info = cls.calculate_expiry_info(
                b.get('exp') or b.get('expiry_date'),
                b.get('mfg') or b.get('mfg_date'),
                today
            )
            item = dict(b)
            item['fefo_info'] = info
            enriched.append(item)

        def fefo_sort_key(item: Dict[str, Any]) -> Tuple[int, int]:
            info = item['fefo_info']
            if info['status'] == 'near_expiry':
                return (1, info['days_left'])
            elif info['status'] == 'safe':
                return (2, info['days_left'])
            else:
                return (3, info['days_left'])

        return sorted(enriched, key=fefo_sort_key)

    @classmethod
    def generate_batch_qr_payload(cls, batch_data: Dict[str, Any]) -> str:
        """Encodes an inventory crate QR validation payload string into compact JSON.

        Args:
            batch_data: Dictionary containing brand, product, batch, mfg, exp, qty.

        Returns:
            str: Compact JSON string formatted for QR code generation.
        """
        payload = {
            'id': batch_data.get('id', 1),
            'brand': batch_data.get('brand', 'Everest Spices'),
            'product': batch_data.get('product', ''),
            'batch': batch_data.get('batch', '').strip().upper(),
            'mfg': str(batch_data.get('mfg', '')),
            'exp': str(batch_data.get('exp', '')),
            'qty': int(batch_data.get('qty', 0)),
            'status': batch_data.get('status', 'Active')
        }
        return json.dumps(payload, separators=(',', ':'))

    @classmethod
    def decode_and_verify_qr_payload(
        cls,
        qr_string: str,
        ref_date: Optional[Union[date, str, datetime]] = None
    ) -> Dict[str, Any]:
        """Parses and validates scanned crate QR code JSON payloads.

        Args:
            qr_string: The raw payload scanned from physical crate barcode/QR code.
            ref_date: Optional reference evaluation date for expiry status.

        Returns:
            Dict[str, Any]: Validation result card with valid flag, batch details,
                and parsed FEFO health analysis.
        """
        try:
            data = json.loads(qr_string)
        except Exception as e:
            return {'valid': False, 'error': f"Invalid JSON payload: {str(e)}"}

        required_keys = ('brand', 'product', 'batch', 'mfg', 'exp', 'qty')
        for k in required_keys:
            if k not in data:
                return {'valid': False, 'error': f"Missing required payload key: '{k}'"}

        exp_info = cls.calculate_expiry_info(data['exp'], data.get('mfg'), ref_date)
        return {
            'valid': True,
            'brand': data.get('brand'),
            'product': data.get('product'),
            'batch': data.get('batch'),
            'mfg': data.get('mfg'),
            'exp': data.get('exp'),
            'qty': int(data.get('qty', 0)),
            'fefo_info': exp_info
        }


# -------------------------------------------------------------------
# 2. ATTENDANCE & MUSTER ROLL ENGINE
# -------------------------------------------------------------------
class AttendanceEngine:
    """Godown and field staff attendance, muster roll, and payable days engine.

    Calculates effective daily working credits, muster completion percentages,
    and 2D calendar matrices for monthly payroll audits.
    """

    @classmethod
    def calculate_worker_summary(cls, records: List[Any]) -> Dict[str, Any]:
        """Aggregates attendance records for a worker into effective payable credits.

        Credit Rules:
        - 'Present': 1.0 day
        - 'Paid Leave': 1.0 day
        - 'Half Day': 0.5 day
        - 'Absent': 0.0 day

        Args:
            records: Collection of Attendance model instances or status dicts.

        Returns:
            Dict[str, Any]: Summary containing present_count, half_day_count,
                paid_leave_count, absent_count, effective_days, total_logged,
                and attendance_rate percentage.
        """
        present_count = 0
        half_day_count = 0
        paid_leave_count = 0
        absent_count = 0

        for r in records:
            status = getattr(r, 'status', None) or (r.get('status') if isinstance(r, dict) else str(r))
            if status == 'Present':
                present_count += 1
            elif status == 'Paid Leave':
                paid_leave_count += 1
            elif status == 'Half Day':
                half_day_count += 1
            elif status == 'Absent':
                absent_count += 1

        effective_days = float(present_count + paid_leave_count + (0.5 * half_day_count))
        total_logged = present_count + half_day_count + paid_leave_count + absent_count
        attendance_rate = round((effective_days / total_logged * 100), 1) if total_logged > 0 else 0.0

        return {
            'present_count': present_count,
            'half_day_count': half_day_count,
            'paid_leave_count': paid_leave_count,
            'absent_count': absent_count,
            'effective_days': effective_days,
            'total_logged': total_logged,
            'attendance_rate': attendance_rate
        }

    @classmethod
    def build_monthly_muster_grid(
        cls,
        workers: List[Any],
        attendances: List[Any],
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """Constructs the full 2D muster roll matrix for all active workers.

        Maps each day of the specified calendar month (1..N) to the worker's
        recorded status ('Present', 'Absent', 'Half Day', 'Paid Leave', or '-').

        Args:
            workers: List of Worker model instances or worker dictionaries.
            attendances: List of Attendance records for the calendar month.
            year: Calendar year (e.g., 2026).
            month: Calendar month (1..12).

        Returns:
            Dict[str, Any]: Muster grid structure with year, month, num_days,
                days list, and row records with daily status arrays.
        """
        num_days = monthrange(year, month)[1]
        days = list(range(1, num_days + 1))

        # Index attendances by (worker_id, day)
        att_map = {}
        for a in attendances:
            w_id = getattr(a, 'worker_id', None) or (a.get('worker_id') if isinstance(a, dict) else None)
            d_val = getattr(a, 'date', None) or (a.get('date') if isinstance(a, dict) else None)
            if w_id and d_val:
                try:
                    d_obj = parse_date(d_val)
                    if d_obj.year == year and d_obj.month == month:
                        att_map[(w_id, d_obj.day)] = getattr(a, 'status', None) or (a.get('status') if isinstance(a, dict) else None)
                except Exception:
                    pass

        rows = []
        for w in workers:
            w_id = getattr(w, 'id', None) or (w.get('id') if isinstance(w, dict) else None)
            w_name = getattr(w, 'name', None) or (w.get('name') if isinstance(w, dict) else '')
            w_role = getattr(w, 'role', None) or (w.get('role') if isinstance(w, dict) else '')

            daily_statuses = []
            worker_records = []
            for d in days:
                st = att_map.get((w_id, d), '-')
                daily_statuses.append(st)
                if st != '-':
                    worker_records.append({'status': st})

            stats = cls.calculate_worker_summary(worker_records)
            rows.append({
                'worker_id': w_id,
                'worker_name': w_name,
                'worker_role': w_role,
                'statuses': daily_statuses,
                'summary': stats
            })

        return {
            'year': year,
            'month': month,
            'num_days': num_days,
            'days': days,
            'rows': rows
        }

    @classmethod
    def get_daily_snapshot(
        cls,
        attendances: List[Any],
        total_active_workers: int,
        target_date: Optional[Union[date, str, datetime]] = None
    ) -> Dict[str, Any]:
        """Calculates a high-level attendance KPI snapshot for a single date.

        Args:
            attendances: List of attendance records.
            total_active_workers: Total count of active staff on the roster.
            target_date: Date to evaluate (defaults to today).

        Returns:
            Dict[str, Any]: Snapshot containing present_count, half_day_count,
                absent_count, total_active, and muster_percent.
        """
        d_target = parse_date(target_date) if target_date else date.today()
        today_records = []
        for a in attendances:
            d_val = getattr(a, 'date', None) or (a.get('date') if isinstance(a, dict) else None)
            if d_val and parse_date(d_val) == d_target:
                today_records.append(a)

        stats = cls.calculate_worker_summary(today_records)
        present_active = stats['present_count'] + stats['paid_leave_count']
        ratio = round((present_active / total_active_workers * 100), 1) if total_active_workers > 0 else 0.0

        return {
            'date': str(d_target),
            'present_count': present_active,
            'half_day_count': stats['half_day_count'],
            'absent_count': stats['absent_count'],
            'total_active': total_active_workers,
            'muster_percent': ratio
        }


# -------------------------------------------------------------------
# 3. STAFF ADVANCE KHATA & RECOVERY ENGINE
# -------------------------------------------------------------------
class KhataEngine:
    """Worker advance loan ledger, balance tracking, and recovery engine.

    Reconciles approved advances against monthly payroll settlements to maintain
    accurate per-worker debit/credit running balances.
    """

    @classmethod
    def get_pending_advances_total(
        cls,
        advances: List[Any],
        worker_id: Optional[int] = None
    ) -> float:
        """Sums all approved, unrecovered advance khata loans.

        Args:
            advances: List of Advance model instances or dictionaries.
            worker_id: Optional worker identifier to filter the calculation.

        Returns:
            float: Total pending advance loan sum rounded to 2 decimal places.
        """
        total = 0.0
        for a in advances:
            w_id = getattr(a, 'worker_id', None) or (a.get('worker_id') if isinstance(a, dict) else None)
            st = getattr(a, 'status', None) or (a.get('status') if isinstance(a, dict) else None)
            amt = getattr(a, 'amount_paid', None) or (a.get('amount_paid') if isinstance(a, dict) else 0)

            if worker_id is not None and w_id != worker_id:
                continue
            if st == 'Approved':
                total += float(amt or 0)

        return round(total, 2)

    @classmethod
    def get_total_advances_history(
        cls,
        advances: List[Any],
        worker_id: Optional[int] = None
    ) -> float:
        """Calculates historical gross advances issued (Approved + Settled).

        Args:
            advances: List of Advance model instances or dictionaries.
            worker_id: Optional worker identifier filter.

        Returns:
            float: Cumulative historical advance disbursements.
        """
        total = 0.0
        for a in advances:
            w_id = getattr(a, 'worker_id', None) or (a.get('worker_id') if isinstance(a, dict) else None)
            st = getattr(a, 'status', None) or (a.get('status') if isinstance(a, dict) else None)
            amt = getattr(a, 'amount_paid', None) or (a.get('amount_paid') if isinstance(a, dict) else 0)

            if worker_id is not None and w_id != worker_id:
                continue
            if st in ('Approved', 'Settled'):
                total += float(amt or 0)

        return round(total, 2)

    @classmethod
    def build_worker_khata_ledger(
        cls,
        worker: Any,
        advances: List[Any],
        settlements: List[Any]
    ) -> Dict[str, Any]:
        """Builds a running chronological ledger statement for staff khata audits.

        Interleaves advance debits and salary deduction credits in order of date.

        Args:
            worker: Worker model instance or worker dictionary.
            advances: Collection of advance loan records.
            settlements: Collection of payroll salary settlement records.

        Returns:
            Dict[str, Any]: Ledger containing worker_id, entries list with running
                balance at each step, and final current_pending_balance.
        """
        w_id = getattr(worker, 'id', None) or (worker.get('id') if isinstance(worker, dict) else None)
        entries = []

        # Debit: Advances issued
        for a in advances:
            a_wid = getattr(a, 'worker_id', None) or (a.get('worker_id') if isinstance(a, dict) else None)
            if a_wid == w_id:
                entries.append({
                    'date': str(getattr(a, 'payment_date', None) or a.get('payment_date', '')),
                    'type': 'DEBIT_ADVANCE',
                    'description': f"Advance issued ({getattr(a, 'payment_mode', None) or a.get('payment_mode', 'Cash')})",
                    'amount': float(getattr(a, 'amount_paid', 0) or a.get('amount_paid', 0)),
                    'status': getattr(a, 'status', None) or a.get('status', 'Approved')
                })

        # Credit: Recoveries through payroll settlement
        for s in settlements:
            s_wid = getattr(s, 'worker_id', None) or (s.get('worker_id') if isinstance(s, dict) else None)
            if s_wid == w_id:
                ded_amt = float(getattr(s, 'advance_deduction', 0) or s.get('advance_deduction', 0))
                if ded_amt > 0:
                    entries.append({
                        'date': str(getattr(s, 'settlement_date', None) or s.get('settlement_date', '')),
                        'type': 'CREDIT_RECOVERY',
                        'description': f"Payroll deduction for {getattr(s, 'month', '')}/{getattr(s, 'year', '')}",
                        'amount': ded_amt,
                        'status': 'Settled'
                    })

        entries.sort(key=lambda x: x['date'])
        running_balance = 0.0
        for e in entries:
            if e['type'] == 'DEBIT_ADVANCE' and e['status'] == 'Approved':
                running_balance += e['amount']
            elif e['type'] == 'CREDIT_RECOVERY':
                running_balance = max(0.0, running_balance - e['amount'])
            e['running_balance'] = round(running_balance, 2)

        return {
            'worker_id': w_id,
            'entries': entries,
            'current_pending_balance': round(running_balance, 2)
        }


# -------------------------------------------------------------------
# 4. SALARY SETTLEMENT & PAYROLL ENGINE
# -------------------------------------------------------------------
class PayrollEngine:
    """Monthly payroll computation, advance clawback, and voucher generator.

    Calculates earned gross wages for daily wage loaders or monthly salaried
    drivers, subtracts outstanding advance balances, and produces net payouts.
    """

    @classmethod
    def calculate_settlement(
        cls,
        worker: Any,
        effective_days: float,
        days_in_month: int = 30,
        pending_advance: float = 0.0
    ) -> Dict[str, Any]:
        """Calculates earned gross wages, advance recovery, and net payable wages.

        Args:
            worker: Worker model instance or dictionary with wage details.
            effective_days: Total verified payable days worked in the month.
            days_in_month: Days in the settlement month (default: 30).
            pending_advance: Total outstanding unrecovered advance balance.

        Returns:
            Dict[str, Any]: Detailed wage calculation dictionary including gross_earned,
                advance_deduction, net_payable, and remaining_advance.
        """
        daily_rate = float(getattr(worker, 'daily_wage', 0) or (worker.get('daily_wage', 0) if isinstance(worker, dict) else 0))
        monthly_fixed = float(getattr(worker, 'monthly_fixed_salary', 0) or (worker.get('monthly_fixed_salary', 0) if isinstance(worker, dict) else 0))
        role = getattr(worker, 'role', '') or (worker.get('role', '') if isinstance(worker, dict) else '')

        if monthly_fixed > 0:
            rate_per_day = monthly_fixed / float(days_in_month) if days_in_month > 0 else 0
            gross_earned = rate_per_day * float(effective_days)
            wage_type = 'Monthly'
        else:
            gross_earned = daily_rate * float(effective_days)
            wage_type = 'Daily'

        gross_earned = round(gross_earned, 2)
        advance_deduction = min(float(pending_advance), gross_earned)
        net_payable = max(0.0, gross_earned - advance_deduction)

        return {
            'wage_type': wage_type,
            'daily_wage': daily_rate,
            'monthly_fixed_salary': monthly_fixed,
            'effective_days': float(effective_days),
            'gross_earned': gross_earned,
            'pending_advance': round(float(pending_advance), 2),
            'advance_deduction': round(advance_deduction, 2),
            'net_payable': round(net_payable, 2),
            'remaining_advance': round(max(0.0, float(pending_advance) - advance_deduction), 2)
        }

    @classmethod
    def generate_voucher_data(
        cls,
        settlement: Any,
        worker: Any,
        voucher_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """Formats a printable official wage payment voucher payload.

        Args:
            settlement: SalarySettlement model instance or dictionary.
            worker: Associated Worker model instance or dictionary.
            voucher_number: Optional explicit voucher serial code.

        Returns:
            Dict[str, Any]: Formatted payment voucher dictionary.
        """
        w_id = getattr(worker, 'id', None) or (worker.get('id') if isinstance(worker, dict) else None)
        w_name = getattr(worker, 'name', None) or (worker.get('name') if isinstance(worker, dict) else 'Worker')
        w_role = getattr(worker, 'role', None) or (worker.get('role') if isinstance(worker, dict) else '')

        v_no = voucher_number or f"VCH-{w_id:03d}-{datetime.now().strftime('%y%m%d%H%M')}"

        gross = float(getattr(settlement, 'gross_earnings', 0) or settlement.get('gross_earnings', 0))
        ded = float(getattr(settlement, 'advance_deduction', 0) or settlement.get('advance_deduction', 0))
        net = float(getattr(settlement, 'net_payable', 0) or settlement.get('net_payable', 0))
        days = float(getattr(settlement, 'total_days_worked', 0) or settlement.get('total_days_worked', 0))
        mode = getattr(settlement, 'payment_mode', 'Cash') or settlement.get('payment_mode', 'Cash')

        return {
            'voucher_number': v_no,
            'worker_id': w_id,
            'worker_name': w_name,
            'worker_role': w_role,
            'total_days_worked': days,
            'gross_earnings': gross,
            'advance_deduction': ded,
            'net_payable': net,
            'payment_mode': mode,
            'settlement_date': str(date.today()),
            'company': 'Anupama Agencies — FMCG Distributor (Everest & Colgate)'
        }


# -------------------------------------------------------------------
# 5. VEHICLE FLEET & FUEL ANALYTICS ENGINE
# -------------------------------------------------------------------
class FleetAnalyticsEngine:
    """Delivery vehicle fleet fuel efficiency, consumption, and cost trend engine.

    Computes monthly spend per fuel type (Diesel, Petrol, CNG), month-over-month
    variances, and multi-month historical series for Chart.js dashboard widgets.
    """

    @classmethod
    def calculate_monthly_fuel_stats(
        cls,
        fuel_expenses: List[Any],
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """Aggregates fuel expenditures and consumption volume for a calendar month.

        Args:
            fuel_expenses: List of FuelExpense records.
            year: Calendar year (e.g., 2026).
            month: Calendar month (1..12).

        Returns:
            Dict[str, Any]: Aggregation including total_spent, total_liters,
                avg_cost_per_liter, and breakdown by fuel type.
        """
        total_spent = 0.0
        total_liters = 0.0
        by_type = {'Diesel': 0.0, 'Petrol': 0.0, 'CNG': 0.0}

        for f in fuel_expenses:
            d_val = getattr(f, 'date', None) or (f.get('date') if isinstance(f, dict) else None)
            if not d_val:
                continue
            d_obj = parse_date(d_val)
            if d_obj.year == year and d_obj.month == month:
                amt = float(get_val(f, 'amount_spent', 0))
                lts = float(get_val(f, 'liters', 0))
                ft = str(get_val(f, 'fuel_type', 'Diesel'))

                total_spent += amt
                total_liters += lts
                if ft in by_type:
                    by_type[ft] += amt
                else:
                    by_type[ft] = amt

        avg_cost_per_liter = round((total_spent / total_liters), 2) if total_liters > 0 else 0.0

        return {
            'year': year,
            'month': month,
            'total_spent': round(total_spent, 2),
            'total_liters': round(total_liters, 2),
            'avg_cost_per_liter': avg_cost_per_liter,
            'by_fuel_type': {k: round(v, 2) for k, v in by_type.items()}
        }

    @classmethod
    def calculate_mom_fuel_trend(
        cls,
        cur_spent: float,
        prev_spent: float
    ) -> Dict[str, Any]:
        """Computes month-over-month fuel expenditure variance percentage.

        Args:
            cur_spent: Total fuel expenditure in current evaluation month.
            prev_spent: Total fuel expenditure in prior month.

        Returns:
            Dict[str, Any]: Trend variance dictionary with diff_amount,
                diff_percent, and is_increase indicator.
        """
        cur = float(cur_spent or 0)
        prev = float(prev_spent or 0)
        diff = cur - prev
        pct = round(((diff / prev) * 100), 1) if prev > 0 else 0.0
        return {
            'cur_spent': cur,
            'prev_spent': prev,
            'diff_amount': round(diff, 2),
            'diff_percent': pct,
            'is_increase': diff > 0
        }

    @classmethod
    def generate_fuel_chart_data(
        cls,
        fuel_expenses: List[Any],
        num_months: int = 6,
        end_date: Optional[Union[date, str, datetime]] = None
    ) -> Dict[str, Any]:
        """Generates historical fuel cost time-series for Chart.js line charts.

        Args:
            fuel_expenses: List of all fuel records.
            num_months: Number of past calendar months to compile (default: 6).
            end_date: Reference ending date (defaults to today).

        Returns:
            Dict[str, Any]: Chart dataset dictionary with labels, actual_spent,
                budget_baseline, and average_monthly_spent.
        """
        ref = parse_date(end_date) if end_date else date.today()
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        labels = []
        actuals = []

        cur_y = ref.year
        cur_m = ref.month

        for i in range(num_months - 1, -1, -1):
            target_m = cur_m - i
            target_y = cur_y
            while target_m <= 0:
                target_m += 12
                target_y -= 1

            lbl = f"{month_names[target_m - 1]} {target_y}"
            labels.append(lbl)

            stats = cls.calculate_monthly_fuel_stats(fuel_expenses, target_y, target_m)
            actuals.append(stats['total_spent'])

        avg_fuel = round(sum(actuals) / len(actuals), 2) if actuals else 25000.0
        baseline = avg_fuel if avg_fuel > 0 else 25000.0
        budget_baseline = [baseline] * len(labels)

        return {
            'labels': labels,
            'actual_spent': actuals,
            'budget_baseline': budget_baseline,
            'average_monthly_spent': avg_fuel
        }


# -------------------------------------------------------------------
# 6. BEAT DISPATCH SAFETY & CAPACITY ENGINE
# -------------------------------------------------------------------
class DispatchEngine:
    """Beat dispatch route conflict detection and cargo volume engine.

    Enforces fleet route locking to prevent double-booking or deleting vehicles
    currently on active dispatched beats, and sums Everest crate/Colgate carton dispatches.
    """

    @classmethod
    def check_vehicle_dispatch_availability(
        cls,
        vehicle_id: Union[int, str],
        dispatch_beats: List[Any]
    ) -> Dict[str, Any]:
        """Safeguard: Verifies if a vehicle is currently locked to a live dispatch route.

        Args:
            vehicle_id: Unique ID of the vehicle to check.
            dispatch_beats: List of all dispatch beat records.

        Returns:
            Dict[str, Any]: Availability card with is_available boolean, active_beat,
                beat_name, and descriptive user guidance message.
        """
        v_id = int(vehicle_id)
        for b in dispatch_beats:
            b_vid = getattr(b, 'vehicle_id', None) or (b.get('vehicle_id') if isinstance(b, dict) else None)
            st = getattr(b, 'status', '') or (b.get('status', '') if isinstance(b, dict) else '')

            if b_vid == v_id and st.lower() == 'dispatched':
                beat_name = getattr(b, 'beat_name', '') or (b.get('beat_name', '') if isinstance(b, dict) else 'Active Beat')
                return {
                    'is_available': False,
                    'active_beat': b,
                    'beat_name': beat_name,
                    'message': f"Cannot modify or remove vehicle: Currently on dispatched route '{beat_name}'."
                }

        return {
            'is_available': True,
            'active_beat': None,
            'beat_name': '',
            'message': "Vehicle is available for new route assignment."
        }

    @classmethod
    def calculate_daily_dispatch_metrics(
        cls,
        dispatch_beats: List[Any],
        target_date: Optional[Union[date, str, datetime]] = None
    ) -> Dict[str, Any]:
        """Sums cargo volumes (Everest crates & Colgate cartons) dispatched on target date.

        Args:
            dispatch_beats: List of all dispatch beat records.
            target_date: Date to calculate cargo volumes for (defaults to today).

        Returns:
            Dict[str, Any]: Metrics including total_everest_crates, total_colgate_cartons,
                active_beats_count, completed_beats_count, and total_dispatches.
        """
        d_target = parse_date(target_date) if target_date else date.today()

        total_everest = 0
        total_colgate = 0
        active_beats = 0
        completed_beats = 0

        for b in dispatch_beats:
            d_val = getattr(b, 'dispatch_date', None) or (b.get('dispatch_date') if isinstance(b, dict) else None)
            if not d_val or parse_date(d_val) != d_target:
                continue

            ev = int(get_val(b, 'crates_everest', 0))
            cg = int(get_val(b, 'cartons_colgate', 0))
            st = str(get_val(b, 'status', 'Dispatched'))

            total_everest += ev
            total_colgate += cg
            if st.lower() == 'dispatched':
                active_beats += 1
            else:
                completed_beats += 1

        return {
            'date': str(d_target),
            'total_everest_crates': total_everest,
            'total_colgate_cartons': total_colgate,
            'active_beats_count': active_beats,
            'completed_beats_count': completed_beats,
            'total_dispatches': active_beats + completed_beats
        }


# -------------------------------------------------------------------
# 7. DAMAGED & EXPIRY RETURNS CLAIMS ENGINE
# -------------------------------------------------------------------
class DamageClaimsEngine:
    """Retailer return claims valuation and manufacturer credit note engine.

    Tracks damaged or expired goods returned by retailers and computes
    credit note claim amounts split by brand (Everest Spices vs. Colgate-Palmolive).
    """

    @classmethod
    def calculate_claims_summary(
        cls,
        damaged_returns: List[Any]
    ) -> Dict[str, Any]:
        """Aggregates claim amounts and counts by status and brand.

        Statuses evaluated:
        - 'Pending Inspection'
        - 'Submitted to Depot'
        - 'Approved & Credited'
        - 'Rejected'

        Args:
            damaged_returns: Collection of DamagedReturn records.

        Returns:
            Dict[str, Any]: Valuation summary with total_claims_valuation,
                pending_claims_valuation, approved_claims_valuation,
                rejected_claims_valuation, status_counts, and brand_valuation.
        """
        total_claims_val = 0.0
        pending_val = 0.0
        approved_val = 0.0
        rejected_val = 0.0

        by_brand = {'Everest Spices': 0.0, 'Colgate-Palmolive': 0.0}
        by_status = {
            'Pending Inspection': 0,
            'Submitted to Depot': 0,
            'Approved & Credited': 0,
            'Rejected': 0
        }

        for r in damaged_returns:
            amt = float(get_val(r, 'credit_note_amount', 0))
            st = str(get_val(r, 'claim_status', 'Pending Inspection'))
            br = str(get_val(r, 'brand', 'Everest Spices'))

            total_claims_val += amt
            if st in by_status:
                by_status[st] += 1

            if st in ('Pending Inspection', 'Submitted to Depot'):
                pending_val += amt
            elif st == 'Approved & Credited':
                approved_val += amt
            elif st == 'Rejected':
                rejected_val += amt

            if br in by_brand:
                by_brand[br] += amt
            else:
                by_brand[br] = amt

        return {
            'total_claims_valuation': round(total_claims_val, 2),
            'pending_claims_valuation': round(pending_val, 2),
            'approved_claims_valuation': round(approved_val, 2),
            'rejected_claims_valuation': round(rejected_val, 2),
            'status_counts': by_status,
            'brand_valuation': {k: round(v, 2) for k, v in by_brand.items()}
        }


# -------------------------------------------------------------------
# 8. MULTI-SHEET BACKUP VALIDATION ENGINE
# -------------------------------------------------------------------
class BackupEngine:
    """Multi-sheet XLSX and JSON backup validation and schema normalization engine.

    Validates that database export/import payloads contain recognized distributor
    module schemas across all 7 operational facets.
    """
    MODULE_KEYS: Tuple[str, ...] = (
        'workers',
        'attendances',
        'advances',
        'fuel_expenses',
        'dispatch_beats',
        'damaged_returns',
        'stock_batches'
    )

    @classmethod
    def validate_backup_payload(cls, data: Any) -> Tuple[bool, str]:
        """Validates whether an input dictionary contains valid distributor state data.

        Args:
            data: Arbitrary object to validate against distribution backup schema.

        Returns:
            Tuple[bool, str]: (is_valid, validation_message)
        """
        if not isinstance(data, dict):
            return False, "Payload is not a valid dictionary structure"

        missing = [k for k in cls.MODULE_KEYS if k not in data]
        if len(missing) == len(cls.MODULE_KEYS):
            return False, "Payload does not contain any recognizable distribution modules"

        return True, "Valid backup structure"

    @classmethod
    def normalize_backup_dataset(
        cls,
        raw_data: Dict[str, Any]
    ) -> Dict[str, List[Any]]:
        """Ensures all 7 distributor modules exist as list structures with fallbacks.

        Args:
            raw_data: Raw dictionary loaded from JSON or Excel parser.

        Returns:
            Dict[str, List[Any]]: Normalized dictionary with all 7 keys guaranteed to be lists.
        """
        normalized: Dict[str, List[Any]] = {}
        for k in cls.MODULE_KEYS:
            val = raw_data.get(k)
            normalized[k] = list(val) if isinstance(val, (list, tuple)) else []
        return normalized
