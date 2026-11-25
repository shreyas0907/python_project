import pytest
from database import init_db, seed_database
from models import (
    db, Worker, Vehicle, FuelExpense,
    DispatchBeat, DamagedReturn, Advance
)


def test_init_db(app):
    """Test database table creation."""
    with app.app_context():
        # init_db creates all tables safely and seeds if empty
        init_db(app)
        # Verify tables are seeded and usable
        assert Worker.query.count() >= 5


def test_seed_database(app):
    """Test database seeder creates default FMCG distribution dataset."""
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

        # Running seed_database again should not duplicate data
        seed_database(app)
        assert len(Worker.query.all()) == len(workers)
