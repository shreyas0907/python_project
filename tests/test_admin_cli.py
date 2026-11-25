"""
Unit and integration tests for scripts/admin_cli.py management utility.
"""

import os
import json
import pytest
from datetime import date
from scripts.admin_cli import (
    check_database_health,
    generate_operational_summary,
    run_fefo_stock_scan,
    calculate_monthly_payroll,
    run_backup_audit
)
from models import Worker, Advance, Vehicle, FuelExpense, DispatchBeat, DamagedReturn


def test_check_database_health_seeded(seeded_app):
    """Verifies that database health diagnostics report healthy state with counts."""
    health = check_database_health()
    assert health['status'] == 'HEALTHY'
    assert health['integrity'] == 'ok'
    assert health['table_counts']['workers'] >= 5
    assert health['table_counts']['vehicles'] >= 3
    assert health['total_records'] > 10


def test_generate_operational_summary(seeded_app):
    """Verifies operational KPI aggregation across staff, fleet, beat routes and returns."""
    summary = generate_operational_summary()
    assert summary['organization'] == 'Anupama Agencies — FMCG Distributor'
    assert len(summary['principals']) == 2
    assert summary['workforce']['active_workers'] >= 5
    assert summary['fleet_and_fuel']['registered_vehicles'] >= 3
    assert summary['market_dispatches']['total_routes_logged'] >= 3
    assert 'total_claims_valuation' in summary['damage_and_expiry_claims']


def test_run_fefo_stock_scan_default():
    """Verifies default warehouse inventory FEFO ranking."""
    ranked = run_fefo_stock_scan()
    assert len(ranked) == 4
    # Highest priority should be nearest expiry (e.g. EV-PB-2508B or similar)
    first = ranked[0]
    assert first['fefo_info']['status'] in ('near_expiry', 'expired')


def test_run_fefo_stock_scan_custom():
    """Verifies custom batch list FEFO evaluation."""
    custom = [
        {'brand': 'Everest Spices', 'product': 'Everest Chaat Masala 100g', 'batch': 'B1', 'exp': '2027-01-01', 'qty': 10},
        {'brand': 'Colgate-Palmolive', 'product': 'Colgate Strong Teeth 200g', 'batch': 'B2', 'exp': '2026-11-30', 'qty': 20}
    ]
    ranked = run_fefo_stock_scan(custom)
    assert len(ranked) == 2
    # B2 expires earlier than B1
    assert ranked[0]['batch'] == 'B2'
    assert ranked[1]['batch'] == 'B1'


def test_calculate_monthly_payroll(seeded_app):
    """Verifies monthly payroll calculations for active workforce."""
    today = date.today()
    results = calculate_monthly_payroll(today.year, today.month)
    assert len(results) >= 5
    for r in results:
        assert 'worker_id' in r
        assert 'daily_wage' in r
        assert 'gross_earned' in r
        assert 'net_payable' in r
        assert r['gross_earned'] >= 0
        assert r['net_payable'] >= 0


def test_run_backup_audit(seeded_app):
    """Verifies database referential integrity and lack of orphaned records."""
    audit = run_backup_audit()
    assert audit['audit_passed'] is True
    assert audit['orphaned_attendances'] == 0
    assert audit['orphaned_advances'] == 0
    assert audit['orphaned_fuel_records'] == 0
    assert audit['orphaned_dispatches'] == 0
