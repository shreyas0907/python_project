from datetime import date, timedelta
import pytest
from business_logic import (
    FEFOEngine, AttendanceEngine, KhataEngine, PayrollEngine,
    FleetAnalyticsEngine, DispatchEngine, DamageClaimsEngine,
    BackupEngine, FMCG_CATALOG, parse_date
)


def test_parse_date():
    """Test date parsing utility with various formats."""
    d = date(2026, 11, 20)
    assert parse_date(d) == d
    assert parse_date("2026-11-20") == d
    assert parse_date("20/11/2026") == d
    with pytest.raises(ValueError):
        parse_date("invalid-date-string")


# -------------------------------------------------------------------
# FEFO ENGINE TESTS
# -------------------------------------------------------------------
def test_fefo_expiry_info_safe():
    today = date(2026, 11, 20)
    exp = date(2027, 5, 20)
    mfg = date(2026, 5, 20)

    info = FEFOEngine.calculate_expiry_info(exp, mfg, ref_date=today)
    assert info['status'] == 'safe'
    assert info['is_dispatchable'] is True
    assert info['days_left'] > 60
    assert info['shelf_life_percent'] > 40


def test_fefo_expiry_info_near_expiry():
    today = date(2026, 11, 20)
    exp = date(2026, 12, 10)  # 20 days left

    info = FEFOEngine.calculate_expiry_info(exp, ref_date=today)
    assert info['status'] == 'near_expiry'
    assert info['is_dispatchable'] is True
    assert info['action'] == 'priority_dispatch'
    assert info['days_left'] == 20


def test_fefo_expiry_info_expired():
    today = date(2026, 11, 20)
    exp = date(2026, 11, 15)  # 5 days ago

    info = FEFOEngine.calculate_expiry_info(exp, ref_date=today)
    assert info['status'] == 'expired'
    assert info['is_dispatchable'] is False
    assert info['action'] == 'quarantine'
    assert info['days_left'] <= 0


def test_fefo_ranking_order():
    today = date(2026, 11, 20)
    batches = [
        {'id': 1, 'batch': 'B1_SAFE', 'exp': '2027-10-01'},
        {'id': 2, 'batch': 'B2_EXPIRED', 'exp': '2026-10-01'},
        {'id': 3, 'batch': 'B3_NEAR', 'exp': '2026-12-05'},
    ]
    ranked = FEFOEngine.rank_batches_fefo(batches, ref_date=today)
    # Near expiry should be first, safe second, expired last
    assert ranked[0]['batch'] == 'B3_NEAR'
    assert ranked[1]['batch'] == 'B1_SAFE'
    assert ranked[2]['batch'] == 'B2_EXPIRED'


def test_fefo_qr_encode_and_decode():
    batch_data = {
        'id': 101,
        'brand': 'Everest Spices',
        'product': 'Everest Garam Masala 100g',
        'batch': 'EV-GM-2610A',
        'mfg': '2026-05-10',
        'exp': '2027-05-10',
        'qty': 45,
        'status': 'Active'
    }
    encoded = FEFOEngine.generate_batch_qr_payload(batch_data)
    assert isinstance(encoded, str)
    assert 'EV-GM-2610A' in encoded

    decoded = FEFOEngine.decode_and_verify_qr_payload(encoded)
    assert decoded['valid'] is True
    assert decoded['brand'] == 'Everest Spices'
    assert decoded['product'] == 'Everest Garam Masala 100g'
    assert decoded['qty'] == 45
    assert decoded['fefo_info']['status'] in ('safe', 'near_expiry', 'expired')


def test_fmcg_catalog_content():
    assert 'Everest Spices' in FMCG_CATALOG
    assert 'Colgate-Palmolive' in FMCG_CATALOG
    assert len(FMCG_CATALOG['Everest Spices']) >= 10
    assert len(FMCG_CATALOG['Colgate-Palmolive']) >= 8


# -------------------------------------------------------------------
# ATTENDANCE ENGINE TESTS
# -------------------------------------------------------------------
def test_attendance_worker_summary():
    records = [
        {'status': 'Present'},
        {'status': 'Present'},
        {'status': 'Half Day'},
        {'status': 'Paid Leave'},
        {'status': 'Absent'}
    ]
    summary = AttendanceEngine.calculate_worker_summary(records)
    assert summary['present_count'] == 2
    assert summary['half_day_count'] == 1
    assert summary['paid_leave_count'] == 1
    assert summary['absent_count'] == 1
    # 2 + 1 + (0.5 * 1) = 3.5 days
    assert summary['effective_days'] == 3.5
    assert summary['total_logged'] == 5
    assert summary['attendance_rate'] == 70.0


