"""
Comprehensive unit tests for SQLAlchemy models in Anupama Agencies distribution portal.

Tests all 8 database entities, relationship mapping, calculated model properties,
attendance percentage logic, and string representations.
"""

from datetime import date, datetime
import pytest
from models import (
    db, Worker, Attendance, Advance, Vehicle,
    FuelExpense, DispatchBeat, DamagedReturn, SalarySettlement
)


def test_worker_model_creation(app):
    """Test Worker model instantiation, defaults, and attributes."""
    with app.app_context():
        worker = Worker(
            name="Suresh Shinde",
            phone="9876543210",
            emergency_contact="9876543211",
            role="Godown In-Charge",
            daily_wage=750.0,
            monthly_salary=22000.0,
            status="Active"
        )
        db.session.add(worker)
        db.session.commit()

        fetched = db.session.get(Worker, worker.id)
        assert fetched is not None
        assert fetched.name == "Suresh Shinde"
        assert fetched.role == "Godown In-Charge"
        assert fetched.daily_wage == 750.0
        assert fetched.monthly_salary == 22000.0
        assert fetched.status == "Active"
        assert "Suresh Shinde" in repr(fetched)


def test_worker_advances_properties(app, sample_worker):
    """Test total_advances_pending and total_advances_taken properties."""
    with app.app_context():
        # Baseline with zero advances
        worker = db.session.get(Worker, sample_worker.id)
        assert worker.total_advances_pending == 0.0
        assert worker.total_advances_taken == 0.0

        # Add an approved advance
        adv1 = Advance(worker_id=worker.id, amount_paid=2000.0, status='Approved')
        # Add a settled advance
        adv2 = Advance(worker_id=worker.id, amount_paid=1500.0, status='Settled')
        # Add a pending approval advance
        adv3 = Advance(worker_id=worker.id, amount_paid=500.0, status='Pending')

        db.session.add_all([adv1, adv2, adv3])
        db.session.commit()

        # Query worker again to ensure fresh relationship evaluation
        refreshed_worker = db.session.get(Worker, worker.id)
        # Pending should sum only 'Approved'
        assert refreshed_worker.total_advances_pending == 2000.0
        # Taken should sum 'Approved' + 'Settled' (excluding 'Pending')
        assert refreshed_worker.total_advances_taken == 3500.0


def test_worker_attendance_summary_calculations(app, sample_worker):
    """Test days_worked_in_month and attendance_summary_in_month with mixed statuses."""
    with app.app_context():
        today = date.today()
        # Seed 4 different attendance statuses
        a1 = Attendance(worker_id=sample_worker.id, date=date(today.year, today.month, 1), status='Present')
        a2 = Attendance(worker_id=sample_worker.id, date=date(today.year, today.month, 2), status='Half Day')
        a3 = Attendance(worker_id=sample_worker.id, date=date(today.year, today.month, 3), status='Paid Leave')
        a4 = Attendance(worker_id=sample_worker.id, date=date(today.year, today.month, 4), status='Absent')
        db.session.add_all([a1, a2, a3, a4])
        db.session.commit()

        # Effective days: Present(1.0) + Half Day(0.5) + Paid Leave(1.0) + Absent(0) = 2.5
        effective = sample_worker.days_worked_in_month(today.year, today.month)
        assert effective == 2.5

        summary = sample_worker.attendance_summary_in_month(today.year, today.month)
        assert summary['present'] == 1
        assert summary['half_day'] == 1
        assert summary['paid_leave'] == 1
        assert summary['absent'] == 1
        assert summary['effective_days'] == 2.5
        assert summary['total_marked'] == 4
        # Attendance percentage: 2.5 / 4 * 100 = 62.5%
        assert summary['attendance_pct'] == 62.5


def test_worker_attendance_empty_month(app, sample_worker):
    """Verifies that an empty month returns 0.0 percentage safely without division by zero."""
    with app.app_context():
        # Query a past year where no records exist
        summary = sample_worker.attendance_summary_in_month(2020, 1)
        assert summary['total_marked'] == 0
        assert summary['effective_days'] == 0.0
        assert summary['attendance_pct'] == 0.0


def test_attendance_model(app, sample_worker):
    """Test Attendance model with worker relationship."""
    with app.app_context():
        today = date.today()
        att = Attendance(
            worker_id=sample_worker.id,
            date=today,
            status="Present",
            notes="On-time morning shift"
        )
        db.session.add(att)
        db.session.commit()

        fetched = db.session.get(Attendance, att.id)
        assert fetched is not None
        assert fetched.worker_id == sample_worker.id
        assert fetched.status == "Present"
        assert fetched.worker.name == sample_worker.name
        assert "Present" in repr(fetched)


def test_advance_model(app, sample_worker):
    """Test Advance model creation and status."""
    with app.app_context():
        adv = Advance(
            worker_id=sample_worker.id,
            payment_date=date.today(),
            amount_paid=2500.0,
            payment_mode="Cash",
            reason="Festival advance (Diwali)",
            status="Approved"
        )
        db.session.add(adv)
        db.session.commit()

        fetched = db.session.get(Advance, adv.id)
        assert fetched is not None
        assert fetched.amount_paid == 2500.0
        assert fetched.status == "Approved"
        assert fetched.worker.name == sample_worker.name
        assert "2500" in repr(fetched)


