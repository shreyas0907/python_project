"""
Admin CLI Utility for Anupama Agencies FMCG Distribution Management Portal.

This standalone management script provides command-line tools for database maintenance,
system health diagnostics, summary reporting, FEFO stock expiry analysis, manual data
seeding, and payroll audit calculations without running on application startup.

Usage:
    python scripts/admin_cli.py health
    python scripts/admin_cli.py export-summary [--format {text,json,csv}] [--out DIR]
    python scripts/admin_cli.py seed-data [--force]
    python scripts/admin_cli.py fefo-scan [--json-file PATH]
    python scripts/admin_cli.py calc-payroll [--year YYYY] [--month MM]
    python scripts/admin_cli.py backup-audit
"""

import os
import sys
import json
import argparse
from datetime import datetime, date
from typing import Dict, List, Any, Optional, Tuple

# Ensure project root is in sys.path
PROJECT_ROOT: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app import app
from models import (
    db, Worker, Attendance, Advance, Vehicle,
    FuelExpense, DispatchBeat, DamagedReturn, SalarySettlement
)
from business_logic import (
    FEFOEngine, AttendanceEngine, KhataEngine, PayrollEngine,
    FleetAnalyticsEngine, DispatchEngine, DamageClaimsEngine,
    FMCG_CATALOG
)
from utils import format_inr
from database import seed_initial_data


def check_database_health() -> Dict[str, Any]:
    """Inspects database file integrity, table accessibility, and entity counts.

    Returns:
        Dict[str, Any]: Structured diagnostic health dictionary containing status,
            table row counts, database path, file size in bytes, and integrity check.
    """
    with app.app_context():
        # Check SQLite integrity PRAGMA
        try:
            res = db.session.execute(db.text("PRAGMA integrity_check")).fetchall()
            integrity = res[0][0] if res else "unknown"
        except Exception as e:
            integrity = f"error: {str(e)}"

        counts: Dict[str, int] = {
            'workers': Worker.query.count(),
            'attendance': Attendance.query.count(),
            'advances': Advance.query.count(),
            'vehicles': Vehicle.query.count(),
            'fuel_expenses': FuelExpense.query.count(),
            'dispatch_beats': DispatchBeat.query.count(),
            'damaged_returns': DamagedReturn.query.count(),
            'salary_settlements': SalarySettlement.query.count(),
        }

        db_path = os.path.join(app.instance_path, 'anupama_agencies.db')
        file_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0

        # Check upload directories
        workers_upload = os.path.join(app.root_path, 'static', 'uploads', 'workers')
        receipts_upload = os.path.join(app.root_path, 'static', 'uploads', 'receipts')

        is_healthy = (integrity == "ok") and (counts['workers'] >= 0)

        return {
            'status': 'HEALTHY' if is_healthy else 'UNHEALTHY',
            'integrity': integrity,
            'database_path': db_path,
            'database_size_bytes': file_size,
            'table_counts': counts,
            'total_records': sum(counts.values()),
            'upload_directories': {
                'workers': os.path.exists(workers_upload),
                'receipts': os.path.exists(receipts_upload)
            },
            'timestamp': datetime.now().isoformat()
        }


def generate_operational_summary() -> Dict[str, Any]:
    """Compiles high-level operational and financial KPIs across all portal modules.

    Returns:
        Dict[str, Any]: Summary dictionary spanning staff, fleet, beat deliveries,
            damaged returns, and advance khata metrics.
    """
    with app.app_context():
        # 1. Staff and Khata
        workers = Worker.query.all()
        active_workers = [w for w in workers if w.status == 'Active']
        advances = Advance.query.all()
        pending_adv_total = sum(a.amount_paid for a in advances if a.status == 'Approved')
        settled_adv_total = sum(a.amount_paid for a in advances if a.status == 'Settled')

        # 2. Fleet & Fuel
        vehicles = Vehicle.query.all()
        fuel_logs = FuelExpense.query.all()
        total_fuel_spent = sum(f.amount_spent for f in fuel_logs)
        total_liters = sum(f.liters for f in fuel_logs)

        # 3. Dispatches
        dispatches = DispatchBeat.query.all()
        everest_crates = sum(b.crates_everest for b in dispatches)
        colgate_cartons = sum(b.cartons_colgate for b in dispatches)

        # 4. Damaged stock claims
        returns = DamagedReturn.query.all()
        claims_summary = DamageClaimsEngine.calculate_claims_summary(returns)

        return {
            'organization': 'Anupama Agencies — FMCG Distributor',
            'principals': ['Everest Spices', 'Colgate-Palmolive India Ltd.'],
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'workforce': {
                'total_workers': len(workers),
                'active_workers': len(active_workers),
                'pending_advances_total': pending_adv_total,
                'settled_advances_total': settled_adv_total
            },
            'fleet_and_fuel': {
                'registered_vehicles': len(vehicles),
                'fuel_log_entries': len(fuel_logs),
                'total_fuel_spent': total_fuel_spent,
                'total_fuel_liters': total_liters,
                'avg_fuel_cost_per_liter': round(total_fuel_spent / total_liters, 2) if total_liters > 0 else 0.0
            },
            'market_dispatches': {
                'total_routes_logged': len(dispatches),
                'everest_crates_delivered': everest_crates,
                'colgate_cartons_delivered': colgate_cartons
            },
            'damage_and_expiry_claims': claims_summary
        }