def test_monthly_muster_grid():
    workers = [{'id': 1, 'name': 'Worker A', 'role': 'Driver'}]
    attendances = [
        {'worker_id': 1, 'date': '2026-11-01', 'status': 'Present'},
        {'worker_id': 1, 'date': '2026-11-02', 'status': 'Half Day'},
    ]
    grid = AttendanceEngine.build_monthly_muster_grid(workers, attendances, 2026, 11)
    assert grid['year'] == 2026
    assert grid['month'] == 11
    assert grid['num_days'] == 30
    assert len(grid['rows']) == 1
    row = grid['rows'][0]
    assert row['statuses'][0] == 'Present'
    assert row['statuses'][1] == 'Half Day'
    assert row['statuses'][2] == '-'
    assert row['summary']['effective_days'] == 1.5


def test_daily_attendance_snapshot():
    attendances = [
        {'date': '2026-11-20', 'status': 'Present'},
        {'date': '2026-11-20', 'status': 'Paid Leave'},
        {'date': '2026-11-20', 'status': 'Absent'},
        {'date': '2026-11-19', 'status': 'Present'}
    ]
    snap = AttendanceEngine.get_daily_snapshot(attendances, total_active_workers=4, target_date='2026-11-20')
    assert snap['present_count'] == 2  # Present + Paid Leave
    assert snap['absent_count'] == 1
    assert snap['total_active'] == 4
    assert snap['muster_percent'] == 50.0


# -------------------------------------------------------------------
# KHATA ENGINE TESTS
# -------------------------------------------------------------------
def test_khata_pending_and_total():
    advances = [
        {'worker_id': 1, 'amount_paid': 1000.0, 'status': 'Approved'},
        {'worker_id': 1, 'amount_paid': 500.0, 'status': 'Approved'},
        {'worker_id': 1, 'amount_paid': 800.0, 'status': 'Settled'},
        {'worker_id': 2, 'amount_paid': 2000.0, 'status': 'Approved'}
    ]
    assert KhataEngine.get_pending_advances_total(advances, worker_id=1) == 1500.0
    assert KhataEngine.get_total_advances_history(advances, worker_id=1) == 2300.0
    assert KhataEngine.get_pending_advances_total(advances) == 3500.0


def test_khata_running_ledger():
    worker = {'id': 1, 'name': 'Worker A'}
    advances = [
        {'worker_id': 1, 'payment_date': '2026-11-05', 'amount_paid': 2000.0, 'status': 'Approved', 'payment_mode': 'Cash'},
        {'worker_id': 1, 'payment_date': '2026-11-15', 'amount_paid': 1000.0, 'status': 'Approved', 'payment_mode': 'UPI'}
    ]
    settlements = [
        {'worker_id': 1, 'settlement_date': '2026-11-10', 'advance_deduction': 1500.0, 'month': 10, 'year': 2026}
    ]
    ledger = KhataEngine.build_worker_khata_ledger(worker, advances, settlements)
    assert len(ledger['entries']) == 3
    # Initial +2000, -1500 => 500, +1000 => 1500
    assert ledger['current_pending_balance'] == 1500.0


# -------------------------------------------------------------------
# PAYROLL ENGINE TESTS
# -------------------------------------------------------------------
def test_payroll_daily_worker():
    worker = {'daily_wage': 600.0, 'monthly_fixed_salary': 0.0, 'role': 'Loader'}
    settlement = PayrollEngine.calculate_settlement(worker, effective_days=25.0, pending_advance=3000.0)
    assert settlement['wage_type'] == 'Daily'
    assert settlement['gross_earned'] == 15000.0
    assert settlement['advance_deduction'] == 3000.0
    assert settlement['net_payable'] == 12000.0
    assert settlement['remaining_advance'] == 0.0


def test_payroll_monthly_salaried_worker():
    worker = {'daily_wage': 0.0, 'monthly_fixed_salary': 30000.0, 'role': 'Depot Manager'}
    # 15 days out of 30 => half salary
    settlement = PayrollEngine.calculate_settlement(worker, effective_days=15.0, days_in_month=30, pending_advance=5000.0)
    assert settlement['wage_type'] == 'Monthly'
    assert settlement['gross_earned'] == 15000.0
    assert settlement['advance_deduction'] == 5000.0
    assert settlement['net_payable'] == 10000.0


