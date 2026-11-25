"""
Data models for the Anupama Agencies FMCG Distribution Management Portal.

This module defines the SQLAlchemy ORM models representing the distributor's
core operational entities, including warehouse staff, attendance muster records,
staff advance loans, delivery vehicles, fleet fuel consumption logs, daily beat
dispatches, product damage and expiry claims, and monthly salary settlements.
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

db = SQLAlchemy()


class Worker(db.Model):
    """Represents a godown worker or logistics staff member.

    Attributes:
        id (int): Primary key identifying the worker.
        name (str): Full legal name of the staff member.
        phone (str): Contact mobile telephone number.
        emergency_contact (Optional[str]): Emergency contact phone number.
        role (str): Operational assignment (e.g., Loader, Driver, Helper, Supervisor).
        join_date (date): Date on which employment commenced.
        daily_wage (float): Standard daily compensation rate in INR.
        monthly_salary (float): Fixed monthly salary baseline in INR.
        status (str): Employment status ('Active' or 'Inactive').
        photo_path (Optional[str]): Relative web path to uploaded portrait photo.
        created_at (datetime): Timestamp when the worker record was created.
        attendances (List[Attendance]): One-to-many relationship with attendance logs.
        advances (List[Advance]): One-to-many relationship with advance cash loans.
        salary_settlements (List[SalarySettlement]): Monthly payroll payout records.
    """
    __tablename__ = 'workers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    emergency_contact = db.Column(db.String(20), nullable=True)
    role = db.Column(db.String(60), nullable=False)
    join_date = db.Column(db.Date, nullable=False, default=date.today)
    daily_wage = db.Column(db.Float, nullable=False, default=500.0)
    monthly_salary = db.Column(db.Float, nullable=False, default=15000.0)
    status = db.Column(db.String(20), nullable=False, default='Active')
    photo_path = db.Column(db.String(255), nullable=True, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationships
    attendances = db.relationship('Attendance', backref='worker', lazy=True, cascade='all, delete-orphan')
    advances = db.relationship('Advance', backref='worker', lazy=True, cascade='all, delete-orphan')
    salary_settlements = db.relationship('SalarySettlement', backref='worker', lazy=True, cascade='all, delete-orphan')

    @property
    def total_advances_pending(self) -> float:
        """Calculates total approved advances that have not yet been settled.

        Returns:
            float: Total monetary sum of unsettled advances in INR.
        """
        approved_advances = [a.amount_paid for a in self.advances if a.status == 'Approved']
        return float(sum(approved_advances))

    @property
    def total_advances_taken(self) -> float:
        """Calculates cumulative historical total of advances disbursed.

        Returns:
            float: Total monetary sum of all approved and settled advances in INR.
        """
        return float(sum([a.amount_paid for a in self.advances if a.status in ('Approved', 'Settled')]))

    def days_worked_in_month(self, year: int, month: int) -> float:
        """Calculates effective payable days worked within a calendar month.

        Present days and Paid Leaves yield 1.0 day; Half Days yield 0.5 day;
        Absences yield 0.0 day.

        Args:
            year (int): Calendar year (e.g., 2026).
            month (int): Calendar month (1-12).

        Returns:
            float: Effective worked days for the specified month.
        """
        recs = [a for a in self.attendances if a.date.year == year and a.date.month == month]
        effective_days: float = 0.0
        for r in recs:
            if r.status in ('Present', 'Paid Leave'):
                effective_days += 1.0
            elif r.status == 'Half Day':
                effective_days += 0.5
        return effective_days

    def attendance_summary_in_month(self, year: int, month: int) -> Dict[str, Any]:
        """Generates a structured attendance muster breakdown for a specific month.

        Args:
            year (int): Calendar year.
            month (int): Calendar month.

        Returns:
            Dict[str, Any]: Dictionary containing present, half_day, absent, paid_leave
                counts, effective_days, total_marked, and attendance_pct rate.
        """
        recs = [a for a in self.attendances if a.date.year == year and a.date.month == month]
        present: int = sum(1 for a in recs if a.status == 'Present')
        half_day: int = sum(1 for a in recs if a.status == 'Half Day')
        absent: int = sum(1 for a in recs if a.status == 'Absent')
        paid_leave: int = sum(1 for a in recs if a.status == 'Paid Leave')
        effective: float = float(present + paid_leave + (half_day * 0.5))
        total_marked: int = len(recs)
        pct: float = (effective / total_marked * 100) if total_marked > 0 else 0.0
        return {
            'present': present,
            'half_day': half_day,
            'absent': absent,
            'paid_leave': paid_leave,
            'effective_days': effective,
            'total_marked': total_marked,
            'attendance_pct': round(pct, 1)
        }

    def __repr__(self) -> str:
        """Returns string representation of the Worker model."""
        return f"<Worker {self.id}: {self.name} ({self.role})>"


class Attendance(db.Model):
    """Tracks daily shift attendance for an individual worker.

    Attributes:
        id (int): Primary key.
        worker_id (int): Foreign key referencing the associated worker.
        date (date): Calendar date of the attendance entry.
        status (str): Attendance status ('Present', 'Half Day', 'Absent', 'Paid Leave').
        notes (Optional[str]): Operational notes, shift remarks, or reason for absence.
        created_at (datetime): Timestamp when entry was logged.
    """
    __tablename__ = 'attendance'
    __table_args__ = (
        db.UniqueConstraint('worker_id', 'date', name='uq_worker_attendance_date'),
    )

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(20), nullable=False, default='Present')
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self) -> str:
        """Returns string representation of the Attendance model."""
        return f"<Attendance Worker={self.worker_id} Date={self.date} Status={self.status}>"


class Advance(db.Model):
    """Represents a salary advance or emergency cash loan requested by a worker.

    Attributes:
        id (int): Primary key.
        worker_id (int): Foreign key referencing the associated worker.
        request_date (date): Date on which the advance was formally requested.
        payment_date (date): Date on which cash or digital disbursement occurred.
        amount_requested (float): Requested loan amount in INR.
        amount_paid (float): Actual disbursed amount in INR.
        payment_mode (str): Disbursement method ('Cash', 'UPI', 'Bank Transfer').
        reason (Optional[str]): Purpose or stated emergency need.
        status (str): Workflow status ('Pending', 'Approved', 'Settled').
        settlement_id (Optional[int]): Foreign key linking to the settling payroll payout.
        created_at (datetime): Creation timestamp.
    """
    __tablename__ = 'advances'

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    request_date = db.Column(db.Date, nullable=False, default=date.today)
    payment_date = db.Column(db.Date, nullable=False, default=date.today)
    amount_requested = db.Column(db.Float, nullable=False, default=0.0)
    amount_paid = db.Column(db.Float, nullable=False, default=0.0)
    payment_mode = db.Column(db.String(30), nullable=False, default='Cash')
    reason = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='Approved')
    settlement_id = db.Column(db.Integer, db.ForeignKey('salary_settlements.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self) -> str:
        """Returns string representation of the Advance model."""
        return f"<Advance #{self.id} Worker={self.worker_id} Amt={self.amount_paid} Status={self.status}>"


class Vehicle(db.Model):
    """Represents an FMCG delivery van, mini truck, or beat vehicle in the fleet.

    Attributes:
        id (int): Primary key.
        vehicle_number (str): Official government registration plate (e.g., MH-14-GH-4921).
        vehicle_name (str): Fleet nickname and brand assignment.
        vehicle_type (str): Category (e.g., 'Delivery Van', 'Mini Truck', 'Auto Rickshaw').
        fuel_type (str): Primary fuel type ('Diesel', 'Petrol', 'CNG').
        assigned_driver_id (Optional[int]): Foreign key referencing the default worker driver.
        status (str): Operational readiness ('Active', 'Maintenance', 'Inactive').
        created_at (datetime): Record creation timestamp.
        assigned_driver (Optional[Worker]): Relationship to the assigned driver.
        fuel_expenses (List[FuelExpense]): One-to-many relationship with fuel logs.
        dispatches (List[DispatchBeat]): One-to-many relationship with beat route runs.
    """
    __tablename__ = 'vehicles'

    id = db.Column(db.Integer, primary_key=True)
    vehicle_number = db.Column(db.String(50), nullable=False, unique=True)
    vehicle_name = db.Column(db.String(120), nullable=False)
    vehicle_type = db.Column(db.String(50), nullable=False, default='Delivery Van')
    fuel_type = db.Column(db.String(20), nullable=False, default='Diesel')
    assigned_driver_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='Active')
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationships
    assigned_driver = db.relationship('Worker', foreign_keys=[assigned_driver_id], lazy=True)
    fuel_expenses = db.relationship('FuelExpense', backref='vehicle', lazy=True, cascade='all, delete-orphan')
    dispatches = db.relationship('DispatchBeat', backref='vehicle', lazy=True)

    def __repr__(self) -> str:
        """Returns string representation of the Vehicle model."""
        return f"<Vehicle {self.vehicle_number} ({self.vehicle_name})>"


class FuelExpense(db.Model):
    """Tracks a single fuel refill transaction for a delivery vehicle.

    Attributes:
        id (int): Primary key.
        vehicle_id (int): Foreign key referencing the refueled vehicle.
        driver_id (Optional[int]): Foreign key referencing the driver who made purchase.
        date (date): Transaction date.
        fuel_type (str): Type of fuel dispensed ('Diesel', 'Petrol', 'CNG').
        amount_spent (float): Total transaction cost in INR.
        liters (float): Fuel volume dispensed in liters or kilograms.
        odometer_reading (Optional[int]): Current vehicle odometer reading in kilometers.
        receipt_image (Optional[str]): File path to uploaded petrol pump receipt photo.
        notes (Optional[str]): Fuel station brand and route notes.
        created_at (datetime): Timestamp of logging.
        driver (Optional[Worker]): Relationship to driver.
    """
    __tablename__ = 'fuel_expenses'

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=True)
    date = db.Column(db.Date, nullable=False, default=date.today)
    fuel_type = db.Column(db.String(20), nullable=False, default='Diesel')
    amount_spent = db.Column(db.Float, nullable=False, default=0.0)
    liters = db.Column(db.Float, nullable=False, default=0.0)
    odometer_reading = db.Column(db.Integer, nullable=True)
    receipt_image = db.Column(db.String(255), nullable=True, default='')
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    driver = db.relationship('Worker', foreign_keys=[driver_id], lazy=True)

    def __repr__(self) -> str:
        """Returns string representation of the FuelExpense model."""
        return f"<FuelExpense #{self.id} Vehicle={self.vehicle_id} Amt={self.amount_spent}>"


class DispatchBeat(db.Model):
    """Tracks a daily retail market delivery route / beat dispatch.

    Attributes:
        id (int): Primary key.
        dispatch_date (date): Date of the delivery beat run.
        beat_name (str): Assigned retail market territory (e.g., 'Main Bazaar Kirana').
        vehicle_id (int): Foreign key referencing the delivery vehicle used.
        driver_id (Optional[int]): Foreign key referencing the delivery driver.
        helper_id (Optional[int]): Foreign key referencing the godown helper assistant.
        crates_everest (int): Count of Everest Spices crates loaded.
        cartons_colgate (int): Count of Colgate-Palmolive cartons loaded.
        status (str): Route status ('Dispatched', 'Completed').
        notes (Optional[str]): Beat notes, drop counts, or customer feedback.
        created_at (datetime): Timestamp of record entry.
        driver (Optional[Worker]): Relationship to the assigned driver.
        helper (Optional[Worker]): Relationship to the assigned helper.
    """
    __tablename__ = 'dispatch_beats'

    id = db.Column(db.Integer, primary_key=True)
    dispatch_date = db.Column(db.Date, nullable=False, default=date.today)
    beat_name = db.Column(db.String(120), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=True)
    helper_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=True)
    crates_everest = db.Column(db.Integer, nullable=False, default=0)
    cartons_colgate = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(30), nullable=False, default='Dispatched')
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    driver = db.relationship('Worker', foreign_keys=[driver_id], lazy=True)
    helper = db.relationship('Worker', foreign_keys=[helper_id], lazy=True)

    def __repr__(self) -> str:
        """Returns string representation of the DispatchBeat model."""
        return f"<DispatchBeat #{self.id} Beat={self.beat_name} Date={self.dispatch_date}>"


class DamagedReturn(db.Model):
    """Tracks damaged or expired stock returned from retail counters for depot credit.

    Attributes:
        id (int): Primary key.
        return_date (date): Date when damaged stock was received at the godown.
        brand (str): Manufacturing principal ('Everest Spices', 'Colgate-Palmolive').
        product_name (str): Specific SKU description (e.g., 'Everest Garam Masala 100g').
        retailer_name (str): Sub-stockist or retailer who initiated the return.
        batch_no (Optional[str]): Production batch code from outer packaging.
        expiry_date (Optional[str]): Formatted expiry string (e.g., '2027-04').
        quantity (int): Number of damaged or expired units returned.
        unit (str): Unit measurement ('Cartons', 'Packets', 'Tubes', 'Boxes').
        reason (str): Cause ('Damaged in Transit', 'Expired', 'Packaging Leaking', 'Seal Broken').
        claim_status (str): Depot claim lifecycle ('Pending Inspection', 'Submitted to Depot',
            'Credit Note Received', 'Rejected').
        credit_note_amount (float): Valuation of credit claim in INR.
        credit_note_number (Optional[str]): Principal company credit note reference code.
        notes (Optional[str]): Depot inspection notes and resolution details.
        created_at (datetime): Log creation timestamp.
    """
    __tablename__ = 'damaged_returns'

    id = db.Column(db.Integer, primary_key=True)
    return_date = db.Column(db.Date, nullable=False, default=date.today)
    brand = db.Column(db.String(50), nullable=False)
    product_name = db.Column(db.String(150), nullable=False)
    retailer_name = db.Column(db.String(150), nullable=False)
    batch_no = db.Column(db.String(50), nullable=True)
    expiry_date = db.Column(db.String(30), nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit = db.Column(db.String(30), nullable=False, default='Cartons')
    reason = db.Column(db.String(100), nullable=False, default='Damaged in Transit')
    claim_status = db.Column(db.String(50), nullable=False, default='Pending Inspection')
    credit_note_amount = db.Column(db.Float, nullable=False, default=0.0)
    credit_note_number = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self) -> str:
        """Returns string representation of the DamagedReturn model."""
        return f"<DamagedReturn #{self.id} Brand={self.brand} Product={self.product_name}>"


class SalarySettlement(db.Model):
    """Represents a monthly salary calculation, advance deduction, and payout record.

    Attributes:
        id (int): Primary key.
        worker_id (int): Foreign key referencing the paid worker.
        month_year (str): Calendar payroll period in 'YYYY-MM' format.
        days_present (float): Full day shift counts.
        half_days (float): Half day shift counts.
        paid_leaves (float): Approved paid leave counts.
        absent_days (float): Unexcused absence counts.
        effective_days (float): Total effective payable days worked.
        daily_wage (float): Applicable daily rate during period.
        gross_earnings (float): Total gross earned compensation in INR.
        advances_deducted (float): Sum deducted towards unpaid advances in INR.
        bonus_incentive (float): Discretionary performance incentive in INR.
        net_payout (float): Final net disbursed payout amount in INR.
        settlement_date (date): Date payment was disbursed.
        payment_mode (str): Payment channel ('Cash', 'Bank Transfer', 'UPI').
        payment_reference (Optional[str]): Bank transaction reference or cheque number.
        notes (Optional[str]): Remarks or deduction justifications.
        created_at (datetime): Record creation timestamp.
        settled_advances (List[Advance]): Linked advances settled in this payment voucher.
    """
    __tablename__ = 'salary_settlements'

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    month_year = db.Column(db.String(7), nullable=False)
    days_present = db.Column(db.Float, nullable=False, default=0.0)
    half_days = db.Column(db.Float, nullable=False, default=0.0)
    paid_leaves = db.Column(db.Float, nullable=False, default=0.0)
    absent_days = db.Column(db.Float, nullable=False, default=0.0)
    effective_days = db.Column(db.Float, nullable=False, default=0.0)
    daily_wage = db.Column(db.Float, nullable=False, default=0.0)
    gross_earnings = db.Column(db.Float, nullable=False, default=0.0)
    advances_deducted = db.Column(db.Float, nullable=False, default=0.0)
    bonus_incentive = db.Column(db.Float, nullable=False, default=0.0)
    net_payout = db.Column(db.Float, nullable=False, default=0.0)
    settlement_date = db.Column(db.Date, nullable=False, default=date.today)
    payment_mode = db.Column(db.String(30), nullable=False, default='Cash')
    payment_reference = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Linked advances settled in this payment
    settled_advances = db.relationship('Advance', backref='settlement', lazy=True)

    def __repr__(self) -> str:
        """Returns string representation of the SalarySettlement model."""
        return f"<SalarySettlement #{self.id} Worker={self.worker_id} Month={self.month_year} Net={self.net_payout}>"