def test_vehicle_model(app, sample_worker):
    """Test Vehicle fleet registry model with assigned driver."""
    with app.app_context():
        veh = Vehicle(
            vehicle_number="MH-14-DT-1108",
            vehicle_name="Mahindra Bolero Maxi Truck (Everest Van 2)",
            vehicle_type="Mini Truck",
            fuel_type="Diesel",
            assigned_driver_id=sample_worker.id,
            status="Active"
        )
        db.session.add(veh)
        db.session.commit()

        fetched = db.session.get(Vehicle, veh.id)
        assert fetched is not None
        assert fetched.vehicle_number == "MH-14-DT-1108"
        assert fetched.fuel_type == "Diesel"
        assert fetched.assigned_driver.name == sample_worker.name
        assert "MH-14-DT-1108" in repr(fetched)


def test_vehicle_without_assigned_driver(app):
    """Test Vehicle fleet entry without an assigned driver (common pool vehicle)."""
    with app.app_context():
        veh = Vehicle(
            vehicle_number="MH-14-PL-7700",
            vehicle_name="Piaggio Ape City Beat",
            vehicle_type="Auto Rickshaw",
            fuel_type="CNG",
            assigned_driver_id=None,
            status="Active"
        )
        db.session.add(veh)
        db.session.commit()

        fetched = db.session.get(Vehicle, veh.id)
        assert fetched is not None
        assert fetched.assigned_driver is None
        assert "MH-14-PL-7700" in repr(fetched)


def test_fuel_expense_model(app, sample_vehicle, sample_worker):
    """Test FuelExpense model with vehicle & driver references."""
    with app.app_context():
        fuel = FuelExpense(
            vehicle_id=sample_vehicle.id,
            driver_id=sample_worker.id,
            date=date.today(),
            fuel_type="Diesel",
            amount_spent=3200.0,
            liters=35.5,
            odometer_reading=45200,
            notes="HPCL Highway Pump refill"
        )
        db.session.add(fuel)
        db.session.commit()

        fetched = db.session.get(FuelExpense, fuel.id)
        assert fetched is not None
        assert fetched.amount_spent == 3200.0
        assert fetched.liters == 35.5
        assert fetched.odometer_reading == 45200
        assert fetched.vehicle.vehicle_number == sample_vehicle.vehicle_number
        assert "3200" in repr(fetched)


def test_dispatch_beat_model(app, sample_vehicle, sample_worker):
    """Test DispatchBeat delivery route tracker model with driver and helper."""
    with app.app_context():
        helper = Worker(
            name="Ganesh Helper",
            phone="9800011122",
            role="Helper",
            daily_wage=500.0
        )
        db.session.add(helper)
        db.session.commit()

        dispatch = DispatchBeat(
            beat_name="Route A - Chinchwad Wholesale Hub",
            vehicle_id=sample_vehicle.id,
            driver_id=sample_worker.id,
            helper_id=helper.id,
            dispatch_date=date.today(),
            crates_everest=48,
            cartons_colgate=32,
            status="Dispatched",
            notes="Early morning beat delivery"
        )
        db.session.add(dispatch)
        db.session.commit()

        fetched = db.session.get(DispatchBeat, dispatch.id)
        assert fetched is not None
        assert fetched.crates_everest == 48
        assert fetched.cartons_colgate == 32
        assert fetched.status == "Dispatched"
        assert fetched.driver.name == sample_worker.name
        assert fetched.helper.name == "Ganesh Helper"
        assert "Route A" in repr(fetched)


def test_damaged_return_model(app):
    """Test DamagedReturn claims register model."""
    with app.app_context():
        ret = DamagedReturn(
            return_date=date.today(),
            brand="Everest Spices",
            product_name="Everest Kitchen King Masala 100g",
            retailer_name="Shree Krishna Supermarket",
            batch_no="EV-KK-2512C",
            expiry_date=date.today().strftime('%Y-%m'),
            quantity=12,
            unit="Boxes",
            reason="Near Expiry Batch Return",
            claim_status="Pending Inspection",
            credit_note_amount=840.0,
            credit_note_number="CN-2026-089"
        )
        db.session.add(ret)
        db.session.commit()

        fetched = db.session.get(DamagedReturn, ret.id)
        assert fetched is not None
        assert fetched.brand == "Everest Spices"
        assert fetched.quantity == 12
        assert fetched.credit_note_amount == 840.0
        assert fetched.claim_status == "Pending Inspection"
        assert "Everest" in repr(fetched)


def test_salary_settlement_model(app, sample_worker):
    """Test SalarySettlement monthly payroll ledger model."""
    with app.app_context():
        settlement = SalarySettlement(
            worker_id=sample_worker.id,
            month_year=f"{date.today().year}-{date.today().month:02d}",
            effective_days=26.0,
            gross_earnings=16900.0,
            advances_deducted=2500.0,
            net_payout=14400.0,
            payment_mode="Bank Transfer",
            payment_reference="NEFT-AA-998231",
            settlement_date=date.today(),
            notes="Settled on time"
        )
        db.session.add(settlement)
        db.session.commit()

        fetched = db.session.get(SalarySettlement, settlement.id)
        assert fetched is not None
        assert fetched.effective_days == 26.0
        assert fetched.net_payout == 14400.0
        assert fetched.worker.name == sample_worker.name
        assert "14400" in repr(fetched)