def test_payroll_voucher_generation():
    worker = {'id': 5, 'name': 'Sanjay Patil', 'role': 'Driver'}
    settlement = {'gross_earnings': 15600.0, 'advance_deduction': 2000.0, 'net_payable': 13600.0, 'total_days_worked': 24.0, 'payment_mode': 'Cash'}
    vch = PayrollEngine.generate_voucher_data(settlement, worker, voucher_number="VCH-005-TEST")
    assert vch['voucher_number'] == "VCH-005-TEST"
    assert vch['worker_name'] == "Sanjay Patil"
    assert vch['net_payable'] == 13600.0


# -------------------------------------------------------------------
# FLEET ANALYTICS TESTS
# -------------------------------------------------------------------
def test_fleet_monthly_stats_and_trend():
    expenses = [
        {'date': '2026-11-05', 'amount_spent': 4000.0, 'liters': 42.0, 'fuel_type': 'Diesel'},
        {'date': '2026-11-15', 'amount_spent': 2000.0, 'liters': 20.0, 'fuel_type': 'CNG'},
        {'date': '2026-10-10', 'amount_spent': 5000.0, 'liters': 52.0, 'fuel_type': 'Diesel'}
    ]
    nov_stats = FleetAnalyticsEngine.calculate_monthly_fuel_stats(expenses, 2026, 11)
    assert nov_stats['total_spent'] == 6000.0
    assert nov_stats['total_liters'] == 62.0
    assert nov_stats['by_fuel_type']['Diesel'] == 4000.0
    assert nov_stats['by_fuel_type']['CNG'] == 2000.0

    trend = FleetAnalyticsEngine.calculate_mom_fuel_trend(6000.0, 5000.0)
    assert trend['diff_amount'] == 1000.0
    assert trend['diff_percent'] == 20.0
    assert trend['is_increase'] is True


def test_fleet_chart_data():
    expenses = [
        {'date': '2026-11-01', 'amount_spent': 10000.0, 'liters': 100.0, 'fuel_type': 'Diesel'}
    ]
    chart = FleetAnalyticsEngine.generate_fuel_chart_data(expenses, num_months=6, end_date=date(2026, 11, 20))
    assert len(chart['labels']) == 6
    assert len(chart['actual_spent']) == 6
    assert len(chart['budget_baseline']) == 6
    assert chart['actual_spent'][-1] == 10000.0


# -------------------------------------------------------------------
# DISPATCH ENGINE TESTS
# -------------------------------------------------------------------
def test_dispatch_availability_safeguard():
    beats = [
        {'vehicle_id': 10, 'status': 'Dispatched', 'beat_name': 'Route North'},
        {'vehicle_id': 20, 'status': 'Completed', 'beat_name': 'Route South'}
    ]
    avail_10 = DispatchEngine.check_vehicle_dispatch_availability(10, beats)
    assert avail_10['is_available'] is False
    assert "Route North" in avail_10['message']

    avail_20 = DispatchEngine.check_vehicle_dispatch_availability(20, beats)
    assert avail_20['is_available'] is True

    avail_30 = DispatchEngine.check_vehicle_dispatch_availability(30, beats)
    assert avail_30['is_available'] is True


def test_dispatch_daily_metrics():
    beats = [
        {'dispatch_date': '2026-11-20', 'crates_everest': 40, 'cartons_colgate': 25, 'status': 'Dispatched'},
        {'dispatch_date': '2026-11-20', 'crates_everest': 30, 'cartons_colgate': 15, 'status': 'Completed'},
        {'dispatch_date': '2026-11-19', 'crates_everest': 50, 'cartons_colgate': 50, 'status': 'Completed'}
    ]
    metrics = DispatchEngine.calculate_daily_dispatch_metrics(beats, target_date='2026-11-20')
    assert metrics['total_everest_crates'] == 70
    assert metrics['total_colgate_cartons'] == 40
    assert metrics['active_beats_count'] == 1
    assert metrics['completed_beats_count'] == 1
    assert metrics['total_dispatches'] == 2


