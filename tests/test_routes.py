import pytest
from datetime import date, timedelta
from models import (
    db, Worker, Vehicle, FuelExpense,
    DispatchBeat, DamagedReturn, Advance, SalarySettlement, Attendance
)


def test_dashboard_route(client, seeded_app):
    """Test dashboard route rendering and KPI computations."""
    response = client.get('/')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert "Anupama Agencies" in html
    assert "Everest" in html or "Colgate" in html


def test_workers_list_and_add(client, app):
    """Test godown workers listing and adding a new worker."""
    # List workers
    resp = client.get('/workers')
    assert resp.status_code == 200

    # Add worker
    resp = client.post('/workers/add', data={
        'name': 'Ganesh Gaikwad',
        'phone': '9812345678',
        'emergency_contact': '9812345679',
        'role': 'Senior Delivery Van Driver',
        'daily_wage': '700',
        'monthly_salary': '18200',
        'status': 'Active'
    }, follow_redirects=True)
    assert resp.status_code == 200
    assert b"Ganesh Gaikwad" in resp.data

    # Verify worker in DB
    worker = Worker.query.filter_by(name='Ganesh Gaikwad').first()
    assert worker is not None
    assert worker.daily_wage == 700.0

    # View worker profile
    view_resp = client.get(f'/workers/{worker.id}')
    assert view_resp.status_code == 200
    assert b"Ganesh Gaikwad" in view_resp.data

    # Edit worker
    edit_resp = client.post(f'/workers/{worker.id}/edit', data={
        'name': 'Ganesh Gaikwad Updated',
        'phone': '9812345678',
        'emergency_contact': '9812345679',
        'role': 'Warehouse Supervisor',
        'daily_wage': '800',
        'monthly_salary': '20800',
        'status': 'Active'
    }, follow_redirects=True)
    assert edit_resp.status_code == 200
    assert b"Ganesh Gaikwad Updated" in edit_resp.data


def test_attendance_routes(client, sample_worker):
    """Test daily attendance registry and monthly muster view."""
    # GET daily attendance
    resp = client.get('/attendance')
    assert resp.status_code == 200

    # POST save daily attendance
    today_str = date.today().strftime('%Y-%m-%d')
    save_resp = client.post('/attendance/save', data={
        'attendance_date': today_str,
        f'status_{sample_worker.id}': 'Present',
        f'notes_{sample_worker.id}': 'Morning regular shift'
    }, follow_redirects=True)
    assert save_resp.status_code == 200

    # GET monthly muster
    monthly_resp = client.get('/attendance/monthly')
    assert monthly_resp.status_code == 200


def test_advances_routes(client, sample_worker):
    """Test advance khata ledger, requesting advance and status transition."""
    # GET ledger
    resp = client.get('/advances')
    assert resp.status_code == 200

    # POST add advance
    today_str = date.today().strftime('%Y-%m-%d')
    add_resp = client.post('/advances/add', data={
        'worker_id': str(sample_worker.id),
        'amount': '1500',
        'payment_mode': 'Cash',
        'reason': 'Emergency household expense',
        'request_date': today_str,
        'payment_date': today_str
    }, follow_redirects=True)
    assert add_resp.status_code == 200
    assert b"1,500" in add_resp.data or b"1500" in add_resp.data

    adv = Advance.query.filter_by(worker_id=sample_worker.id).first()
    assert adv is not None

    # POST change status
    status_resp = client.post(f'/advances/{adv.id}/status', data={
        'status': 'Settled'
    }, follow_redirects=True)
    assert status_resp.status_code == 200
    assert adv.status == 'Settled'


