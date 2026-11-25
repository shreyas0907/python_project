from datetime import date, datetime
import pytest
from models import (
    db, Worker, Attendance, Advance, Vehicle,
    FuelExpense, DispatchBeat, DamagedReturn, SalarySettlement
)


def test_worker_model_creation(app):
    """Test Worker model instantiation and properties."""
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
    """Test Vehicle fleet registry model."""
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
    """Test DispatchBeat delivery route tracker model."""
    with app.app_context():
        dispatch = DispatchBeat(
            beat_name="Route A - Chinchwad Wholesale Hub",
            vehicle_id=sample_vehicle.id,
            driver_id=sample_worker.id,
            helper_id=None,
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
            expiry_date=date.today(),
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