# -------------------------------------------------------------------
# DAMAGE CLAIMS & BACKUP TESTS
# -------------------------------------------------------------------
def test_damage_claims_summary():
    returns = [
        {'credit_note_amount': 1500.0, 'claim_status': 'Pending Inspection', 'brand': 'Everest Spices'},
        {'credit_note_amount': 2500.0, 'claim_status': 'Approved & Credited', 'brand': 'Colgate-Palmolive'},
        {'credit_note_amount': 500.0, 'claim_status': 'Rejected', 'brand': 'Everest Spices'}
    ]
    summary = DamageClaimsEngine.calculate_claims_summary(returns)
    assert summary['total_claims_valuation'] == 4500.0
    assert summary['pending_claims_valuation'] == 1500.0
    assert summary['approved_claims_valuation'] == 2500.0
    assert summary['rejected_claims_valuation'] == 500.0
    assert summary['brand_valuation']['Everest Spices'] == 2000.0
    assert summary['brand_valuation']['Colgate-Palmolive'] == 2500.0


def test_backup_engine_validation():
    valid_payload = {
        'workers': [{'name': 'Ramesh'}],
        'attendances': [],
        'advances': [],
        'fuel_expenses': [],
        'dispatch_beats': [],
        'damaged_returns': [],
        'stock_batches': []
    }
    is_valid, msg = BackupEngine.validate_backup_payload(valid_payload)
    assert is_valid is True

    normalized = BackupEngine.normalize_backup_dataset(valid_payload)
    assert len(normalized['workers']) == 1
    assert isinstance(normalized['attendances'], list)

    invalid_payload = {'something_else': 123}
    is_valid2, _ = BackupEngine.validate_backup_payload(invalid_payload)
    assert is_valid2 is False


def test_fefo_same_day_expiry():
    """Batch expiring today must be marked expired."""
    today = date(2026, 11, 25)
    info = FEFOEngine.calculate_expiry_info('2026-11-25', ref_date=today)
    assert info['status'] == 'expired'
    assert info['days_left'] == 0
    assert info['is_dispatchable'] is False


def test_fefo_leap_year_handling():
    """Correctly handles leap year dates (e.g. 2028-02-29)."""
    ref = date(2028, 2, 27)
    info = FEFOEngine.calculate_expiry_info('2028-02-29', ref_date=ref)
    assert info['days_left'] == 2
    assert info['status'] == 'near_expiry'


def test_fefo_empty_and_single_batch():
    """Handles empty list or single batch list."""
    assert FEFOEngine.rank_batches_fefo([]) == []

    single = [{'brand': 'Everest', 'product': 'Masala', 'batch': 'B1', 'exp': '2027-01-01', 'qty': 10}]
    ranked = FEFOEngine.rank_batches_fefo(single)
    assert len(ranked) == 1
    assert ranked[0]['batch'] == 'B1'


def test_attendance_worker_all_absent():
    """Worker with only Absent statuses returns 0% attendance."""
    records = [{'status': 'Absent'}, {'status': 'Absent'}, {'status': 'Absent'}]
    summary = AttendanceEngine.calculate_worker_summary(records)
    assert summary['effective_days'] == 0.0
    assert summary['absent_count'] == 3
    assert summary['attendance_rate'] == 0.0


def test_attendance_worker_all_paid_leave():
    """Worker with only Paid Leave statuses returns 100% attendance."""
    records = [{'status': 'Paid Leave'}, {'status': 'Paid Leave'}]
    summary = AttendanceEngine.calculate_worker_summary(records)
    assert summary['effective_days'] == 2.0
    assert summary['paid_leave_count'] == 2
    assert summary['attendance_rate'] == 100.0


def test_khata_empty_records():
    """Calculations on empty advances list return 0.0."""
    assert KhataEngine.get_pending_advances_total([]) == 0.0
    assert KhataEngine.get_total_advances_history([]) == 0.0

    ledger = KhataEngine.build_worker_khata_ledger({'id': 1, 'name': 'Worker A'}, [], [])
    assert ledger['current_pending_balance'] == 0.0
    assert len(ledger['entries']) == 0


def test_fleet_mom_zero_previous_spend():
    """Zero previous month fuel spend safely produces 0.0% variance."""
    trend = FleetAnalyticsEngine.calculate_mom_fuel_trend(cur_spent=5000, prev_spent=0)
    assert trend['diff_amount'] == 5000.0
    assert trend['diff_percent'] == 0.0
    assert trend['is_increase'] is True


def test_dispatch_engine_nonexistent_vehicle():
    """Checking availability for a vehicle ID not in any route returns is_available=True."""
    beats = [{'vehicle_id': 1, 'status': 'Dispatched', 'beat_name': 'Route 1'}]
    res = DispatchEngine.check_vehicle_dispatch_availability(999, beats)
    assert res['is_available'] is True
    assert res['active_beat'] is None