def test_fuel_and_vehicle_routes(client, sample_worker):
    """Test fuel logging and vehicle registry operations."""
    # GET vehicles registry
    veh_resp = client.get('/fuel/vehicles')
    assert veh_resp.status_code == 200

    # POST add new vehicle
    add_veh_resp = client.post('/fuel/vehicles/add', data={
        'vehicle_number': 'MH-14-ZZ-9999',
        'vehicle_name': 'Everest Spices Van 3',
        'vehicle_type': 'Delivery Van',
        'fuel_type': 'Diesel',
        'assigned_driver_id': str(sample_worker.id),
        'status': 'Active'
    }, follow_redirects=True)
    assert add_veh_resp.status_code == 200
    assert b"MH-14-ZZ-9999" in add_veh_resp.data

    new_veh = Vehicle.query.filter_by(vehicle_number='MH-14-ZZ-9999').first()
    assert new_veh is not None

    # GET fuel dashboard
    fuel_resp = client.get('/fuel')
    assert fuel_resp.status_code == 200

    # POST log fuel expense
    today_str = date.today().strftime('%Y-%m-%d')
    log_fuel_resp = client.post('/fuel/add', data={
        'vehicle_id': str(new_veh.id),
        'driver_id': str(sample_worker.id),
        'date': today_str,
        'fuel_type': 'Diesel',
        'amount_spent': '2400',
        'liters': '26.5',
        'odometer_reading': '32000',
        'notes': 'BPCL highway pump refill'
    }, follow_redirects=True)
    assert log_fuel_resp.status_code == 200

    # Test vehicle deletion safeguard: vehicle on active route cannot be removed
    dispatch = DispatchBeat(
        beat_name="Active Test Route",
        vehicle_id=new_veh.id,
        driver_id=sample_worker.id,
        crates_everest=20,
        cartons_colgate=10,
        status="Dispatched"
    )
    db.session.add(dispatch)
    db.session.commit()

    del_blocked_resp = client.post(f'/fuel/vehicles/delete/{new_veh.id}', follow_redirects=True)
    assert del_blocked_resp.status_code == 200
    assert b"Cannot remove vehicle" in del_blocked_resp.data
    assert Vehicle.query.get(new_veh.id) is not None

    # Clear active dispatch and test vehicle deletion success
    db.session.delete(dispatch)
    db.session.commit()

    del_success_resp = client.post(f'/fuel/vehicles/delete/{new_veh.id}', follow_redirects=True)
    assert del_success_resp.status_code == 200
    assert b"removed successfully" in del_success_resp.data
    assert Vehicle.query.get(new_veh.id) is None


def test_dispatches_routes(client, sample_vehicle, sample_worker):
    """Test daily FMCG beat delivery dispatches."""
    resp = client.get('/dispatches')
    assert resp.status_code == 200

    # POST add beat dispatch
    today_str = date.today().strftime('%Y-%m-%d')
    add_resp = client.post('/dispatches/add', data={
        'dispatch_date': today_str,
        'beat_name': 'Sector 15 Kirana Wholesale Beat',
        'vehicle_id': str(sample_vehicle.id),
        'driver_id': str(sample_worker.id),
        'helper_id': '',
        'crates_everest': '45',
        'cartons_colgate': '30',
        'notes': 'Everest Garam Masala & Colgate MaxFresh'
    }, follow_redirects=True)
    assert add_resp.status_code == 200

    beat = DispatchBeat.query.filter_by(beat_name='Sector 15 Kirana Wholesale Beat').first()
    assert beat is not None
    assert beat.status == 'Dispatched'

    # POST update status
    status_resp = client.post(f'/dispatches/{beat.id}/status', data={
        'status': 'Completed'
    }, follow_redirects=True)
    assert status_resp.status_code == 200
    assert beat.status == 'Completed'


def test_returns_routes(client):
    """Test damaged and expired FMCG claims registration."""
    resp = client.get('/returns')
    assert resp.status_code == 200

    # POST add damage return
    today_str = date.today().strftime('%Y-%m-%d')
    add_resp = client.post('/returns/add', data={
        'return_date': today_str,
        'brand': 'Everest Spices',
        'product_name': 'Everest Chaat Masala 100g',
        'retailer_name': 'Shri Mahavir Provisions',
        'batch_no': 'EV-CM-2601',
        'expiry_date': '2027-02',
        'quantity': '5',
        'unit': 'Cartons',
        'reason': 'Damaged in Transit',
        'credit_note_amount': '1250',
        'notes': 'Outer box crushed'
    }, follow_redirects=True)
    assert add_resp.status_code == 200

    claim = DamagedReturn.query.filter_by(batch_no='EV-CM-2601').first()
    assert claim is not None
    assert claim.claim_status == 'Pending Inspection'

    # POST update claim status
    update_resp = client.post(f'/returns/{claim.id}/update-claim', data={
        'claim_status': 'Credit Note Received',
        'credit_note_amount': '1250',
        'credit_note_number': 'CN-EV-99120',
        'notes': 'Credited by Everest Depot'
    }, follow_redirects=True)
    assert update_resp.status_code == 200
    assert claim.claim_status == 'Credit Note Received'
    assert claim.credit_note_number == 'CN-EV-99120'


