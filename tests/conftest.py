import pytest
from datetime import date, datetime
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app as flask_app
from models import (
    db, Worker, Attendance, Advance, Vehicle,
    FuelExpense, DispatchBeat, DamagedReturn, SalarySettlement
)
from database import seed_database


@pytest.fixture
def app():
    """
    Creates and configures a clean testing Flask application
    using an isolated in-memory SQLite database.
    """
    flask_app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'SECRET_KEY': 'test-secret-key-for-pytest',
        'WTF_CSRF_ENABLED': False
    })

    with flask_app.app_context():
        db.session.expire_on_commit = False
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """
    A test client for dispatching HTTP requests against the Flask app.
    """
    return app.test_client()


@pytest.fixture
def seeded_app(app):
    """
    App fixture with initial FMCG distribution seed data pre-populated.
    """
    seed_database(app)
    yield app


@pytest.fixture
def sample_worker(app):
    """
    Creates and returns a sample active godown worker.
    """
    worker = Worker(
        name="Ramesh Pawar",
        phone="9822011223",
        emergency_contact="9822099887",
        role="Driver",
        daily_wage=650.0,
        monthly_salary=16900.0,
        status="Active"
    )
    db.session.add(worker)
    db.session.commit()
    return worker


@pytest.fixture
def sample_vehicle(app, sample_worker):
    """
    Creates and returns a sample delivery vehicle.
    """
    veh = Vehicle(
        vehicle_number="MH-14-GH-4921",
        vehicle_name="Tata Ace Gold (Everest Van 1)",
        vehicle_type="Delivery Van",
        fuel_type="Diesel",
        assigned_driver_id=sample_worker.id,
        status="Active"
    )
    db.session.add(veh)
    db.session.commit()
    return veh
