"""
Database integration and query tests for Anupama Agencies FMCG Distribution Portal.

Tests schema creation, seeder idempotency, unique constraints, cascade deletion behaviors,
and transaction rollback mechanics using an isolated in-memory SQLite database.
"""

import pytest
from datetime import date, timedelta
from sqlalchemy.exc import IntegrityError
from database import init_db, seed_database
from models import (
    db, Worker, Vehicle, FuelExpense,
    DispatchBeat, DamagedReturn, Advance, Attendance
)


def test_init_db(app):
    """Test database table creation and initial seeding."""
    with app.app_context():
        init_db(app)
        assert Worker.query.count() >= 5


def test_seed_database_idempotent(app):
    """Test database seeder creates default FMCG dataset and is idempotent."""
    with app.app_context():
        seed_database(app)

        # Verify workers seeded
        workers = Worker.query.all()
        assert len(workers) >= 5
        active_worker_names = [w.name for w in workers]
        assert any("Ramesh" in name for name in active_worker_names)

        # Verify vehicles seeded
        vehicles = Vehicle.query.all()
        assert len(vehicles) >= 3
        veh_numbers = [v.vehicle_number for v in vehicles]
        assert "MH-14-GH-4921" in veh_numbers

        # Verify advances seeded
        advances = Advance.query.all()
        assert len(advances) >= 3

        # Verify fuel logs seeded
        fuels = FuelExpense.query.all()
        assert len(fuels) >= 3

        # Verify dispatches seeded
        dispatches = DispatchBeat.query.all()
        assert len(dispatches) >= 3

        # Verify damaged returns seeded
        returns = DamagedReturn.query.all()
        assert len(returns) >= 2

        # Running seed_database again must not duplicate data
        seed_database(app)
        assert len(Worker.query.all()) == len(workers)


def test_cascade_delete_worker(app, sample_worker):
    """Verifies that deleting a worker cascades to delete related attendance and advances."""
    with app.app_context():
        # Attach attendance
        att = Attendance(worker_id=sample_worker.id, date=date.today(), status='Present')
        # Attach advance
        adv = Advance(worker_id=sample_worker.id, amount_paid=1000.0, status='Approved')
        db.session.add_all([att, adv])
        db.session.commit()

        # Confirm child rows exist
        assert Attendance.query.filter_by(worker_id=sample_worker.id).count() == 1
        assert Advance.query.filter_by(worker_id=sample_worker.id).count() == 1

        # Delete the worker
        w_to_del = db.session.get(Worker, sample_worker.id)
        db.session.delete(w_to_del)
        db.session.commit()

        # Confirm child rows were cascaded and removed
        assert Attendance.query.filter_by(worker_id=sample_worker.id).count() == 0
        assert Advance.query.filter_by(worker_id=sample_worker.id).count() == 0


def test_unique_constraint_attendance_date(app, sample_worker):
    """Verifies that two attendance records for the same worker on the same date violate uq constraint."""
    with app.app_context():
        today = date.today()
        att1 = Attendance(worker_id=sample_worker.id, date=today, status='Present')
        db.session.add(att1)
        db.session.commit()

        att2 = Attendance(worker_id=sample_worker.id, date=today, status='Half Day')
        db.session.add(att2)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_unique_constraint_vehicle_number(app, sample_worker):
    """Verifies that two vehicles cannot be registered with identical registration numbers."""
    with app.app_context():
        v1 = Vehicle(
            vehicle_number="MH-14-AA-1234",
            vehicle_name="Everest Van 1",
            fuel_type="Diesel"
        )
        db.session.add(v1)
        db.session.commit()

        v2 = Vehicle(
            vehicle_number="MH-14-AA-1234",
            vehicle_name="Duplicate Registration",
            fuel_type="Diesel"
        )
        db.session.add(v2)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_fuel_expense_filtering_and_sum(app, sample_vehicle, sample_worker):
    """Tests SQLAlchemy queries aggregating fuel volume and expenditures."""
    with app.app_context():
        today = date.today()
        f1 = FuelExpense(
            vehicle_id=sample_vehicle.id,
            driver_id=sample_worker.id,
            date=today,
            fuel_type="Diesel",
            amount_spent=3000.0,
            liters=33.3
        )
        f2 = FuelExpense(
            vehicle_id=sample_vehicle.id,
            driver_id=sample_worker.id,
            date=today - timedelta(days=2),
            fuel_type="Diesel",
            amount_spent=2000.0,
            liters=22.2
        )
        db.session.add_all([f1, f2])
        db.session.commit()

        # Query and calculate total spent for this vehicle
        expenses = FuelExpense.query.filter_by(vehicle_id=sample_vehicle.id).all()
        assert len(expenses) == 2
        total_spent = sum(e.amount_spent for e in expenses)
        total_liters = sum(e.liters for e in expenses)
        assert total_spent == 5000.0
        assert round(total_liters, 1) == 55.5