def test_salary_settlement_routes(client, sample_worker):
    """Test monthly payroll calculation, voucher display, and settlement processing."""
    # Seed 1 attendance record for sample_worker
    att = Attendance(worker_id=sample_worker.id, date=date.today(), status='Present')
    db.session.add(att)
    db.session.commit()

    # GET settlements dashboard
    resp = client.get('/settlements')
    assert resp.status_code == 200

    # POST process settlement
    month_val = f"{date.today().year}-{date.today().month:02d}"
    proc_resp = client.post('/settlements/process', data={
        'worker_id': str(sample_worker.id),
        'month_year': month_val,
        'bonus_incentive': '500',
        'advances_deducted': '0',
        'payment_mode': 'Bank Transfer',
        'payment_reference': 'NEFT-TEST-001',
        'notes': 'Monthly salary processed'
    }, follow_redirects=True)
    assert proc_resp.status_code == 200

    settlement = SalarySettlement.query.filter_by(worker_id=sample_worker.id).first()
    assert settlement is not None
    # 1 day * 650 daily wage + 500 bonus = 1150
    assert settlement.net_payout == 1150.0

    # GET voucher
    vouch_resp = client.get(f'/settlements/voucher/{settlement.id}')
    assert vouch_resp.status_code == 200
    assert b"PAYMENT VOUCHER" in vouch_resp.data or b"Salary" in vouch_resp.data


def test_export_csv_routes(client, seeded_app):
    """Test all CSV download export routes."""
    routes = [
        '/export/attendance',
        '/export/advances',
        '/export/fuel',
        '/export/settlements',
        '/export/returns'
    ]
    for r in routes:
        resp = client.get(r)
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("Content-Type", "")
        # Verify UTF-8 BOM is present
        assert resp.data.startswith(b'\xef\xbb\xbf')


def test_api_fefo_analyze_get(client):
    """Test GET /api/fefo/analyze endpoint."""
    resp = client.get('/api/fefo/analyze')
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data['status'] == 'success'
    assert 'ranked_batches' in json_data
    assert len(json_data['ranked_batches']) >= 1


def test_api_fefo_analyze_post(client):
    """Test POST /api/fefo/analyze endpoint."""
    resp = client.post('/api/fefo/analyze', json={
        'batches': [
            {
                'brand': 'Everest Spices',
                'product': 'Everest Garam Masala 100g',
                'batch': 'EV-GM-2610A',
                'exp': '2027-05-18',
                'qty': 45
            }
        ]
    })
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data['status'] == 'success'
    assert 'ranked_batches' in json_data
    assert json_data['ranked_batches'][0]['batch'] == 'EV-GM-2610A'


def test_api_attendance_summary(client, sample_worker):
    """Test GET /api/attendance/summary/<worker_id>."""
    resp = client.get(f'/api/attendance/summary/{sample_worker.id}')
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data['status'] == 'success'
    assert json_data['worker_name'] == sample_worker.name
    assert 'attendance_summary' in json_data


def test_api_fuel_analytics(client, seeded_app):
    """Test GET /api/fuel/analytics."""
    resp = client.get('/api/fuel/analytics')
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data['status'] == 'success'
    assert 'current_month' in json_data
    assert 'chart_data' in json_data


def test_api_dispatches_metrics(client, seeded_app):
    """Test GET /api/dispatches/metrics."""
    resp = client.get('/api/dispatches/metrics')
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data['status'] == 'success'
    assert 'metrics' in json_data


def test_api_returns_summary(client, seeded_app):
    """Test GET /api/returns/summary."""
    resp = client.get('/api/returns/summary')
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data['status'] == 'success'
    assert 'claims_summary' in json_data