def run_fefo_stock_scan(sample_data: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """Evaluates stock batches and prioritizes dispatch order using FEFOEngine.

    Args:
        sample_data (Optional[List[Dict[str, Any]]]): Custom list of batch dicts.
            If None, scans default warehouse catalog sample batches.

    Returns:
        List[Dict[str, Any]]: Sorted list of batch records ranked by FEFO priority.
    """
    batches = sample_data or [
        {
            'brand': 'Everest Spices',
            'product': 'Everest Garam Masala 100g',
            'batch': 'EV-GM-2610A',
            'mfg': '2026-05-10',
            'exp': '2027-05-18',
            'qty': 45
        },
        {
            'brand': 'Everest Spices',
            'product': 'Everest Pav Bhaji Masala 100g',
            'batch': 'EV-PB-2508B',
            'mfg': '2025-08-01',
            'exp': '2026-12-10',
            'qty': 20
        },
        {
            'brand': 'Colgate-Palmolive',
            'product': 'Colgate MaxFresh Blue Gel 150g',
            'batch': 'CP-MF-2601C',
            'mfg': '2026-01-15',
            'exp': '2027-08-30',
            'qty': 60
        },
        {
            'brand': 'Colgate-Palmolive',
            'product': 'Colgate Strong Teeth 200g',
            'batch': 'CP-ST-2503A',
            'mfg': '2025-03-01',
            'exp': '2026-09-01',
            'qty': 15
        }
    ]
    return FEFOEngine.rank_batches_fefo(batches)


def calculate_monthly_payroll(year: int, month: int) -> List[Dict[str, Any]]:
    """Computes monthly salary breakdowns and advance deductions for all active workers.

    Args:
        year (int): Calendar year.
        month (int): Calendar month (1-12).

    Returns:
        List[Dict[str, Any]]: List of calculated wage statements per worker.
    """
    with app.app_context():
        workers = Worker.query.filter_by(status='Active').order_by(Worker.name).all()
        results: List[Dict[str, Any]] = []

        for w in workers:
            att = w.attendance_summary_in_month(year, month)
            eff_days = att['effective_days']
            pending_adv = w.total_advances_pending

            calc = PayrollEngine.calculate_settlement(
                worker=w,
                effective_days=eff_days,
                days_in_month=30,
                pending_advance=pending_adv
            )

            results.append({
                'worker_id': w.id,
                'name': w.name,
                'role': w.role,
                'effective_days': eff_days,
                'daily_wage': w.daily_wage,
                'gross_earned': calc['gross_earned'],
                'advance_deduction': calc['advance_deduction'],
                'net_payable': calc['net_payable'],
                'remaining_advance': calc['remaining_advance']
            })

        return results


def run_backup_audit() -> Dict[str, Any]:
    """Audits database relationships and validates referential integrity.

    Returns:
        Dict[str, Any]: Audit findings including orphaned records and verification checks.
    """
    with app.app_context():
        # Check orphaned attendances
        worker_ids = {w.id for w in Worker.query.all()}
        vehicle_ids = {v.id for v in Vehicle.query.all()}

        orphaned_att = Attendance.query.filter(~Attendance.worker_id.in_(worker_ids)).count() if worker_ids else 0
        orphaned_adv = Advance.query.filter(~Advance.worker_id.in_(worker_ids)).count() if worker_ids else 0
        orphaned_fuel_veh = FuelExpense.query.filter(~FuelExpense.vehicle_id.in_(vehicle_ids)).count() if vehicle_ids else 0
        orphaned_dispatch_veh = DispatchBeat.query.filter(~DispatchBeat.vehicle_id.in_(vehicle_ids)).count() if vehicle_ids else 0

        is_clean = all(c == 0 for c in [orphaned_att, orphaned_adv, orphaned_fuel_veh, orphaned_dispatch_veh])

        return {
            'audit_passed': is_clean,
            'orphaned_attendances': orphaned_att,
            'orphaned_advances': orphaned_adv,
            'orphaned_fuel_records': orphaned_fuel_veh,
            'orphaned_dispatches': orphaned_dispatch_veh,
            'verified_at': datetime.now().isoformat()
        }


# -------------------------------------------------------------------
# CLI ARGPARSE COMMAND DISPATCHER
# -------------------------------------------------------------------
def main() -> None:
    """Main CLI entry point using argparse."""
    parser = argparse.ArgumentParser(
        description="Anupama Agencies — FMCG Distributor Operations CLI Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/admin_cli.py health
  python scripts/admin_cli.py export-summary --format text
  python scripts/admin_cli.py export-summary --format json
  python scripts/admin_cli.py fefo-scan
  python scripts/admin_cli.py calc-payroll --year 2026 --month 11
  python scripts/admin_cli.py backup-audit
  python scripts/admin_cli.py seed-data
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Operational subcommand")

    # Command: health
    subparsers.add_parser("health", help="Check database connectivity and table counts")

    # Command: export-summary
    export_parser = subparsers.add_parser("export-summary", help="Export operational KPI summaries")
    export_parser.add_argument("--format", choices=["text", "json"], default="text", help="Output format")
    export_parser.add_argument("--out", type=str, default="", help="Optional output filepath to save report")

    # Command: seed-data
    seed_parser = subparsers.add_parser("seed-data", help="Seed initial demonstration FMCG records")
    seed_parser.add_argument("--force", action="store_true", help="Force re-seed even if records exist")

    # Command: fefo-scan
    fefo_parser = subparsers.add_parser("fefo-scan", help="Run FEFO stock priority analysis on inventory")
    fefo_parser.add_argument("--json-file", type=str, default="", help="Path to custom batch JSON file")

    # Command: calc-payroll
    payroll_parser = subparsers.add_parser("calc-payroll", help="Calculate wage payouts for active staff")
    payroll_parser.add_argument("--year", type=int, default=date.today().year, help="Target payroll year")
    payroll_parser.add_argument("--month", type=int, default=date.today().month, help="Target payroll month (1-12)")

    # Command: backup-audit
    subparsers.add_parser("backup-audit", help="Audit database referential integrity and check orphaned rows")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "health":
        health = check_database_health()
        print("\n=======================================================")
        print(f" ANUPAMA AGENCIES — DATABASE HEALTH CHECK: {health['status']}")
        print("=======================================================")
        print(f" SQLite Integrity : {health['integrity'].upper()}")
        print(f" Database Path    : {health['database_path']}")
        print(f" File Size        : {health['database_size_bytes']:,} bytes")
        print("\n--- TABLE ROW COUNTS ---")
        for table, count in health['table_counts'].items():
            print(f"  • {table:<22}: {count:>5} records")
        print(f"\n  Total Records   : {health['total_records']}")
        print("=======================================================\n")

    elif args.command == "export-summary":
        summary = generate_operational_summary()
        if args.format == "json":
            out_json = json.dumps(summary, indent=2)
            if args.out:
                with open(args.out, "w") as f:
                    f.write(out_json)
                print(f"Summary written to {args.out}")
            else:
                print(out_json)
        else:
            print("\n=======================================================")
            print(" ANUPAMA AGENCIES — OPERATIONAL SUMMARY REPORT")
            print("=======================================================")
            print(f" Timestamp : {summary['timestamp']}")
            print("\n[WORKFORCE & KHATA]")
            wf = summary['workforce']
            print(f"  • Active Staff         : {wf['active_workers']} / {wf['total_workers']}")
            print(f"  • Pending Advances     : {format_inr(wf['pending_advances_total'])}")
            print(f"  • Settled Advances     : {format_inr(wf['settled_advances_total'])}")
            print("\n[FLEET & FUEL]")
            fl = summary['fleet_and_fuel']
            print(f"  • Vehicles Active      : {fl['registered_vehicles']}")
            print(f"  • Total Fuel Spent     : {format_inr(fl['total_fuel_spent'])} ({fl['total_fuel_liters']} L)")
            print(f"  • Average Cost/Liter   : {format_inr(fl['avg_fuel_cost_per_liter'])}")
            print("\n[BEAT DISPATCHES]")
            disp = summary['market_dispatches']
            print(f"  • Dispatches Completed : {disp['total_routes_logged']}")
            print(f"  • Everest Crates       : {disp['everest_crates_delivered']}")
            print(f"  • Colgate Cartons      : {disp['colgate_cartons_delivered']}")
            print("\n[DAMAGE & EXPIRY CLAIMS]")
            dc = summary['damage_and_expiry_claims']
            print(f"  • Total Claims Value   : {format_inr(dc['total_claims_valuation'])}")
            print(f"  • Pending Depot Credit : {format_inr(dc['pending_claims_valuation'])}")
            print("=======================================================\n")

    elif args.command == "fefo-scan":
        custom_data = None
        if args.json_file and os.path.exists(args.json_file):
            with open(args.json_file, 'r') as f:
                custom_data = json.load(f)

        ranked = run_fefo_stock_scan(custom_data)
        print("\n=========================================================================")
        print(" ANUPAMA AGENCIES — FEFO WAREHOUSE EXPIRY SCAN & DISPATCH RANKING")
        print("=========================================================================")
        print(f"{'Priority':<10} {'Brand':<18} {'Product':<30} {'Batch':<14} {'Days Left':<12} {'Status'}")
        print("-------------------------------------------------------------------------")
        for idx, b in enumerate(ranked, 1):
            exp_info = b['fefo_info']
            days = exp_info['days_left']
            status = exp_info['status_label']
            brand = b['brand'][:16]
            prod = b['product'][:28]
            batch = b['batch']
            print(f"#{idx:<9} {brand:<18} {prod:<30} {batch:<14} {days:<12} {status}")
        print("=========================================================================\n")

    elif args.command == "calc-payroll":
        results = calculate_monthly_payroll(args.year, args.month)
        print(f"\n=========================================================================")
        print(f" PAYROLL CALCULATION STATEMENT — {args.year}-{args.month:02d}")
        print("=========================================================================")
        print(f"{'Worker':<20} {'Role':<22} {'Days':<6} {'Daily Rate':<12} {'Gross':<12} {'Deduction':<12} {'Net Payable'}")
        print("-------------------------------------------------------------------------")
        for r in results:
            print(f"{r['name']:<20} {r['role']:<22} {r['effective_days']:<6.1f} {format_inr(r['daily_wage']):<12} {format_inr(r['gross_earned']):<12} {format_inr(r['advance_deduction']):<12} {format_inr(r['net_payable'])}")
        print("=========================================================================\n")

    elif args.command == "backup-audit":
        audit = run_backup_audit()
        print("\n=======================================================")
        print(" ANUPAMA AGENCIES — DATABASE INTEGRITY AUDIT")
        print("=======================================================")
        print(f" Status                : {'PASSED (Clean)' if audit['audit_passed'] else 'FAILED (Issues Detected)'}")
        print(f" Orphaned Attendance   : {audit['orphaned_attendances']}")
        print(f" Orphaned Advances     : {audit['orphaned_advances']}")
        print(f" Orphaned Fuel Logs    : {audit['orphaned_fuel_records']}")
        print(f" Orphaned Dispatches   : {audit['orphaned_dispatches']}")
        print(f" Timestamp             : {audit['verified_at']}")
        print("=======================================================\n")

    elif args.command == "seed-data":
        with app.app_context():
            if args.force:
                print("Clearing and re-seeding database tables...")
                db.drop_all()
                db.create_all()
                seed_initial_data()
                print("Database tables re-created and seeded successfully.")
            else:
                if Worker.query.first() is not None:
                    print("Database already contains records. Use --force to re-seed.")
                else:
                    seed_initial_data()
                    print("Database seeded successfully.")


if __name__ == "__main__":
    main()
