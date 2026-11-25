/**
 * Anupama Agencies — FMCG Distributor Web Application (Everest & Colgate)
 * Core Client Controller & Persistent State Engine
 */

// -------------------------------------------------------------------
// 1. STORAGE & STATE MANAGEMENT (PERMANENT LOCALSTORAGE PERSISTENCE)
// -------------------------------------------------------------------
const DB_STORAGE_KEY = 'anupama_agencies_db_v1';
const FIREBASE_SYNC_PATH = 'agencies/anupama_agencies/db';
const DEFAULT_AGENCY_PIN = '3007';
const PIN_STORAGE_KEY = 'anupama_agency_pin_unlocked';

let firebaseDbRef = null;
let isInitialCloudSyncDone = false;
let isLocalSaving = false;

function getInitialStockBatchesSeed() {
    const today = new Date();
    const makeDate = (offsetDays) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
    };

    return [
        {
            id: 1,
            brand: "Everest Spices",
            product: "Everest Garam Masala 100g",
            batch: "EV-GM-2610A",
            mfg: makeDate(-45),
            exp: makeDate(180),
            qty: 45,
            notes: "Fresh shipment from Vashi central depot"
        },
        {
            id: 2,
            brand: "Colgate-Palmolive",
            product: "Colgate MaxFresh Blue Gel 150g",
            batch: "CP-MF-2609B",
            mfg: makeDate(-60),
            exp: makeDate(240),
            qty: 60,
            notes: "Sanand Plant batch - High demand item"
        },
        {
            id: 3,
            brand: "Everest Spices",
            product: "Everest Kashmiri Mirch Powder 100g", 
            batch: "EV-KM-2608C",
            mfg: makeDate(-30),
            exp: makeDate(120),
            qty: 32,
            notes: "Festival stock reserve" 
        },
        {
            id: 4,
            brand: "Everest Spices",
            product: "Everest Kitchen King Masala 100g",
            batch: "EV-KK-2603X",
            mfg: makeDate(-160),
            exp: makeDate(22),
            qty: 18,
            notes: "FEFO Alert: Prioritize for wholesale beat"
        },
        {
            id: 5,
            brand: "Colgate-Palmolive",
            product: "Colgate Vedshakti Herbal 100g",
            batch: "CP-VS-2604Y",
            mfg: makeDate(-170), 
            exp: makeDate(14),
            qty: 12,
            notes: "FEFO Alert: High priority dispatch"
        },
        {
            id: 6,
            brand: "Everest Spices",
            product: "Everest Chhole Masala 100g",
            batch: "EV-CH-2511Z",
            mfg: makeDate(-365),
            exp: makeDate(-8),
            qty: 6,
            notes: "Damaged/Old Crate: Quarantine for return claim"
        }
    ];
}

function normalizeAppData(data) {
    if (!data || typeof data !== 'object') data = {};
    const toArr = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return Object.values(val);
        return [];
    };
    return {
        version: data.version || 1, 
        lastUpdated: data.lastUpdated || Date.now(),
        workers: toArr(data.workers),
        vehicles: toArr(data.vehicles),
        attendances: toArr(data.attendances),
        advances: toArr(data.advances),
        fuel_expenses: toArr(data.fuel_expenses),
        dispatch_beats: toArr(data.dispatch_beats),
        damaged_returns: toArr(data.damaged_returns),
        salary_settlements: toArr(data.salary_settlements),
        stock_batches: (data.stock_batches !== undefined && toArr(data.stock_batches).length > 0)
            ? toArr(data.stock_batches)
            : getInitialStockBatchesSeed()
    };
}

const StorageManager = {
    load() {
        const raw = localStorage.getItem(DB_STORAGE_KEY);
        if (!raw) {
            const initial = this.getInitialSeedData();
            this.save(initial);
            return initial;
        }
        try {
            return normalizeAppData(JSON.parse(raw));
        } catch (e) {
            console.error('Failed to parse stored DB, resetting to seed data', e);
            const initial = this.getInitialSeedData();
            this.save(initial);
            return initial;
        }
    },

    save(data) {
        if (!data) return;
        data.lastUpdated = Date.now();
        try {
            localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('LocalStorage quota exceeded or save error:', e);
            if (typeof showToast === 'function') {
                showToast('Storage quota exceeded! Image or dataset is too large to save locally.', 'error');
            }
        }
        this.pushToFirebase(data);
    },

    pushToFirebase(data) {
        if (typeof pushDataToFirebase === 'function') {
            pushDataToFirebase(data);
        }
    },

    resetToSeed() {
        const initial = this.getInitialSeedData();
        this.save(initial);
        return initial;
    }, 

    getInitialSeedData() {
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = today.getMonth() + 1;

        // 1. Workers
        const workers = [
            {
                id: 1,
                name: "Ramesh Kumar",
                phone: "9823145670",
                emergency_contact: "",
                role: "Senior Delivery Van Driver",
                daily_wage: 700.0,
                monthly_salary: 18200.0,
                status: "Active",
                join_date: `${curYear - 2}-03-15`,
                photo_path: ""
            },
            {
                id: 2,
                name: "Suresh Yadav",
                phone: "9834123450",
                emergency_contact: "",
                role: "Godown Loader & Dispatcher",
                daily_wage: 550.0,
                monthly_salary: 14300.0,
                status: "Active",
                join_date: `${curYear - 1}-06-10`,
                photo_path: ""
            },
            {
                id: 3,
                name: "Amit Sharma",
                phone: "9765432100",
                emergency_contact: "",
                role: "Beat Delivery Van Driver",
                daily_wage: 650.0,
                monthly_salary: 16900.0,
                status: "Active",
                join_date: `${curYear - 1}-09-01`,
                photo_path: ""
            },
            {
                id: 4,
                name: "Manoj Verma",
                phone: "9922334455",
                emergency_contact: "",
                role: "Godown Helper & Stock Stacker",
                daily_wage: 500.0,
                monthly_salary: 13000.0,
                status: "Active",
                join_date: `${curYear}-01-12`,
                photo_path: ""
            },
            {
                id: 5,
                name: "Rajesh Patel",
                phone: "9811223344",
                emergency_contact: "",
                role: "Warehouse Supervisor",
                daily_wage: 800.0,
                monthly_salary: 20800.0,
                status: "Active",
                join_date: `${curYear - 3}-02-01`,
                photo_path: ""
            }
        ];

        // 2. Vehicles
        const vehicles = [
            {
                id: 1,
                vehicle_number: "MH-12-GH-4921",
                vehicle_name: "Tata Ace Gold (Everest Spices Van)",
                vehicle_type: "Delivery Van",
                fuel_type: "Diesel",
                assigned_driver_id: 1,
                status: "Active"
            },
            {
                id: 2,
                vehicle_number: "MH-12-DT-1108",
                vehicle_name: "Mahindra Bolero Maxi Truck (Colgate Van)",
                vehicle_type: "Mini Truck",
                fuel_type: "Diesel",
                assigned_driver_id: 3,
                status: "Active"
            },
            {
                id: 3,
                vehicle_number: "MH-12-AB-7732",
                vehicle_name: "Piaggio Ape Auto (Wholesale City Beat)",
                vehicle_type: "Auto Rickshaw",
                fuel_type: "CNG",
                assigned_driver_id: null,
                status: "Active"
            }
        ];

        // 3. Attendance for current month up to today
        const attendances = [];
        let attId = 1;
        const currentDay = today.getDate();
        // Generate attendance for past 3 months (August, September, October) and current month (November)
        const seedMonths = [8, 9, 10, 11];

        seedMonths.forEach(m => {
            const daysInM = m === curMonth ? today.getDate() : new Date(curYear, m, 0).getDate();
            const workingDays = [];
            for (let d = 1; d <= daysInM; d++) {
                if (new Date(curYear, m - 1, d).getDay() !== 0) workingDays.push(d);
            }
//Absence in working days
            workers.forEach(w => {
                // Exactly 2 random absences per month per worker on working days
                const shuffled = [...workingDays].sort(() => 0.5 - Math.random());
                const absentDays = new Set(shuffled.slice(0, 2));

                for (let d = 1; d <= daysInM; d++) {
                    const dateStr = `${curYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const dayOfWeek = new Date(curYear, m - 1, d).getDay(); // 0 is Sunday
                    let status = "Present";
                    let notes = "Regular godown shift";

                    if (dayOfWeek === 0) {
                        status = "Paid Leave";
                        notes = "Sunday Weekly Off";
                    } else if (absentDays.has(d)) {
                        status = "Absent";
                        notes = "Personal leave / Absent";
                    }

                    attendances.push({
                        id: attId++,
                        worker_id: w.id,
                        date: dateStr,
                        status: status,
                        notes: notes
                    });
                }
            });
        });

        // 4. Advances
        const pad = (n) => String(n).padStart(2, '0');
        const dMinus = (days) => {
            const dt = new Date();
            dt.setDate(dt.getDate() - days);
            return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
        };

        const advances = [
            {
                id: 1,
                worker_id: 2,
                request_date: dMinus(12),
                payment_date: dMinus(12),
                amount_requested: 2000,
                amount_paid: 2000,
                payment_mode: "Cash",
                reason: "Home repair & plumbing material",
                status: "Approved",
                settlement_id: null
            },
            {
                id: 2,
                worker_id: 2,
                request_date: dMinus(3),
                payment_date: dMinus(3),
                amount_requested: 1500,
                amount_paid: 1500,
                payment_mode: "UPI",
                reason: "Mother medical prescription",
                status: "Approved",
                settlement_id: null
            },
            {
                id: 3,
                worker_id: 3,
                request_date: dMinus(8),
                payment_date: dMinus(8),
                amount_requested: 3000,
                amount_paid: 3000,
                payment_mode: "Cash",
                reason: "Children school admission fee",
                status: "Approved",
                settlement_id: null
            },
            {
                id: 4,
                worker_id: 4,
                request_date: dMinus(5),
                payment_date: dMinus(5),
                amount_requested: 1000,
                amount_paid: 1000,
                payment_mode: "Cash",
                reason: "Festival grocery purchase",
                status: "Approved",
                settlement_id: null
            },
            {
                id: 5,
                worker_id: 1,
                request_date: dMinus(35),
                payment_date: dMinus(35),
                amount_requested: 2500,
                amount_paid: 2500,
                payment_mode: "Bank Transfer",
                reason: "Vehicle tyre puncture & family trip",
                status: "Settled",
                settlement_id: null
            }
        ];

        // 5. Fuel Expenses
        const fuel_expenses = [
            {
                id: 1,
                vehicle_id: 1,
                driver_id: 1,
                date: dMinus(14),
                fuel_type: "Diesel",
                amount_spent: 2850,
                liters: 31.6,
                odometer_reading: 41250,
                receipt_image: "",
                notes: "BPCL Highway Pump, Full Tank for Outstation Route"
            },
            {
                id: 2,
                vehicle_id: 2,
                driver_id: 3,
                date: dMinus(10),
                fuel_type: "Diesel",
                amount_spent: 3200,
                liters: 35.5,
                odometer_reading: 28900,
                receipt_image: "",
                notes: "Indian Oil Depot, Colgate Bulk Delivery to Supermarkets"
            },
            {
                id: 3,
                vehicle_id: 3,
                driver_id: 1,
                date: dMinus(6),
                fuel_type: "CNG",
                amount_spent: 850,
                liters: 10.5,
                odometer_reading: 15420,
                receipt_image: "",
                notes: "MGL Station Sector 12 - Daily City Delivery"
            },
            {
                id: 4,
                vehicle_id: 1,
                driver_id: 1,
                date: dMinus(2),
                fuel_type: "Diesel",
                amount_spent: 2500,
                liters: 27.7,
                odometer_reading: 41680,
                receipt_image: "",
                notes: "HP Petrol Pump - Everest Spices Beat Refill"
            }
        ];

        // 6. Beat Dispatches
        const dateTodayStr = `${curYear}-${pad(curMonth)}-${pad(currentDay)}`;
        const dispatch_beats = [
            {
                id: 1,
                dispatch_date: dateTodayStr,
                beat_name: "Main Bazaar & Wholesale Kirana Market",
                vehicle_id: 1,
                driver_id: 1,
                helper_id: 2,
                crates_everest: 45,
                cartons_colgate: 30,
                status: "Dispatched",
                notes: "Morning dispatch - 22 retail drop points"
            },
            {
                id: 2,
                dispatch_date: dateTodayStr,
                beat_name: "Station Road & Central Supermarkets",
                vehicle_id: 2,
                driver_id: 3,
                helper_id: 4,
                crates_everest: 35,
                cartons_colgate: 52,
                status: "Dispatched",
                notes: "High volume Colgate Toothpaste & Everest Masala blend"
            },
            {
                id: 3,
                dispatch_date: dMinus(1),
                beat_name: "Industrial Area & Factory Canteens",
                vehicle_id: 3,
                driver_id: 1,
                helper_id: 4,
                crates_everest: 28,
                cartons_colgate: 15,
                status: "Completed",
                notes: "All crates delivered and empty boxes returned"
            }
        ];

        // 7. Damaged Returns
        const damaged_returns = [
            {
                id: 1,
                return_date: dMinus(5),
                brand: "Everest Spices",
                product_name: "Everest Garam Masala 100g Carton",
                retailer_name: "Shree Ganesh Kirana Stores",
                batch_no: "EV-2026-GM88",
                expiry_date: "2027-04",
                quantity: 3,
                unit: "Cartons",
                reason: "Damaged in Transit",
                claim_status: "Submitted to Depot",
                credit_note_amount: 3600,
                credit_note_number: "",
                notes: "Outer cardboard crushed during truck transit from depot"
            },
            {
                id: 2,
                return_date: dMinus(3),
                brand: "Colgate-Palmolive",
                product_name: "Colgate MaxFresh Red Gel 150g",
                retailer_name: "Laxmi Supermarket",
                batch_no: "CG-0826-MF",
                expiry_date: "2027-08",
                quantity: 14,
                unit: "Tubes",
                reason: "Packaging Leakage",
                claim_status: "Pending Inspection",
                credit_note_amount: 1680,
                credit_note_number: "",
                notes: "Retailer reported crimp leakage inside case"
            },
            {
                id: 3,
                return_date: dMinus(12),
                brand: "Everest Spices",
                product_name: "Everest Pav Bhaji Masala 100g",
                retailer_name: "Sai Krupa Provisions",
                batch_no: "EV-0225-PB",
                expiry_date: "2026-08",
                quantity: 25,
                unit: "Packets",
                reason: "Expired",
                claim_status: "Credit Note Received",
                credit_note_amount: 2150,
                credit_note_number: "CN-EVEREST-94021",
                notes: "Credit note credited in distributor running ledger"
            },
            {
                id: 4,
                return_date: dMinus(1),
                brand: "Colgate-Palmolive",
                product_name: "Colgate Strong Teeth 200g Family Pack",
                retailer_name: "National Daily Mart",
                batch_no: "CG-0626-ST",
                expiry_date: "2027-06",
                quantity: 2,
                unit: "Cartons",
                reason: "Seal Broken",
                claim_status: "Pending Inspection",
                credit_note_amount: 4800,
                credit_note_number: "",
                notes: "Shrink wrap and tape seal torn on arrival"
            }
        ];

        // 8. Salary Settlements
        const salary_settlements = [];

        return {
            version: 1,
            lastUpdated: Date.now(),
            workers,
            vehicles,
            attendances,
            advances,
            fuel_expenses,
            dispatch_beats,
            damaged_returns,
            salary_settlements,
            stock_batches: getInitialStockBatchesSeed()
        };
    }
};

// Global App State
let APP_DATA = StorageManager.load();
let currentView = 'dashboard';
let currentFuelChart = null;
let currentVehicleFuelChart = null;
let stockQrActiveTab = 'inward'; // 'inward' or 'scanner'
let stockQrSearchQuery = '';
let stockQrStatusFilter = 'all'; // 'all', 'safe', 'near_expiry', 'expired'
let html5QrScannerInstance = null;
let isScannerRunning = false;
let lastScannedBatch = null;
let isScanPaused = false;
let stockQrPreviewMode = 'warehouse'; // 'warehouse' (default) or 'developer'

// -------------------------------------------------------------------
// 1.1 FIREBASE REALTIME DATABASE MULTI-DEVICE CLOUD SYNC ENGINE
// -------------------------------------------------------------------
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBST4yN6F-JWVZPy1AFbIzXajA1vbNyFGs",
    authDomain: "anupama-agencies.firebaseapp.com",
    databaseURL: "https://anupama-agencies-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "anupama-agencies",
    storageBucket: "anupama-agencies.firebasestorage.app",
    messagingSenderId: "777355768671",
    appId: "1:777355768671:web:609c3c3d8cf8e62c2e3cea"
};

function updateSyncStatus(isOnline) {
    const el = document.getElementById('cloud-sync-status');
    if (el) {
        if (isOnline) {
            el.textContent = '🟢 Cloud Synced';
            el.className = 'text-[10px] text-emerald-400 font-medium';
            el.title = 'Real-time multi-device cloud sync active (Firebase)';
        } else {
            el.textContent = '🟡 Offline Local';
            el.className = 'text-[10px] text-amber-400 font-medium';
            el.title = 'Saved to offline local browser cache';
        }
    }
    const modalBadge = document.getElementById('modal-sync-badge');
    if (modalBadge) {
        modalBadge.textContent = isOnline ? '🟢 Cloud Synced (Firebase)' : '🟡 Offline Local (LocalStorage)';
        modalBadge.className = isOnline ? 'font-bold text-emerald-600' : 'font-bold text-amber-600';
    }
}

function pushDataToFirebase(data) {
    if (!firebaseDbRef) return;
    isLocalSaving = true;
    try {
        firebaseDbRef.set(data).then(() => {
            updateSyncStatus(true);
        }).catch((err) => {
            console.warn('Firebase sync set failed:', err);
            updateSyncStatus(false);
        }).finally(() => {
            setTimeout(() => { isLocalSaving = false; }, 400);
        });
    } catch (err) {
        console.warn('Firebase push exception:', err);
        updateSyncStatus(false);
        isLocalSaving = false;
    }
}

function initFirebaseSync() {
    try {
        if (typeof firebase === 'undefined') {
            console.log('Firebase SDK not loaded, running in Offline Local mode.');
            updateSyncStatus(false);
            return;
        }

        const config = window.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
        const isPlaceholder = !config.apiKey || 
            config.apiKey.includes('PASTE_') || 
            config.apiKey.includes('YOUR_') || 
            !config.databaseURL || 
            config.databaseURL.includes('PASTE_') || 
            config.databaseURL.includes('YOUR_');

        if (isPlaceholder) {
            console.log('Firebase credentials contain placeholder values. App is running in Offline Local mode.');
            updateSyncStatus(false);
            return;
        }

        let app;
        if (!firebase.apps || !firebase.apps.length) {
            app = firebase.initializeApp(config);
        } else {
            app = firebase.app();
        }

        const db = firebase.database();
        firebaseDbRef = db.ref(FIREBASE_SYNC_PATH);

        // Monitor connection status
        const connectedRef = db.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            const connected = snap.val() === true;
            updateSyncStatus(connected);
        });

        // Real-time listener for multi-device sync
        firebaseDbRef.on('value', (snapshot) => {
            const cloudData = snapshot.val();
            if (!cloudData) {
                // If cloud database is empty, seed it with current local APP_DATA
                if (APP_DATA) {
                    pushDataToFirebase(APP_DATA);
                }
                isInitialCloudSyncDone = true;
                return;
            }

            // Ignore our own recent local saves
            if (isLocalSaving) {
                return;
            }

            const cloudTimestamp = cloudData.lastUpdated || 0;
            const localTimestamp = APP_DATA ? (APP_DATA.lastUpdated || 0) : 0;

            if (cloudTimestamp <= localTimestamp && isInitialCloudSyncDone) {
                return;
            }

            APP_DATA = normalizeAppData(cloudData);

            try {
                localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(APP_DATA));
            } catch (err) {
                console.error('Failed to cache cloud update to localStorage:', err);
            }

            if (typeof renderView === 'function' && typeof currentView !== 'undefined') {
                renderView(currentView);
            }

            if (isInitialCloudSyncDone && typeof showToast === 'function') {
                showToast('Multi-device update: synchronized with cloud!', 'info');
            }
            isInitialCloudSyncDone = true;
            updateSyncStatus(true);
        }, (error) => {
            console.warn('Firebase Realtime Database listener error:', error);
            updateSyncStatus(false);
        });

    } catch (err) {
        console.warn('Firebase Realtime Database initialization error:', err);
        updateSyncStatus(false);
    }
}

// -------------------------------------------------------------------
// 1.2 4-DIGIT AGENCY SECURITY PIN LOCK ENGINE
// -------------------------------------------------------------------
function isPortalUnlocked() {
    return sessionStorage.getItem(PIN_STORAGE_KEY) === 'true';
}

function handlePinSubmit(e) {
    if (e) e.preventDefault();
    const pinInput = document.getElementById('pin-input');
    const errorMsg = document.getElementById('pin-error-msg');
    if (!pinInput) return;

    const enteredPin = pinInput.value.trim();
    if (enteredPin === DEFAULT_AGENCY_PIN) {
        sessionStorage.setItem(PIN_STORAGE_KEY, 'true');
        const modal = document.getElementById('pin-lock-modal');
        if (modal) modal.classList.add('hidden');
        if (errorMsg) errorMsg.classList.add('hidden');
        pinInput.value = '';
        document.body.style.overflow = '';
        if (typeof showToast === 'function') {
            showToast('Access Granted. Welcome to Anupama Agencies!', 'success');
        }
        if (typeof renderView === 'function' && typeof currentView !== 'undefined') {
            renderView(currentView);
        }
    } else {
        if (errorMsg) {
            errorMsg.textContent = 'Incorrect 4-digit PIN. Please try again.';
            errorMsg.classList.remove('hidden');
        }
        pinInput.value = '';
        pinInput.focus();
        pinInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/30');
        setTimeout(() => {
            pinInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/30');
        }, 1200);
        if (typeof showToast === 'function') {
            showToast('Incorrect Agency PIN. Access Denied.', 'error');
        }
    }
}

function lockPortal() {
    sessionStorage.removeItem(PIN_STORAGE_KEY);
    const modal = document.getElementById('pin-lock-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        const pinInput = document.getElementById('pin-input');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
        const errorMsg = document.getElementById('pin-error-msg');
        if (errorMsg) errorMsg.classList.add('hidden');
    }
    if (typeof showToast === 'function') {
        showToast('Portal locked for security.', 'info');
    }
}

function initPinLock() {
    const pinInput = document.getElementById('pin-input');
    const pinModal = document.getElementById('pin-lock-modal');

    if (isPortalUnlocked()) {
        if (pinModal) pinModal.classList.add('hidden');
        document.body.style.overflow = '';
    } else {
        if (pinModal) pinModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (pinInput) {
            pinInput.value = '';
            setTimeout(() => pinInput.focus(), 150);
        }
    }

    if (pinInput) {
        pinInput.addEventListener('input', (e) => {
            if (e.target.value.length === 4) {
                handlePinSubmit(e);
            }
        });
    }
}

// -------------------------------------------------------------------
// 1.3 CLIENT-SIDE IMAGE COMPRESSION (CANVAS JPEG 600px 0.7)
// -------------------------------------------------------------------
function compressImageFile(file, maxWidth = 600, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('No file provided for compression.'));
        }
        if (!file.type || !file.type.startsWith('image/')) {
            return reject(new Error('Selected file is not an image.'));
        }

        const reader = new FileReader();
        reader.onerror = (err) => reject(new Error('Failed to read image file.'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Failed to decode image file.'));
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                // Fill white background for transparent PNG/WebP when converting to JPEG
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// -------------------------------------------------------------------
// 2. HELPER UTILITIES
// -------------------------------------------------------------------
function formatINR(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
    const val = Number(amount);
    const isNegative = val < 0;
    const absVal = Math.abs(val);

    const parts = absVal.toFixed(2).split('.');
    const whole = parts[0];
    const decimal = parts[1];

    let res = whole;
    if (whole.length > 3) {
        const last3 = whole.slice(-3);
        let rest = whole.slice(0, -3);
        const chunks = [];
        while (rest.length > 2) {
            chunks.unshift(rest.slice(-2));
            rest = rest.slice(0, -2);
        }
        if (rest) chunks.unshift(rest);
        chunks.push(last3);
        res = chunks.join(',');
    }

    const prefix = isNegative ? '-₹' : '₹';
    return `${prefix}${res}.${decimal}`;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-xl border shadow-2xl backdrop-blur-xl flex items-center justify-between text-xs font-semibold pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0 ${
        type === 'success'
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
            : type === 'error'
            ? 'bg-rose-950/80 text-rose-300 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
            : 'bg-blue-950/80 text-blue-300 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
    }`;

    toast.innerHTML = `
        <div class="flex items-center gap-2.5">
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-octagon' : 'info'}" class="w-4 h-4 flex-shrink-0"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white p-1">✕</button>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 50);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-4');
        setTimeout(() => toast.remove(), 400);
    }, 4500);
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        lucide.createIcons();
    }
}

function closeModal(id) {
    if (id === 'pin-lock-modal' && !isPortalUnlocked()) {
        return;
    }
    if (id === 'scanned-crate-modal') {
        isScanPaused = false;
        if (typeof html5QrScannerInstance !== 'undefined' && html5QrScannerInstance && isScannerRunning) {
            try { html5QrScannerInstance.resume(); } catch(e){}
        }
    }
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
        if (isPortalUnlocked()) {
            document.body.style.overflow = 'auto';
        }
    }
}

function previewImage(src, caption = 'Receipt Preview') {
    const modal = document.getElementById('image-preview-modal');
    const img = document.getElementById('modal-preview-img');
    const cap = document.getElementById('modal-preview-caption');
    if (modal && img) {
        img.src = src;
        if (cap) cap.textContent = caption;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// -------------------------------------------------------------------
// 3. STATS & WORKER COMPUTATIONS
// -------------------------------------------------------------------
function getWorkerPendingAdvances(workerId) {
    return APP_DATA.advances
        .filter(a => a.worker_id === workerId && a.status === 'Approved')
        .reduce((sum, a) => sum + (Number(a.amount_paid) || 0), 0);
}

function getWorkerTotalAdvances(workerId) {
    return APP_DATA.advances
        .filter(a => a.worker_id === workerId && (a.status === 'Approved' || a.status === 'Settled'))
        .reduce((sum, a) => sum + (Number(a.amount_paid) || 0), 0);
}

function getWorkerAttendanceSummary(workerId, year, month) {
    const recs = APP_DATA.attendances.filter(a => {
        if (a.worker_id !== workerId) return false;
        const [y, m] = a.date.split('-').map(Number);
        return y === year && m === month;
    });

    let present = 0, half_day = 0, absent = 0, paid_leave = 0;
    recs.forEach(r => {
        if (r.status === 'Present') present++;
        else if (r.status === 'Half Day') half_day++;
        else if (r.status === 'Absent') absent++;
        else if (r.status === 'Paid Leave') paid_leave++;
    });

    const effective_days = present + paid_leave + (half_day * 0.5);
    const total_marked = recs.length;
    const attendance_pct = total_marked > 0 ? ((effective_days / total_marked) * 100).toFixed(1) : '0.0';

    return {
        present,
        half_day,
        absent,
        paid_leave,
        effective_days,
        total_marked,
        attendance_pct: Number(attendance_pct),
        records: recs
    };
}

// -------------------------------------------------------------------
// 4. VIEW ROUTING & NAVIGATION
// -------------------------------------------------------------------
function switchView(viewName) {
    if (viewName !== 'stock-qr' && typeof stopCameraScanner === 'function') {
        stopCameraScanner();
    }
    currentView = viewName;
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));

    // Highlight nav button
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('bg-[#466358]', 'text-white', 'shadow-md');
        btn.classList.add('text-[#7A827E]');
        btn.classList.remove('text-[#1E2421]');
    });

    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) {
        activeNav.classList.remove('text-[#7A827E]');
        activeNav.classList.add('bg-[#466358]', 'text-white', 'shadow-md');
    }

    const titleMap = {
        'dashboard': 'Warehouse & Distribution Dashboard',
        'stock-qr': 'Stock Batch & Expiry QR Tracking (FEFO)',
        'workers': 'Godown Staff & Worker Profiles',
        'attendance': 'Daily Worker Attendance Register',
        'monthly-attendance': 'Monthly Muster Roll & Attendance Grid',
        'advances': 'Advance Payment & Staff Khata Ledger',
        'fuel': 'Delivery Vehicles & Monthly Fuel Expenses',
        'dispatches': 'Daily Delivery & Beat Dispatch Tracker',
        'returns': 'Damaged & Expiry Return Log (Everest & Colgate)',
        'settlements': 'Monthly Salary & Advance Settlement Calculator',
        'voucher': 'Printable Wage Payment Voucher'
    };

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titleMap[viewName] || 'Dashboard';

    // Close mobile drawer if open
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (drawer) drawer.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');

    const viewTarget = document.getElementById(`view-${viewName}`);
    if (viewTarget) {
        viewTarget.classList.remove('hidden');
        renderView(viewName);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderView(viewName) {
    switch (viewName) {
        case 'dashboard': renderDashboard(); break;
        case 'stock-qr': renderStockQRView(); break;
        case 'workers': renderWorkers(); break;
        case 'attendance': renderAttendance(); break;
        case 'monthly-attendance': renderMonthlyAttendance(); break;
        case 'advances': renderAdvances(); break;
        case 'fuel': renderFuel(); break;
        case 'dispatches': renderDispatches(); break;
        case 'returns': renderReturns(); break;
        case 'settlements': renderSettlements(); break;
    }
    lucide.createIcons();
}

// -------------------------------------------------------------------
// 5. VIEW: DASHBOARD (Soft-Minimalist Sage Green & Off-White Bento Grid)
// -------------------------------------------------------------------
function renderDashboard() {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const curDay = today.getDate();
    const dateTodayStr = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(curDay).padStart(2, '0')}`;

    const activeWorkers = APP_DATA.workers.filter(w => w.status === 'Active');
    const todayAttendances = APP_DATA.attendances.filter(a => a.date === dateTodayStr);

    const presentToday = todayAttendances.filter(a => a.status === 'Present' || a.status === 'Paid Leave').length;
    const halfDayToday = todayAttendances.filter(a => a.status === 'Half Day').length;
    const absentToday = todayAttendances.filter(a => a.status === 'Absent').length;

    const totalPendingAdv = activeWorkers.reduce((sum, w) => sum + getWorkerPendingAdvances(w.id), 0);

    // Fuel metrics
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;

    const curMonthFuel = APP_DATA.fuel_expenses
        .filter(f => {
            const [y, m] = f.date.split('-').map(Number);
            return y === curYear && m === curMonth;
        })
        .reduce((sum, f) => sum + (Number(f.amount_spent) || 0), 0);

    const prevMonthFuel = APP_DATA.fuel_expenses
        .filter(f => {
            const [y, m] = f.date.split('-').map(Number);
            return y === prevYear && m === prevMonth;
        })
        .reduce((sum, f) => sum + (Number(f.amount_spent) || 0), 0);

    let fuelDiffPct = 0;
    if (prevMonthFuel > 0) {
        fuelDiffPct = (((curMonthFuel - prevMonthFuel) / prevMonthFuel) * 100).toFixed(1);
    }

    const todayDispatches = APP_DATA.dispatch_beats.filter(b => b.dispatch_date === dateTodayStr);
    const activeBeats = todayDispatches.filter(b => b.status === 'Dispatched').length;

    // Stock Batches & FEFO Metrics
    const batches = APP_DATA.stock_batches || [];
    const expiredBatches = batches.filter(b => getBatchExpiryInfo(b.exp).status === 'expired');
    const nearExpiryBatches = batches.filter(b => getBatchExpiryInfo(b.exp).status === 'near_expiry');
    const safeBatches = batches.filter(b => getBatchExpiryInfo(b.exp).status === 'safe');
    const totalCrates = batches.reduce((sum, b) => sum + (Number(b.qty) || 0), 0);
    const safeRatio = batches.length ? Math.round((safeBatches.length / batches.length) * 100) : 100;

    const pendingClaims = APP_DATA.damaged_returns.filter(r => r.claim_status === 'Pending Inspection' || r.claim_status === 'Submitted to Depot');
    const pendingClaimsVal = pendingClaims.reduce((sum, r) => sum + (Number(r.credit_note_amount) || 0), 0);

    const recentDispatches = [...APP_DATA.dispatch_beats].reverse().slice(0, 4);
    const recentAdvances = [...APP_DATA.advances].reverse().slice(0, 4);

    const html = `
        <!-- Live Depot Status & Quick Action Strip -->
        <div class="glass-card rounded-[24px] p-5 sm:p-6 card-hover flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-start sm:items-center gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-[#EFF2EC] border border-[#DCE2D8] text-[#466358] flex items-center justify-center flex-shrink-0">
                    <i data-lucide="building-2" class="w-5 h-5"></i>
                </div>
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <h2 class="text-base sm:text-lg font-black text-[#1E2421] tracking-tight">Anupama Agencies FMCG Central Depot</h2>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EFF2EC] text-[#466358] border border-[#DCE2D8] text-[11px] font-bold">
                            <span class="w-2 h-2 rounded-full bg-[#466358] animate-pulse"></span>
                            Live Operations
                        </span>
                    </div>
                    <p class="text-xs text-[#7A827E] mt-0.5">
                        Authorized Consignee & Super-Stockist for <strong class="text-[#C41E3A]">Everest Spices</strong> & <strong class="text-[#004B87]">Colgate-Palmolive</strong>. Godown staff muster, fleet logistics, advance khata, and FEFO batch verification.
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <button onclick="switchView('attendance')" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#466358] hover:bg-[#3A544A] text-white text-xs font-bold transition-all shadow-sm">
                    <i data-lucide="clipboard-check" class="w-4 h-4"></i>
                    <span>Mark Muster</span>
                </button>
                <button onclick="openModal('add-advance-modal')" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#EFF2EC] text-[#1E2421] border border-[#ECEEE8] text-xs font-bold transition-all shadow-sm">
                    <i data-lucide="wallet" class="w-4 h-4 text-amber-600"></i>
                    <span>Issue Advance</span>
                </button>
                <button onclick="switchView('stock-qr')" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EFF2EC] hover:bg-[#DCE2D8] text-[#466358] text-xs font-bold transition-all">
                    <i data-lucide="qr-code" class="w-4 h-4"></i>
                    <span>Scan QR</span>
                </button>
            </div>
        </div>

        <!-- FEFO Stock Batch & Expiry Alert Banner (if applicable) -->
        ${(() => {
            if (expiredBatches.length === 0 && nearExpiryBatches.length === 0) return '';
            const isCritical = expiredBatches.length > 0;
            const bannerBorder = isCritical ? 'border-rose-300 bg-rose-50/70' : 'border-amber-300 bg-amber-50/70';
            const textTheme = isCritical ? 'text-rose-900' : 'text-amber-900';
            const badgeBg = isCritical ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300';
            const iconColor = isCritical ? 'text-rose-600' : 'text-amber-600';
            const title = isCritical ? `CRITICAL ACTION: ${expiredBatches.length} Expired Batch(es) in Godown!` : `FEFO ALERT: ${nearExpiryBatches.length} Batch(es) Near Expiry (1-60 Days Remaining)`;
            const desc = isCritical ? `Found expired batch crates (${expiredBatches.map(b => b.product).slice(0, 2).join(', ')}). <strong>Do not dispatch!</strong> Quarantine immediately.` : `Prioritize near-expiry items for high-velocity dispatch today under First-Expiry-First-Out (FEFO) rules.`;

            return `
            <div class="rounded-2xl p-4 border ${bannerBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div class="flex items-start sm:items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 ${iconColor} shadow-sm">
                        <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold ${textTheme}">${title}</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeBg}">FEFO Engine</span>
                        </div>
                        <p class="text-[#7A827E] mt-0.5">${desc}</p>
                    </div>
                </div>
                <button onclick="switchView('stock-qr')" class="px-3 py-1.5 rounded-xl bg-white border border-[#ECEEE8] font-bold text-xs hover:bg-[#EFF2EC] flex-shrink-0 self-end sm:self-auto">
                    View Batches &rarr;
                </button>
            </div>
            `;
        })()}

        <!-- ROW 1: 4 COMPACT KPI CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <!-- 1. Active Staff Today -->
            <div class="glass-card rounded-[24px] p-5 card-hover flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-[#7A827E]">Active Staff Today</span>
                        <span class="w-9 h-9 rounded-full bg-[#EFF2EC] text-[#466358] flex items-center justify-center border border-[#DCE2D8]">
                            <i data-lucide="user-check" class="w-4 h-4"></i>
                        </span>
                    </div>
                    <div class="mt-3 flex items-baseline gap-2">
                        <span class="text-3xl font-extrabold text-[#1E2421]">${presentToday}</span>
                        <span class="text-xs font-semibold text-[#7A827E]">/ ${activeWorkers.length} Active</span>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-[#ECEEE8] flex items-center justify-between">
                    <!-- Mini vertical bar sparkline in sage green -->
                    <div class="flex items-end gap-1 h-5" title="Muster history (7 days)">
                        <span class="w-1.5 h-3 rounded-full bg-[#DCE2D8]"></span>
                        <span class="w-1.5 h-4 rounded-full bg-[#B8C6B1]"></span>
                        <span class="w-1.5 h-3.5 rounded-full bg-[#B8C6B1]"></span>
                        <span class="w-1.5 h-4.5 rounded-full bg-[#466358]"></span>
                        <span class="w-1.5 h-4 rounded-full bg-[#466358]"></span>
                        <span class="w-1.5 h-5 rounded-full bg-[#466358]"></span>
                        <span class="w-1.5 h-4 rounded-full bg-[#466358]"></span>
                    </div>
                    <div class="flex items-center gap-1.5 text-[11px] font-bold">
                        <span class="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">Absent: ${absentToday}</span>
                        <span class="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Half: ${halfDayToday}</span>
                    </div>
                </div>
            </div>

            <!-- 2. Advance Pending Khata -->
            <div class="glass-card rounded-[24px] p-5 card-hover flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-[#7A827E]">Advance Pending Khata</span>
                        <span class="w-9 h-9 rounded-full bg-[#EFF2EC] text-[#466358] flex items-center justify-center border border-[#DCE2D8]">
                            <i data-lucide="wallet" class="w-4 h-4"></i>
                        </span>
                    </div>
                    <div class="mt-3">
                        <span class="text-3xl font-extrabold text-[#1E2421]">${formatINR(totalPendingAdv)}</span>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-[#ECEEE8] flex items-center justify-between text-xs text-[#7A827E]">
                    <span class="flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-[#466358]"></i> Recoverable</span>
                    <span class="px-2 py-0.5 rounded-full bg-[#EFF2EC] text-[#466358] font-bold text-[10px]">Salary Deduct</span>
                </div>
            </div>

            <!-- 3. Monthly Fuel Cost -->
            <div class="glass-card rounded-[24px] p-5 card-hover flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-[#7A827E]">Monthly Fuel Cost</span>
                        <span class="w-9 h-9 rounded-full bg-[#EFF2EC] text-[#466358] flex items-center justify-center border border-[#DCE2D8]">
                            <i data-lucide="fuel" class="w-4 h-4"></i>
                        </span>
                    </div>
                    <div class="mt-3">
                        <span class="text-3xl font-extrabold text-[#1E2421]">${formatINR(curMonthFuel)}</span>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-[#ECEEE8] flex items-center justify-between text-xs text-[#7A827E]">
                    <span>Last mo: <strong class="text-[#1E2421]">${formatINR(prevMonthFuel)}</strong></span>
                    ${Number(fuelDiffPct) > 0 
                        ? `<span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">+${fuelDiffPct}%</span>` 
                        : `<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">${fuelDiffPct}%</span>`}
                </div>
            </div>

            <!-- 4. Highlighted Dark Sage Card (#466358, white text) -->
            <div class="bg-[#466358] text-white rounded-[24px] p-5 shadow-[0_8px_25px_rgba(70,99,88,0.22)] relative overflow-hidden flex flex-col justify-between card-hover">
                <div class="relative z-10">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-white/80">Active Beat Dispatches</span>
                        <span class="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
                            <i data-lucide="truck" class="w-4 h-4"></i>
                        </span>
                    </div>
                    <div class="mt-3 flex items-baseline gap-2">
                        <span class="text-3xl font-extrabold text-white">${activeBeats} Beats</span>
                        <span class="text-xs font-medium text-white/80">• ${safeBatches.length} Safe Batches</span>
                    </div>
                </div>
                
                <!-- Smooth White Wave Sparkline -->
                <div class="mt-2 relative z-10 flex items-center justify-between">
                    <div class="w-28 h-7">
                        <svg viewBox="0 0 100 30" class="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
                                    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                                </linearGradient>
                            </defs>
                            <path d="M 0,22 Q 15,6 30,18 T 60,12 T 85,16 T 100,8 L 100,30 L 0,30 Z" fill="url(#waveGrad)"/>
                            <path d="M 0,22 Q 15,6 30,18 T 60,12 T 85,16 T 100,8" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <button onclick="switchView('dispatches')" class="text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full transition-colors">
                        View Routes &rarr;
                    </button>
                </div>
            </div>
        </div>

        <!-- ROW 2: ANALYTICS & DEPOT HEALTH (3-COLUMN GRID) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            <!-- 1. Wide Card (2 cols) — Fleet Fuel & Expense Trend -->
            <div class="lg:col-span-2 glass-card rounded-[24px] p-5 sm:p-6 card-hover flex flex-col justify-between">
                <div>
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-sm sm:text-base font-bold text-[#1E2421]">Fleet Fuel & Expense Trend</h3>
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EFF2EC] border border-[#DCE2D8] text-[11px] font-bold text-[#466358]">
                                    <span class="w-1.5 h-1.5 rounded-full bg-[#466358] animate-pulse"></span>
                                    On track
                                </span>
                            </div>
                            <p class="text-xs text-[#7A827E] mt-0.5">Monthly diesel, petrol, and CNG consumption (₹) across delivery vehicles</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EFF2EC] text-[#466358] border border-[#DCE2D8]">
                                Monthly
                            </span>
                            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${Number(fuelDiffPct) <= 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
                                ${Number(fuelDiffPct) > 0 ? `+${fuelDiffPct}%` : `${fuelDiffPct}%`} trend
                            </span>
                        </div>
                    </div>
                    <div class="h-64 sm:h-72 relative">
                        <canvas id="fuelTrendChartCanvas"></canvas>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-[#ECEEE8] flex items-center justify-between text-xs text-[#7A827E]">
                    <span>Current fleet count: <strong class="text-[#1E2421]">${APP_DATA.vehicles.length} Active Vehicles</strong></span>
                    <button onclick="switchView('fuel')" class="text-xs font-bold text-[#466358] hover:underline">View Fleet Ledger &rarr;</button>
                </div>
            </div>

            <!-- 3rd Column: Semi-Circular Gauge Card & Depot Summary Card -->
            <div class="flex flex-col gap-5 sm:gap-6">
                <!-- 2. Semi-Circular Gauge Card — Stock Shelf-Life / Attendance Rate -->
                <div class="glass-card rounded-[24px] p-5 sm:p-6 card-hover flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-sm font-bold text-[#1E2421]">Stock Shelf-Life & FEFO</h3>
                                <p class="text-xs text-[#7A827E]">Crates compliant with FEFO rules</p>
                            </div>
                            <span class="px-2.5 py-1 rounded-full bg-[#EFF2EC] text-[#466358] text-[11px] font-bold border border-[#DCE2D8]">
                                FEFO Engine
                            </span>
                        </div>

                        <!-- 180° Semi-Circular Gauge -->
                        <div class="relative flex flex-col items-center justify-center pt-3 pb-1">
                            <svg viewBox="0 0 160 95" class="w-44 h-28 overflow-visible">
                                <!-- Background Arc (180 deg) -->
                                <path d="M 15 85 A 65 65 0 0 1 145 85" fill="none" stroke="#EFF2EC" stroke-width="12" stroke-linecap="round"/>
                                <!-- Value Arc -->
                                <path d="M 15 85 A 65 65 0 0 1 145 85" fill="none" stroke="#466358" stroke-width="12" stroke-linecap="round"
                                    stroke-dasharray="204.2" stroke-dashoffset="${(204.2 * (1 - safeRatio / 100)).toFixed(1)}" style="transition: stroke-dashoffset 1s ease;"/>
                            </svg>
                            <div class="absolute bottom-2 text-center">
                                <span class="text-2xl font-black text-[#1E2421] block leading-none">${safeRatio}%</span>
                                <span class="text-[10px] font-bold uppercase tracking-wider text-[#7A827E]">Safe Shelf-Life</span>
                            </div>
                        </div>
                    </div>

                    <div class="pt-3 border-t border-[#ECEEE8] flex items-center justify-between text-xs text-[#7A827E]">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-[#466358]"></span>
                            <span>Safe: <strong class="text-[#1E2421]">${safeBatches.length}</strong></span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>Near: <strong class="text-amber-700">${nearExpiryBatches.length}</strong></span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span>Exp: <strong class="text-rose-700">${expiredBatches.length}</strong></span>
                        </div>
                    </div>
                </div>

                <!-- 3. Depot Summary Card -->
                <div class="glass-card rounded-[24px] p-5 card-hover">
                    <div class="flex items-center justify-between pb-3 border-b border-[#ECEEE8]">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-[#1E2421] text-white flex items-center justify-center font-black text-xs">
                                AA
                            </div>
                            <div>
                                <h4 class="text-xs font-bold text-[#1E2421]">Anupama Distribution</h4>
                                <p class="text-[10px] text-[#7A827E]">FMCG Depots & Logistics</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FDF2F4] text-[#C41E3A] border border-[#FCD8DF]">EVEREST</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#F0F5FA] text-[#004B87] border border-[#D5E5F5]">COLGATE</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 pt-3 text-center">
                        <div class="p-2 rounded-xl bg-[#EFF2EC]/50 border border-[#ECEEE8]">
                            <span class="text-base font-extrabold text-[#1E2421] block">${activeWorkers.length}</span>
                            <span class="text-[10px] font-bold text-[#7A827E] uppercase">Staff</span>
                        </div>
                        <div class="p-2 rounded-xl bg-[#EFF2EC]/50 border border-[#ECEEE8]">
                            <span class="text-base font-extrabold text-[#1E2421] block">${APP_DATA.vehicles.length}</span>
                            <span class="text-[10px] font-bold text-[#7A827E] uppercase">Vehicles</span>
                        </div>
                        <div class="p-2 rounded-xl bg-[#EFF2EC]/50 border border-[#ECEEE8]">
                            <span class="text-base font-extrabold text-[#1E2421] block">${batches.length}</span>
                            <span class="text-[10px] font-bold text-[#7A827E] uppercase">Batches</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ROW 3: QUICK MODULES & RECENT ACTIVITY (3-COLUMN GRID) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <!-- 1. Quick QR Crate Pass / Fleet Card -->
            <div class="glass-card rounded-[24px] p-5 sm:p-6 card-hover flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-[#7A827E]">Stock Batch Passes</span>
                        <span class="w-8 h-8 rounded-full bg-[#EFF2EC] text-[#466358] flex items-center justify-center">
                            <i data-lucide="qr-code" class="w-4 h-4"></i>
                        </span>
                    </div>

                    <!-- Layered Visual Card Graphic -->
                    <div class="p-3.5 rounded-2xl bg-[#EFF2EC]/70 border border-[#DCE2D8] mb-4 relative overflow-hidden">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="px-2 py-0.5 rounded text-[10px] font-black bg-[#466358] text-white">CRATE TAG</span>
                                <h4 class="text-xs font-bold text-[#1E2421] mt-1.5">Everest & Colgate QR Passes</h4>
                                <p class="text-[11px] text-[#7A827E]">Instant FEFO batch inspection</p>
                            </div>
                            <div class="w-12 h-12 bg-white rounded-xl border border-[#ECEEE8] p-1 shadow-sm flex items-center justify-center text-[#466358]">
                                <i data-lucide="scan-line" class="w-6 h-6"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <button onclick="switchView('stock-qr')" class="w-full py-2.5 px-4 rounded-xl bg-[#466358] hover:bg-[#3A544A] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                        <i data-lucide="scan-line" class="w-4 h-4"></i>
                        <span>Scan / Generate QR</span>
                    </button>
                </div>
            </div>

            <!-- 2. Recent Khata & Dispatch Activity -->
            <div class="glass-card rounded-[24px] p-5 sm:p-6 card-hover flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <div>
                            <h3 class="text-sm font-bold text-[#1E2421]">Recent Depot Activity</h3>
                            <p class="text-xs text-[#7A827E]">Latest dispatches & advances</p>
                        </div>
                        <button onclick="switchView('dispatches')" class="text-xs font-bold text-[#466358] hover:underline">View All</button>
                    </div>

                    <div class="space-y-2.5">
                        ${recentDispatches.slice(0, 2).map(beat => {
                            const veh = APP_DATA.vehicles.find(v => v.id === beat.vehicle_id) || { vehicle_number: 'Van' };
                            return `
                            <div class="p-2.5 rounded-xl bg-[#F8F9F6] border border-[#ECEEE8] border-l-4 border-l-[#466358] flex items-center justify-between gap-2">
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-xs font-bold text-[#1E2421] truncate">${beat.beat_name}</span>
                                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#EFF2EC] text-[#466358]">${beat.status}</span>
                                    </div>
                                    <p class="text-[10px] text-[#7A827E] mt-0.5">${veh.vehicle_number} • ${beat.crates_everest} Crates • ${beat.cartons_colgate} Cts</p>
                                </div>
                                <span class="text-[11px] font-bold text-[#466358] flex-shrink-0">Dispatched</span>
                            </div>
                            `;
                        }).join('')}

                        ${recentAdvances.slice(0, 2).map(adv => {
                            const wrk = APP_DATA.workers.find(w => w.id === adv.worker_id) || { name: 'Worker' };
                            return `
                            <div class="p-2.5 rounded-xl bg-[#F8F9F6] border border-[#ECEEE8] border-l-4 border-l-amber-500 flex items-center justify-between gap-2">
                                <div class="min-w-0 flex-1">
                                    <h4 class="text-xs font-bold text-[#1E2421] truncate">${wrk.name}</h4>
                                    <p class="text-[10px] text-[#7A827E] mt-0.5">${formatDateDisplay(adv.payment_date)} • ${adv.payment_mode}</p>
                                </div>
                                <span class="text-xs font-extrabold text-[#1E2421] flex-shrink-0">${formatINR(adv.amount_paid)}</span>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="pt-3 border-t border-[#ECEEE8] mt-3 flex items-center justify-between text-xs text-[#7A827E]">
                    <span>Live depot logs synchronized</span>
                    <button onclick="switchView('advances')" class="font-bold text-[#466358] hover:underline">Staff Khata &rarr;</button>
                </div>
            </div>

            <!-- 3. Data Safety & Cloud Sync Card -->
            <div class="glass-card rounded-[24px] p-5 sm:p-6 card-hover flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-[#7A827E]">Data Safety & Sync</span>
                        <span class="w-8 h-8 rounded-full bg-[#EFF2EC] text-[#466358] flex items-center justify-center">
                            <i data-lucide="shield" class="w-4 h-4"></i>
                        </span>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-[#EFF2EC]/70 border border-[#DCE2D8] mb-4">
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 rounded-lg bg-white text-[#466358] flex items-center justify-center flex-shrink-0 shadow-sm">
                                <i data-lucide="database" class="w-4 h-4"></i>
                            </div>
                            <div>
                                <h4 class="text-xs font-bold text-[#1E2421]">Keep your data safe!</h4>
                                <p class="text-[11px] text-[#7A827E] mt-0.5">Firebase Sync & Excel (.xlsx) Backup active. 7 worksheets per export.</p>
                            </div>
                        </div>
                        <div class="mt-2.5 flex items-center gap-2 text-[10px] font-bold text-[#466358]">
                            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#466358]"></span> Multi-Device Sync</span>
                            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> 100% Offline Ready</span>
                        </div>
                    </div>
                </div>

                <div>
                    <button onclick="openModal('backup-modal')" class="w-full py-2.5 px-4 rounded-xl bg-[#466358] hover:bg-[#3A544A] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Backup / Restore (.xlsx)</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('view-dashboard').innerHTML = html;

    // Render Fuel Trend Dual-Line Spline Chart
    setTimeout(() => {
        const canvas = document.getElementById('fuelTrendChartCanvas');
        if (canvas) {
            if (currentFuelChart) currentFuelChart.destroy();

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const labels = [];
            const actualVals = [];
            const budgetVals = [];

            for (let i = 5; i >= 0; i--) {
                const d = new Date(curYear, curMonth - 1 - i, 1);
                const y = d.getFullYear();
                const m = d.getMonth() + 1;
                labels.push(`${monthNames[m - 1]} ${y}`);

                const spent = APP_DATA.fuel_expenses
                    .filter(f => {
                        const [fy, fm] = f.date.split('-').map(Number);
                        return fy === y && fm === m;
                    })
                    .reduce((sum, f) => sum + (Number(f.amount_spent) || 0), 0);

                actualVals.push(spent);
            }

            const avgFuel = actualVals.length ? Math.round(actualVals.reduce((a, b) => a + b, 0) / actualVals.length) : 25000;
            const baseline = avgFuel > 0 ? avgFuel : 25000;
            for (let i = 0; i < actualVals.length; i++) {
                budgetVals.push(baseline);
            }

            currentFuelChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Actual Fuel Cost (₹)',
                            data: actualVals,
                            borderColor: '#466358',
                            backgroundColor: 'rgba(70, 99, 88, 0.08)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2.5,
                            pointBackgroundColor: '#466358',
                            pointBorderColor: '#FFFFFF',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Budget Baseline (₹)',
                            data: budgetVals,
                            borderColor: '#B8C6B1',
                            borderDash: [5, 5],
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'end',
                            labels: {
                                boxWidth: 12,
                                boxHeight: 12,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: {
                                    family: "'Plus Jakarta Sans', sans-serif",
                                    size: 11,
                                    weight: '600'
                                },
                                color: '#7A827E'
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1E2421',
                            titleColor: '#FFFFFF',
                            bodyColor: '#EFF2EC',
                            borderColor: '#ECEEE8',
                            borderWidth: 1,
                            padding: 10,
                            cornerRadius: 10,
                            callbacks: {
                                label: context => ` ${context.dataset.label}: ₹` + Number(context.raw || 0).toLocaleString('en-IN')
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#F1F3EE',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#7A827E',
                                font: {
                                    family: "'Plus Jakarta Sans', sans-serif",
                                    size: 10
                                },
                                callback: val => '₹' + Number(val).toLocaleString('en-IN')
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#7A827E',
                                font: {
                                    family: "'Plus Jakarta Sans', sans-serif",
                                    size: 11,
                                    weight: '600'
                                }
                            }
                        }
                    }
                }
            });
        }
    }, 100);
}

// -------------------------------------------------------------------
// 6. VIEW: WORKERS MANAGEMENT & PROFILES
// -------------------------------------------------------------------
let workerSearchQuery = '';
let workerRoleFilter = '';
let workerStatusFilter = 'Active';

function renderWorkers() {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;

    let filtered = APP_DATA.workers.filter(w => {
        if (workerStatusFilter !== 'All' && w.status !== workerStatusFilter) return false;
        if (workerRoleFilter && w.role !== workerRoleFilter) return false;
        if (workerSearchQuery) {
            const q = workerSearchQuery.toLowerCase();
            return w.name.toLowerCase().includes(q) || w.phone.includes(q) || w.role.toLowerCase().includes(q);
        }
        return true;
    });

    const roles = Array.from(new Set(APP_DATA.workers.map(w => w.role)));

    const html = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h2 class="text-xl font-bold text-slate-900">Godown Workers & Staff Directory</h2>
                <p class="text-xs text-slate-500">Manage loaders, delivery van drivers, godown helpers, and supervisors</p>
            </div>
            <button onclick="openAddWorkerModal()" class="inline-flex items-center gap-2 px-4 py-2.5 bg-colgate hover:bg-colgate-dark text-white text-xs font-bold rounded-xl shadow-sm transition-colors self-start">
                <i data-lucide="user-plus" class="w-4 h-4"></i>
                <span>Add New Godown Worker</span>
            </button>
        </div>

        <!-- Filter Bar -->
        <div class="glass-card rounded-2xl p-4">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div class="sm:col-span-5 relative">
                    <i data-lucide="search" class="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none"></i>
                    <input type="text" value="${workerSearchQuery}" oninput="workerSearchQuery = this.value; renderWorkers();" placeholder="Search by name, phone, or role..." class="w-full pl-9 pr-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50">
                </div>
                <div class="sm:col-span-4">
                    <select onchange="workerRoleFilter = this.value; renderWorkers();" class="w-full py-2 px-3 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500/50">
                        <option value="" class="bg-[#121324]">All Staff Roles</option>
                        ${roles.map(r => `<option value="${r}" class="bg-[#121324]" ${workerRoleFilter === r ? 'selected' : ''}>${r}</option>`).join('')}
                    </select>
                </div>
                <div class="sm:col-span-3">
                    <select onchange="workerStatusFilter = this.value; renderWorkers();" class="w-full py-2 px-3 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500/50">
                        <option value="Active" class="bg-[#121324]" ${workerStatusFilter === 'Active' ? 'selected' : ''}>Active Staff Only</option>
                        <option value="Inactive" class="bg-[#121324]" ${workerStatusFilter === 'Inactive' ? 'selected' : ''}>Inactive Staff</option>
                        <option value="All" class="bg-[#121324]" ${workerStatusFilter === 'All' ? 'selected' : ''}>All Workers</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Worker Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${filtered.length ? filtered.map(w => {
                const attSum = getWorkerAttendanceSummary(w.id, curYear, curMonth);
                const pendingAdv = getWorkerPendingAdvances(w.id);

                return `
                    <div class="glass-card rounded-2xl p-5 card-hover flex flex-col justify-between">
                        <div>
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-center gap-3">
                                    ${w.photo_path 
                                        ? `<img src="${w.photo_path}" alt="${w.name}" class="w-12 h-12 rounded-xl object-cover border border-white/10 cursor-pointer" onclick="previewImage('${w.photo_path}', '${w.name}')">`
                                        : `<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-[0_0_12px_rgba(139,92,246,0.3)]">${w.name.slice(0, 2).toUpperCase()}</div>`
                                    }
                                    <div>
                                        <h3 class="text-sm font-bold text-white leading-tight">
                                            <button onclick="openWorkerProfileModal(${w.id})" class="hover:text-violet-300 text-left font-bold">${w.name}</button>
                                        </h3>
                                        <span class="inline-block mt-1 text-[11px] font-semibold text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/10">
                                            ${w.role}
                                        </span>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${w.status === 'Active' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-white/[0.06] text-slate-400 border border-white/10'}">
                                    ${w.status}
                                </span>
                            </div>

                            <div class="mt-4 pt-3 border-t border-white/[0.07] space-y-1.5 text-xs">
                                <div class="flex items-center justify-between">
                                    <span class="text-slate-400">Mobile:</span>
                                    <span class="font-medium text-slate-200">${w.phone}</span>
                                </div>
                                ${w.emergency_contact ? `
                                    <div class="flex items-center justify-between">
                                        <span class="text-slate-400">Emergency:</span>
                                        <span class="font-medium text-slate-200">${w.emergency_contact}</span>
                                    </div>
                                ` : ''}
                                <div class="flex items-center justify-between">
                                    <span class="text-slate-400">Daily Wage:</span>
                                    <span class="font-bold text-white">${formatINR(w.daily_wage)} / day</span>
                                </div>
                            </div>

                            <div class="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] grid grid-cols-2 gap-2 text-center">
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Days This Month</span>
                                    <span class="text-base font-extrabold text-white">${attSum.effective_days} days</span>
                                </div>
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Pending Advance</span>
                                    <span class="text-base font-extrabold ${pendingAdv > 0 ? 'text-amber-400' : 'text-emerald-400'}">
                                        ${formatINR(pendingAdv)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="mt-5 pt-3 border-t border-white/[0.07] flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5">
                                <a href="tel:${w.phone}" class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors" title="Call Worker">
                                    <i data-lucide="phone" class="w-4 h-4"></i>
                                </a>
                                <a href="https://wa.me/91${w.phone.replace(/[^0-9]/g, '')}" target="_blank" class="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors" title="WhatsApp Chat">
                                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                                </a>
                            </div>

                            <button onclick="openWorkerProfileModal(${w.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-colgate text-white text-xs font-bold rounded-lg transition-colors">
                                <span>Profile & Khata</span>
                                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('') : `
                <div class="col-span-full glass-card p-12 rounded-2xl text-center">
                    <i data-lucide="users" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
                    <h3 class="text-sm font-bold text-white">No Workers Found</h3>
                    <p class="text-xs text-slate-400 mt-1">Try changing your search keywords or add a new worker.</p>
                </div>
            `}
        </div>

        <!-- Add Worker Modal Container -->
        <div id="add-worker-modal" class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100">
                <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-colgate/10 text-colgate flex items-center justify-center">
                            <i data-lucide="user-plus" class="w-4 h-4"></i>
                        </span>
                        <h3 class="text-sm font-bold text-slate-900">Add New Godown Worker</h3>
                    </div>
                    <button onclick="closeModal('add-worker-modal')" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>

                <form onsubmit="handleSaveWorker(event, null)" class="p-5 space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                        <input type="text" id="add-w-name" required placeholder="e.g., Rameshwar Kumar" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                            <input type="tel" id="add-w-phone" required placeholder="10-digit mobile" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Emergency Phone</label>
                            <input type="tel" id="add-w-emergency" placeholder="Family contact" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Role / Designation *</label>
                            <input type="text" id="add-w-role" required placeholder="e.g., Delivery Van Driver" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Daily Wage (₹) *</label>
                            <input type="number" id="add-w-wage" step="10" value="550" required class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Date of Joining</label>
                            <input type="date" id="add-w-join" value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Profile Photo</label>
                            <input type="file" id="add-w-photo" accept="image/*" class="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200">
                        </div>
                    </div>

                    <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" onclick="closeModal('add-worker-modal')" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-colgate hover:bg-colgate-dark text-white text-xs font-bold rounded-xl shadow-sm">Save Worker</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Worker Profile Modal Container -->
        <div id="worker-profile-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div id="worker-profile-modal-content" class="glass-panel rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10"></div>
        </div>

        <!-- Edit Worker Modal Container -->
        <div id="edit-worker-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div id="edit-worker-modal-content" class="glass-panel rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/10"></div>
        </div>
    `;

    document.getElementById('view-workers').innerHTML = html;
}

function openAddWorkerModal() {
    openModal('add-worker-modal');
}

function handleSaveWorker(e, workerId) {
    e.preventDefault();

    if (workerId) {
        // Edit existing worker
        const w = APP_DATA.workers.find(item => item.id === workerId);
        if (!w) return;

        w.name = document.getElementById('edit-w-name').value.trim();
        w.phone = document.getElementById('edit-w-phone').value.trim();
        w.emergency_contact = document.getElementById('edit-w-emergency').value.trim();
        w.role = document.getElementById('edit-w-role').value.trim();
        w.daily_wage = Number(document.getElementById('edit-w-wage').value) || 500;
        w.monthly_salary = w.daily_wage * 26;
        w.status = document.getElementById('edit-w-status').value;

        const photoInput = document.getElementById('edit-w-photo');
        if (photoInput && photoInput.files && photoInput.files[0]) {
            compressImageFile(photoInput.files[0], 600, 0.7)
                .then(dataUrl => {
                    w.photo_path = dataUrl;
                    StorageManager.save(APP_DATA);
                    closeModal('edit-worker-modal');
                    renderWorkers();
                    openWorkerProfileModal(w.id);
                    showToast(`Profile for '${w.name}' permanently saved!`);
                })
                .catch(err => {
                    console.error('Worker photo compression error:', err);
                    showToast('Failed to compress photo. Saved without updating photo.', 'error');
                    StorageManager.save(APP_DATA);
                    closeModal('edit-worker-modal');
                    renderWorkers();
                    openWorkerProfileModal(w.id);
                });
            return;
        }

        StorageManager.save(APP_DATA);
        closeModal('edit-worker-modal');
        renderWorkers();
        openWorkerProfileModal(w.id);
        showToast(`Profile for '${w.name}' permanently saved!`);
    } else {
        // New worker
        const name = document.getElementById('add-w-name').value.trim();
        const phone = document.getElementById('add-w-phone').value.trim();
        const emergency = document.getElementById('add-w-emergency').value.trim();
        const role = document.getElementById('add-w-role').value.trim();
        const daily_wage = Number(document.getElementById('add-w-wage').value) || 500;
        const join_date = document.getElementById('add-w-join').value || new Date().toISOString().split('T')[0];

        const newId = APP_DATA.workers.length ? Math.max(...APP_DATA.workers.map(w => w.id)) + 1 : 1;

        const newWorker = {
            id: newId,
            name,
            phone,
            emergency_contact: emergency,
            role,
            daily_wage,
            monthly_salary: daily_wage * 26,
            status: "Active",
            join_date,
            photo_path: ""
        };

        const photoInput = document.getElementById('add-w-photo');
        if (photoInput && photoInput.files && photoInput.files[0]) {
            compressImageFile(photoInput.files[0], 600, 0.7)
                .then(dataUrl => {
                    newWorker.photo_path = dataUrl;
                    APP_DATA.workers.push(newWorker);
                    StorageManager.save(APP_DATA);
                    closeModal('add-worker-modal');
                    renderWorkers();
                    showToast(`New worker '${name}' added permanently!`);
                })
                .catch(err => {
                    console.error('Worker photo compression error:', err);
                    showToast('Failed to compress photo. Saved worker without photo.', 'error');
                    APP_DATA.workers.push(newWorker);
                    StorageManager.save(APP_DATA);
                    closeModal('add-worker-modal');
                    renderWorkers();
                });
            return;
        }

        APP_DATA.workers.push(newWorker);
        StorageManager.save(APP_DATA);
        closeModal('add-worker-modal');
        renderWorkers();
        showToast(`New worker '${name}' added permanently!`);
    }
}

function openWorkerProfileModal(workerId) {
    const w = APP_DATA.workers.find(item => item.id === workerId);
    if (!w) return;

    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;

    const attSum = getWorkerAttendanceSummary(w.id, curYear, curMonth);
    const pendingAdv = getWorkerPendingAdvances(w.id);
    const earnedGross = attSum.effective_days * w.daily_wage;
    const estNet = Math.max(0, earnedGross - pendingAdv);

    const workerAdvances = APP_DATA.advances.filter(a => a.worker_id === w.id);

    const modalContent = document.getElementById('worker-profile-modal-content');
    modalContent.innerHTML = `
        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div class="flex items-center gap-4">
                ${w.photo_path 
                    ? `<img src="${w.photo_path}" alt="${w.name}" class="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md">`
                    : `<div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 to-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">${w.name.slice(0, 2).toUpperCase()}</div>`
                }
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-lg font-bold text-slate-900">${w.name}</h3>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${w.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${w.status}</span>
                    </div>
                    <p class="text-xs text-colgate font-semibold mt-0.5">${w.role} • Joined ${formatDateDisplay(w.join_date)}</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <button onclick="openEditWorkerModal(${w.id})" class="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold" title="Edit Profile">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                </button>
                <button onclick="closeModal('worker-profile-modal')" class="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
        </div>

        <div class="p-6 space-y-6 text-xs">
            <!-- Monthly Metric Strip -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Days This Month</span>
                    <span class="text-lg font-extrabold text-slate-900 mt-0.5 block">${attSum.effective_days} days</span>
                    <span class="text-[10px] text-slate-500">P: ${attSum.present} | H: ${attSum.half_day}</span>
                </div>
                <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-emerald-700 block">Gross Earned</span>
                    <span class="text-lg font-extrabold text-emerald-800 mt-0.5 block">${formatINR(earnedGross)}</span>
                    <span class="text-[10px] text-emerald-600">${attSum.effective_days} × ${formatINR(w.daily_wage)}</span>
                </div>
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-amber-700 block">Pending Advance</span>
                    <span class="text-lg font-extrabold text-amber-800 mt-0.5 block">${formatINR(pendingAdv)}</span>
                    <span class="text-[10px] text-amber-600">Pending recovery</span>
                </div>
                <div class="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <span class="text-[10px] uppercase font-bold text-colgate block">Estimated Net Payout</span>
                    <span class="text-lg font-extrabold text-colgate mt-0.5 block">${formatINR(estNet)}</span>
                    <span class="text-[10px] text-blue-600">Gross - Advances</span>
                </div>
            </div>

            <!-- Khata Ledger Table -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
                <div class="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span class="font-bold text-slate-800">Khata Advance Ledger (${workerAdvances.length})</span>
                    <button onclick="closeModal('worker-profile-modal'); openModal('add-advance-modal');" class="text-colgate font-bold hover:underline">+ New Advance</button>
                </div>
                <div class="max-h-48 overflow-y-auto">
                    ${workerAdvances.length ? `
                        <table class="w-full text-left text-[11px]">
                            <thead class="bg-slate-50 text-slate-500 uppercase border-b border-slate-100">
                                <tr>
                                    <th class="p-2.5">Date</th>
                                    <th class="p-2.5">Amount</th>
                                    <th class="p-2.5">Mode</th>
                                    <th class="p-2.5">Reason</th>
                                    <th class="p-2.5">Status</th>
                                    <th class="p-2.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${workerAdvances.map(a => `
                                    <tr>
                                        <td class="p-2.5">${formatDateDisplay(a.payment_date)}</td>
                                        <td class="p-2.5 font-bold text-slate-900">${formatINR(a.amount_paid)}</td>
                                        <td class="p-2.5">${a.payment_mode}</td>
                                        <td class="p-2.5 max-w-[120px] truncate">${a.reason || 'Personal'}</td>
                                        <td class="p-2.5">
                                            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${a.status === 'Approved' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${a.status}</span>
                                        </td>
                                        <td class="p-2.5 text-right">
                                            ${a.status === 'Approved' ? `
                                                <button onclick="toggleAdvanceStatus(${a.id}, 'Settled')" class="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px]">Settle</button>
                                            ` : `<span class="text-slate-400">Settled</span>`}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="text-center py-6 text-slate-400 text-xs">No advances issued to this worker</p>'}
                </div>
            </div>

            <div class="pt-2 flex items-center justify-between border-t border-slate-100">
                <button onclick="confirmDeleteWorker(${w.id})" class="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                    <span>Delete Worker</span>
                </button>
                <button onclick="closeModal('worker-profile-modal')" class="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs">Close</button>
            </div>
        </div>
    `;

    openModal('worker-profile-modal');
}

function openEditWorkerModal(workerId) {
    const w = APP_DATA.workers.find(item => item.id === workerId);
    if (!w) return;

    closeModal('worker-profile-modal');

    const modalContent = document.getElementById('edit-worker-modal-content');
    modalContent.innerHTML = `
        <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 class="text-sm font-bold text-slate-900">Edit Worker Profile: ${w.name}</h3>
            <button onclick="closeModal('edit-worker-modal')" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>

        <form onsubmit="handleSaveWorker(event, ${w.id})" class="p-5 space-y-4 text-xs">
            <div>
                <label class="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input type="text" id="edit-w-name" value="${w.name}" required class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Mobile Phone *</label>
                    <input type="tel" id="edit-w-phone" value="${w.phone}" required class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Emergency Phone</label>
                    <input type="tel" id="edit-w-emergency" value="${w.emergency_contact || ''}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Role / Designation *</label>
                    <input type="text" id="edit-w-role" value="${w.role}" required class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Daily Wage (₹) *</label>
                    <input type="number" id="edit-w-wage" step="10" value="${w.daily_wage}" required class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Status *</label>
                    <select id="edit-w-status" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        <option value="Active" ${w.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Inactive" ${w.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Update Photo</label>
                    <input type="file" id="edit-w-photo" accept="image/*" class="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200">
                </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button type="button" onclick="closeModal('edit-worker-modal')" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 bg-colgate hover:bg-colgate-dark text-white text-xs font-bold rounded-xl shadow-sm">Save Permanent Changes</button>
            </div>
        </form>
    `;

    openModal('edit-worker-modal');
}

function confirmDeleteWorker(workerId) {
    const w = APP_DATA.workers.find(item => item.id === workerId);
    if (!w) return;

    if (confirm(`Are you sure you want to delete worker '${w.name}'? This will permanently remove their records.`)) {
        APP_DATA.workers = APP_DATA.workers.filter(item => item.id !== workerId);
        APP_DATA.attendances = APP_DATA.attendances.filter(a => a.worker_id !== workerId);
        APP_DATA.advances = APP_DATA.advances.filter(a => a.worker_id !== workerId);
        StorageManager.save(APP_DATA);
        closeModal('worker-profile-modal');
        renderWorkers();
        showToast(`Worker '${w.name}' deleted.`);
    }
}

// -------------------------------------------------------------------
// 7. VIEW: DAILY ATTENDANCE REGISTER
// -------------------------------------------------------------------
let attendanceTargetDate = new Date().toISOString().split('T')[0];

function renderAttendance() {
    const activeWorkers = APP_DATA.workers.filter(w => w.status === 'Active');
    const existingRecs = APP_DATA.attendances.filter(a => a.date === attendanceTargetDate);
    const attMap = {};
    existingRecs.forEach(r => attMap[r.worker_id] = r);

    const html = `
        <div class="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex items-center gap-3">
                <label class="text-xs font-bold text-slate-300">Attendance Date:</label>
                <input type="date" value="${attendanceTargetDate}" onchange="attendanceTargetDate = this.value; renderAttendance();" class="text-xs font-bold py-2 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
                <button onclick="attendanceTargetDate = new Date().toISOString().split('T')[0]; renderAttendance();" class="text-xs font-semibold text-violet-300 px-2.5 py-1.5 bg-violet-500/15 rounded-lg hover:bg-violet-500/25 border border-violet-500/20">
                    Today
                </button>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <button type="button" onclick="setBulkAttendance('Present')" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors">
                    <i data-lucide="check-check" class="w-4 h-4"></i>
                    <span>Mark All Present</span>
                </button>
                <button type="button" onclick="setBulkAttendance('Paid Leave')" class="inline-flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 text-xs font-semibold rounded-xl transition-colors border border-white/10">
                    <i data-lucide="sun" class="w-4 h-4 text-cyan-400"></i>
                    <span>Mark All Holiday</span>
                </button>
                <button type="button" onclick="switchView('monthly-attendance')" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600/30 to-indigo-600/20 text-white text-xs font-bold rounded-xl transition-colors border border-violet-500/30">
                    <i data-lucide="calendar" class="w-4 h-4"></i>
                    <span>Monthly View</span>
                </button>
            </div>
        </div>

        <form onsubmit="handleSaveAttendance(event)" class="glass-card rounded-2xl overflow-hidden">
            <div class="p-4 bg-white/[0.03] border-b border-white/[0.07] flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>ACTIVE GODOWN WORKERS (${activeWorkers.length})</span>
                <span class="text-slate-200 font-bold">${formatDateDisplay(attendanceTargetDate)}</span>
            </div>

            <div class="divide-y divide-white/[0.06]">
                ${activeWorkers.map(w => {
                    const rec = attMap[w.id] || { status: 'Present', notes: '' };
                    return `
                        <div class="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors">
                            <div class="flex items-center gap-3.5 min-w-[240px]">
                                ${w.photo_path 
                                    ? `<img src="${w.photo_path}" alt="${w.name}" class="w-11 h-11 rounded-xl object-cover border border-white/10">`
                                    : `<div class="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm">${w.name.slice(0, 2).toUpperCase()}</div>`
                                }
                                <div>
                                    <h4 class="text-sm font-bold text-white">${w.name}</h4>
                                    <p class="text-xs text-slate-400">${w.role} • <span class="font-semibold text-slate-300">${formatINR(w.daily_wage)}/day</span></p>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center gap-2">
                                <label class="cursor-pointer">
                                    <input type="radio" name="att_status_${w.id}" value="Present" class="peer sr-only" ${rec.status === 'Present' ? 'checked' : ''}>
                                    <div class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600 transition-all flex items-center gap-1.5 shadow-xs">
                                        <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                        <span>Present (Full)</span>
                                    </div>
                                </label>
                                <label class="cursor-pointer">
                                    <input type="radio" name="att_status_${w.id}" value="Half Day" class="peer sr-only" ${rec.status === 'Half Day' ? 'checked' : ''}>
                                    <div class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 peer-checked:bg-amber-500 peer-checked:text-white peer-checked:border-amber-500 transition-all flex items-center gap-1.5 shadow-xs">
                                        <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                        <span>Half Day (0.5)</span>
                                    </div>
                                </label>
                                <label class="cursor-pointer">
                                    <input type="radio" name="att_status_${w.id}" value="Absent" class="peer sr-only" ${rec.status === 'Absent' ? 'checked' : ''}>
                                    <div class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 peer-checked:bg-rose-600 peer-checked:text-white peer-checked:border-rose-600 transition-all flex items-center gap-1.5 shadow-xs">
                                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                        <span>Absent</span>
                                    </div>
                                </label>
                                <label class="cursor-pointer">
                                    <input type="radio" name="att_status_${w.id}" value="Paid Leave" class="peer sr-only" ${rec.status === 'Paid Leave' ? 'checked' : ''}>
                                    <div class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 transition-all flex items-center gap-1.5 shadow-xs">
                                        <i data-lucide="sun" class="w-3.5 h-3.5"></i>
                                        <span>Paid Leave</span>
                                    </div>
                                </label>
                            </div>

                            <div class="lg:w-48">
                                <input type="text" id="att_notes_${w.id}" value="${rec.notes || ''}" placeholder="Notes (overtime, late...)" class="w-full px-3 py-1.5 text-xs bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-violet-500/50">
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="p-5 bg-white/[0.02] border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="text-xs text-slate-400">
                    <i data-lucide="info" class="w-4 h-4 inline mr-1 text-slate-500"></i>
                    Changes persist automatically and feed into the monthly wage settlement calculator.
                </div>
                <button type="submit" class="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all">
                    <i data-lucide="save" class="w-4 h-4"></i>
                    <span>Save Daily Attendance Sheet</span>
                </button>
            </div>
        </form>
    `;

    document.getElementById('view-attendance').innerHTML = html;
}

function setBulkAttendance(status) {
    const radios = document.querySelectorAll(`input[type="radio"][value="${status}"]`);
    radios.forEach(r => r.checked = true);
    showToast(`All workers selected as '${status}'`);
}

function handleSaveAttendance(e) {
    e.preventDefault();
    const activeWorkers = APP_DATA.workers.filter(w => w.status === 'Active');

    activeWorkers.forEach(w => {
        const checked = document.querySelector(`input[name="att_status_${w.id}"]:checked`);
        const status = checked ? checked.value : 'Present';
        const notesInput = document.getElementById(`att_notes_${w.id}`);
        const notes = notesInput ? notesInput.value.trim() : '';

        // Check if existing attendance record exists for worker on this date
        const existingIdx = APP_DATA.attendances.findIndex(a => a.worker_id === w.id && a.date === attendanceTargetDate);
        if (existingIdx !== -1) {
            APP_DATA.attendances[existingIdx].status = status;
            APP_DATA.attendances[existingIdx].notes = notes;
        } else {
            const newId = APP_DATA.attendances.length ? Math.max(...APP_DATA.attendances.map(a => a.id)) + 1 : 1;
            APP_DATA.attendances.push({
                id: newId,
                worker_id: w.id,
                date: attendanceTargetDate,
                status,
                notes
            });
        }
    });

    StorageManager.save(APP_DATA);
    showToast(`Attendance for ${formatDateDisplay(attendanceTargetDate)} saved permanently!`);
}

// -------------------------------------------------------------------
// 8. VIEW: MONTHLY ATTENDANCE REGISTER (MUSTER ROLL)
// -------------------------------------------------------------------
let monthlyAttYear = new Date().getFullYear();
let monthlyAttMonth = new Date().getMonth() + 1;

function renderMonthlyAttendance() {
    const activeWorkers = APP_DATA.workers.filter(w => w.status === 'Active');
    const daysInMonth = new Date(monthlyAttYear, monthlyAttMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const html = `
        <div class="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h2 class="text-base font-bold text-white">Monthly Muster Roll & Attendance Grid</h2>
                <p class="text-xs text-slate-400">Day-wise attendance tracking for calculating working days and monthly wages</p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <select onchange="monthlyAttMonth = Number(this.value); renderMonthlyAttendance();" class="text-xs font-bold py-2 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-violet-500/50">
                    ${monthNames.map((name, idx) => `<option value="${idx + 1}" class="bg-[#121324]" ${monthlyAttMonth === idx + 1 ? 'selected' : ''}>${name}</option>`).join('')}
                </select>
                <select onchange="monthlyAttYear = Number(this.value); renderMonthlyAttendance();" class="text-xs font-bold py-2 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-violet-500/50">
                    ${[monthlyAttYear - 1, monthlyAttYear, monthlyAttYear + 1].map(y => `<option value="${y}" class="bg-[#121324]" ${monthlyAttYear === y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
                <button onclick="exportAttendanceCSV()" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>Export CSV</span>
                </button>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span class="inline-flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px]">P</span>
                <span class="text-slate-300">Present (1.0)</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-[10px]">H</span>
                <span class="text-slate-300">Half Day (0.5)</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center font-bold text-[10px]">A</span>
                <span class="text-slate-300">Absent (0.0)</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-[10px]">L</span>
                <span class="text-slate-300">Paid Leave (1.0)</span>
            </span>
        </div>

        <div class="glass-card rounded-2xl overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead class="bg-[#0D0E1C] text-slate-200">
                        <tr>
                            <th class="py-3 px-3 font-bold sticky left-0 bg-[#0D0E1C] z-10 min-w-[160px] border-r border-white/[0.07]">Worker Name</th>
                            <th class="py-3 px-2 font-bold min-w-[120px]">Role</th>
                            ${days.map(d => {
                                const dt = new Date(monthlyAttYear, monthlyAttMonth - 1, d);
                                const isSun = dt.getDay() === 0;
                                return `<th class="py-2 px-1 text-center font-bold text-[11px] min-w-[28px] ${isSun ? 'bg-amber-500/15 text-amber-300' : ''}">${d}</th>`;
                            }).join('')}
                            <th class="py-3 px-3 text-center font-bold bg-violet-500/15 text-violet-300 min-w-[80px]">Total Eff.</th>
                            <th class="py-3 px-3 text-center font-bold bg-violet-500/15 text-violet-300 min-w-[70px]">%</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.06]">
                        ${activeWorkers.map(w => {
                            const sum = getWorkerAttendanceSummary(w.id, monthlyAttYear, monthlyAttMonth);
                            const recMap = {};
                            sum.records.forEach(r => {
                                const dayNum = Number(r.date.split('-')[2]);
                                recMap[dayNum] = r.status;
                            });

                            return `
                                <tr class="hover:bg-white/[0.03]">
                                    <td class="py-3 px-3 font-bold text-white sticky left-0 bg-[#121324] z-10 border-r border-white/[0.07]">
                                        <button onclick="openWorkerProfileModal(${w.id})" class="hover:text-violet-300 font-bold text-left">${w.name}</button>
                                    </td>
                                    <td class="py-3 px-2 text-slate-400 font-medium text-[11px] truncate max-w-[130px]">${w.role}</td>
                                    ${days.map(d => {
                                        const st = recMap[d];
                                        if (st === 'Present') return `<td class="py-2 px-1 text-center"><span class="inline-block w-6 h-6 rounded leading-6 text-center font-bold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">P</span></td>`;
                                        if (st === 'Half Day') return `<td class="py-2 px-1 text-center"><span class="inline-block w-6 h-6 rounded leading-6 text-center font-bold text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">H</span></td>`;
                                        if (st === 'Absent') return `<td class="py-2 px-1 text-center"><span class="inline-block w-6 h-6 rounded leading-6 text-center font-bold text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">A</span></td>`;
                                        if (st === 'Paid Leave') return `<td class="py-2 px-1 text-center"><span class="inline-block w-6 h-6 rounded leading-6 text-center font-bold text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">L</span></td>`;
                                        return `<td class="py-2 px-1 text-center text-slate-600">-</td>`;
                                    }).join('')}
                                    <td class="py-3 px-3 text-center font-extrabold text-white bg-violet-500/10 border-l border-white/[0.07]">${sum.effective_days}</td>
                                    <td class="py-3 px-3 text-center font-bold ${sum.attendance_pct >= 85 ? 'text-emerald-400' : sum.attendance_pct >= 60 ? 'text-amber-400' : 'text-rose-400'} bg-violet-500/10">${sum.attendance_pct}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('view-monthly-attendance').innerHTML = html;
}

// -------------------------------------------------------------------
// 9. VIEW: ADVANCES KHATA LEDGER
// -------------------------------------------------------------------
let advanceWorkerFilter = '';
let advanceStatusFilter = '';

function renderAdvances() {
    const activeWorkers = APP_DATA.workers.filter(w => w.status === 'Active');

    let filtered = APP_DATA.advances.filter(a => {
        if (advanceWorkerFilter && a.worker_id !== Number(advanceWorkerFilter)) return false;
        if (advanceStatusFilter && a.status !== advanceStatusFilter) return false;
        return true;
    });

    const totalGiven = APP_DATA.advances.reduce((sum, a) => sum + (Number(a.amount_paid) || 0), 0);
    const totalPending = APP_DATA.advances.filter(a => a.status === 'Approved').reduce((sum, a) => sum + (Number(a.amount_paid) || 0), 0);
    const totalSettled = APP_DATA.advances.filter(a => a.status === 'Settled').reduce((sum, a) => sum + (Number(a.amount_paid) || 0), 0);

    const html = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h2 class="text-xl font-bold text-white">Godown Staff Advance Khata Ledger</h2>
                <p class="text-xs text-slate-400">Track cash advances, UPI transfers, and wage deduction settlements</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="exportAdvancesCSV()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors">
                    <i data-lucide="download" class="w-4 h-4 text-emerald-600"></i>
                    <span>Export CSV</span>
                </button>
                <button onclick="openModal('add-advance-modal')" class="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    <span>Issue New Advance</span>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Advances Given</span>
                <div class="mt-2 text-2xl font-extrabold text-white">${formatINR(totalGiven)}</div>
                <span class="text-[11px] text-slate-400 mt-1 block">Cumulative staff payouts</span>
            </div>
            <div class="glass-card p-5 rounded-2xl border-amber-500/20">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Outstanding Balance</span>
                <div class="mt-2 text-2xl font-extrabold text-amber-400">${formatINR(totalPending)}</div>
                <span class="text-[11px] text-amber-700 mt-1 block">Pending recovery from upcoming payroll</span>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">Settled / Recovered</span>
                <div class="mt-2 text-2xl font-extrabold text-emerald-400">${formatINR(totalSettled)}</div>
                <span class="text-[11px] text-emerald-700 mt-1 block">Reconciled in salary calculations</span>
            </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div class="sm:col-span-6">
                    <select onchange="advanceWorkerFilter = this.value; renderAdvances();" class="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        <option value="">All Godown Staff</option>
                        ${activeWorkers.map(w => `<option value="${w.id}" ${advanceWorkerFilter === String(w.id) ? 'selected' : ''}>${w.name} (${w.role})</option>`).join('')}
                    </select>
                </div>
                <div class="sm:col-span-6">
                    <select onchange="advanceStatusFilter = this.value; renderAdvances();" class="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        <option value="">All Statuses</option>
                        <option value="Approved" ${advanceStatusFilter === 'Approved' ? 'selected' : ''}>Approved (Pending Recovery)</option>
                        <option value="Settled" ${advanceStatusFilter === 'Settled' ? 'selected' : ''}>Settled / Deducted</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                            <th class="py-3 px-4">Worker</th>
                            <th class="py-3 px-4">Payment Date</th>
                            <th class="py-3 px-4">Amount</th>
                            <th class="py-3 px-4">Mode</th>
                            <th class="py-3 px-4">Reason / Notes</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.06] text-slate-200">
                        ${filtered.length ? filtered.map(a => {
                            const wrk = APP_DATA.workers.find(w => w.id === a.worker_id) || { name: 'Unknown', role: '' };
                            return `
                                <tr class="hover:bg-slate-50/60">
                                    <td class="py-3.5 px-4 font-bold text-slate-900">
                                        ${wrk.name}
                                        <span class="block text-[10px] text-slate-400 font-normal">${wrk.role}</span>
                                    </td>
                                    <td class="py-3.5 px-4 whitespace-nowrap">${formatDateDisplay(a.payment_date)}</td>
                                    <td class="py-3.5 px-4 font-extrabold text-slate-900 text-sm whitespace-nowrap">${formatINR(a.amount_paid)}</td>
                                    <td class="py-3.5 px-4 whitespace-nowrap">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${a.payment_mode === 'Cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">${a.payment_mode}</span>
                                    </td>
                                    <td class="py-3.5 px-4 max-w-xs truncate">${a.reason || 'Personal expense'}</td>
                                    <td class="py-3.5 px-4 whitespace-nowrap">
                                        <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${a.status === 'Approved' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${a.status}</span>
                                    </td>
                                    <td class="py-3.5 px-4 text-right whitespace-nowrap">
                                        ${a.status === 'Approved' ? `
                                            <button onclick="toggleAdvanceStatus(${a.id}, 'Settled')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px]">Mark Settled</button>
                                        ` : `
                                            <button onclick="toggleAdvanceStatus(${a.id}, 'Approved')" class="text-slate-400 hover:text-amber-600 font-semibold text-[10px] underline">Reopen</button>
                                        `}
                                    </td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="7" class="p-8 text-center text-slate-400">No advance records found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add Advance Modal -->
        <div id="add-advance-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100">
                <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 class="text-sm font-bold text-slate-900">Issue Cash/UPI Advance</h3>
                    <button onclick="closeModal('add-advance-modal')" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">✕</button>
                </div>
                <form onsubmit="handleSaveAdvance(event)" class="p-5 space-y-4 text-xs">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Select Worker *</label>
                        <select id="new-adv-worker" required class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                            ${activeWorkers.map(w => `<option value="${w.id}">${w.name} (${w.role}) - Daily: ₹${w.daily_wage}</option>`).join('')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                            <input type="number" id="new-adv-amount" min="50" step="50" required placeholder="e.g. 1500" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Payment Mode *</label>
                            <select id="new-adv-mode" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI (GPay/PhonePe)</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Payment Date *</label>
                        <input type="date" id="new-adv-date" value="${new Date().toISOString().split('T')[0]}" required class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Reason / Purpose</label>
                        <input type="text" id="new-adv-reason" placeholder="e.g., Medical, home repair, grocery" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" onclick="closeModal('add-advance-modal')" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm">Save & Issue Advance</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('view-advances').innerHTML = html;
}

function handleSaveAdvance(e) {
    e.preventDefault();
    const worker_id = Number(document.getElementById('new-adv-worker').value);
    const amount = Number(document.getElementById('new-adv-amount').value);
    const payment_mode = document.getElementById('new-adv-mode').value;
    const payment_date = document.getElementById('new-adv-date').value || new Date().toISOString().split('T')[0];
    const reason = document.getElementById('new-adv-reason').value.trim();

    const newId = APP_DATA.advances.length ? Math.max(...APP_DATA.advances.map(a => a.id)) + 1 : 1;

    APP_DATA.advances.push({
        id: newId,
        worker_id,
        request_date: payment_date,
        payment_date,
        amount_requested: amount,
        amount_paid: amount,
        payment_mode,
        reason,
        status: "Approved",
        settlement_id: null
    });

    StorageManager.save(APP_DATA);
    closeModal('add-advance-modal');
    renderAdvances();
    showToast(`Advance payment of ${formatINR(amount)} saved permanently!`);
}

function toggleAdvanceStatus(id, newStatus) {
    const adv = APP_DATA.advances.find(a => a.id === id);
    if (!adv) return;
    adv.status = newStatus;
    StorageManager.save(APP_DATA);
    renderAdvances();
    showToast(`Advance marked as '${newStatus}'`);
}

// -------------------------------------------------------------------
// 10. VIEW: VEHICLE FLEET & FUEL TRACKER
// -------------------------------------------------------------------
let fuelVehicleFilter = '';

function renderFuel() {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;

    let filtered = APP_DATA.fuel_expenses.filter(f => {
        if (fuelVehicleFilter && f.vehicle_id !== Number(fuelVehicleFilter)) return false;
        return true;
    });

    const monthlyExpenses = APP_DATA.fuel_expenses.filter(f => {
        const [y, m] = f.date.split('-').map(Number);
        return y === curYear && m === curMonth;
    });

    const totalMonthSpent = monthlyExpenses.reduce((sum, f) => sum + (Number(f.amount_spent) || 0), 0);
    const totalMonthLiters = monthlyExpenses.reduce((sum, f) => sum + (Number(f.liters) || 0), 0);

    const html = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h2 class="text-xl font-bold text-white">Delivery Vehicles & Monthly Fuel Expenses</h2>
                <p class="text-xs text-slate-400">Track diesel, petrol, and CNG fills for Everest Spices and Colgate vans</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="openModal('add-vehicle-modal')" class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors">
                    <i data-lucide="truck" class="w-4 h-4 text-colgate"></i>
                    <span>+ Add Vehicle</span>
                </button>
                <button onclick="exportFuelCSV()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors">
                    <i data-lucide="download" class="w-4 h-4 text-emerald-600"></i>
                    <span>Export CSV</span>
                </button>
                <button onclick="openModal('add-fuel-modal')" class="inline-flex items-center gap-2 px-4 py-2 bg-colgate hover:bg-colgate-dark text-white text-xs font-bold rounded-xl shadow-sm transition-colors">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    <span>Log Fuel Fill</span>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Fuel Cost This Month</span>
                <div class="mt-2 text-2xl font-extrabold text-white">${formatINR(totalMonthSpent)}</div>
                <span class="text-[11px] text-slate-400 mt-1 block">Active month expenditures</span>
            </div>
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Liters Filled</span>
                <div class="mt-2 text-2xl font-extrabold text-white">${totalMonthLiters.toFixed(1)} Liters</div>
                <span class="text-[11px] text-slate-400 mt-1 block">Active delivery van and auto consumption</span>
            </div>
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Fleet Units</span>
                <div class="mt-2 text-2xl font-extrabold text-white">${APP_DATA.vehicles.length} Vehicles</div>
                <span class="text-[11px] text-slate-400 mt-1 block">Everest & Colgate distribution fleet</span>
            </div>
        </div>

        <!-- Vehicle Fuel Analytics Bar Graph Card -->
        <div class="glass-card rounded-2xl p-5">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i data-lucide="bar-chart-2" class="w-4 h-4 text-cyan-400"></i>
                        <span>Vehicle Fuel Monthly Expenses Bar Graph</span>
                    </h3>
                    <p class="text-xs text-slate-400">Monthly diesel, petrol, and CNG consumption (₹) across delivery fleet</p>
                </div>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 self-start sm:self-auto flex items-center gap-1.5">
                    <i data-lucide="bar-chart" class="w-3.5 h-3.5"></i>
                    <span>Last 6 Months (Bar)</span>
                </span>
            </div>
            <div class="h-64 relative">
                <canvas id="fuelPageChartCanvas"></canvas>
            </div>
        </div>

        <!-- Vehicle Fleet Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${APP_DATA.vehicles.map(v => {
                const drv = APP_DATA.workers.find(w => w.id === v.assigned_driver_id) || { name: 'Unassigned' };
                const isDispatched = (APP_DATA.dispatch_beats || []).some(b => b.vehicle_id === v.id && (b.status === 'Dispatched' || b.status === 'DISPATCHED'));
                return `
                    <div class="glass-card p-4 rounded-xl flex items-center justify-between group transition-all card-hover">
                        <div class="min-w-0 flex-1 pr-2">
                            <h4 class="text-xs font-bold text-[#1E2421] truncate">${v.vehicle_name}</h4>
                            <p class="text-[11px] text-[#7A827E]">${v.vehicle_number} • ${v.fuel_type}</p>
                            <span class="text-[10px] text-[#466358] font-semibold">Driver: ${drv.name}</span>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.status === 'Active' ? 'bg-[#EFF2EC] text-[#466358] border border-[#DCE2D8]' : 'bg-slate-100 text-slate-600'}">${v.status}</span>
                            
                            <!-- Delete / Remove Action Button -->
                            ${isDispatched ? `
                                <button type="button" onclick="promptDeleteVehicle(${v.id})" 
                                    class="w-7 h-7 rounded-lg bg-rose-50 text-rose-300 border border-rose-100 flex items-center justify-center cursor-not-allowed transition-all"
                                    title="Cannot remove a vehicle currently on a dispatched route"
                                    data-dispatched="true">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                            ` : `
                                <button type="button" onclick="promptDeleteVehicle(${v.id})" 
                                    class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/60 flex items-center justify-center transition-all shadow-xs"
                                    title="Remove vehicle ${v.vehicle_number}">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Filter -->
        <div class="glass-card p-4 rounded-2xl">
            <select onchange="fuelVehicleFilter = this.value; renderFuel();" class="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                <option value="">All Vehicles</option>
                ${APP_DATA.vehicles.map(v => `<option value="${v.id}" ${fuelVehicleFilter === String(v.id) ? 'selected' : ''}>${v.vehicle_name} (${v.vehicle_number})</option>`).join('')}
            </select>
        </div>

        <!-- Fuel Expense Table -->
        <div class="glass-card rounded-2xl overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-[#0D0E1C] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-white/[0.07]">
                        <tr>
                            <th class="py-3 px-4">Date</th>
                            <th class="py-3 px-4">Vehicle</th>
                            <th class="py-3 px-4">Driver</th>
                            <th class="py-3 px-4">Fuel Type</th>
                            <th class="py-3 px-4">Amount Spent</th>
                            <th class="py-3 px-4">Liters</th>
                            <th class="py-3 px-4">Odometer</th>
                            <th class="py-3 px-4">Slip</th>
                            <th class="py-3 px-4">Notes</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.06] text-slate-200">
                        ${filtered.length ? filtered.map(f => {
                            const veh = APP_DATA.vehicles.find(v => v.id === f.vehicle_id) || { vehicle_name: 'Unknown', vehicle_number: '' };
                            const drv = APP_DATA.workers.find(w => w.id === f.driver_id) || { name: 'Unassigned' };
                            return `
                                <tr class="hover:bg-white/[0.03]">
                                    <td class="py-3 px-4 whitespace-nowrap text-slate-300">${formatDateDisplay(f.date)}</td>
                                    <td class="py-3 px-4 font-bold text-white">
                                        ${veh.vehicle_name}
                                        <span class="block text-[10px] text-slate-400 font-normal">${veh.vehicle_number}</span>
                                    </td>
                                    <td class="py-3 px-4 whitespace-nowrap">${drv.name}</td>
                                    <td class="py-3 px-4 whitespace-nowrap">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${f.fuel_type === 'Diesel' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">${f.fuel_type}</span>
                                    </td>
                                    <td class="py-3 px-4 font-extrabold text-slate-900 text-sm whitespace-nowrap">${formatINR(f.amount_spent)}</td>
                                    <td class="py-3 px-4 whitespace-nowrap">${f.liters} L</td>
                                    <td class="py-3 px-4 whitespace-nowrap font-mono">${f.odometer_reading ? f.odometer_reading + ' KM' : '-'}</td>
                                    <td class="py-3 px-4 whitespace-nowrap">
                                        ${f.receipt_image ? `
                                            <button onclick="previewImage('${f.receipt_image}', 'Receipt Slip: ${veh.vehicle_number}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] inline-flex items-center gap-1">
                                                <i data-lucide="image" class="w-3 h-3 text-colgate"></i> View
                                            </button>
                                        ` : '<span class="text-slate-400">-</span>'}
                                    </td>
                                    <td class="py-3 px-4 max-w-xs truncate text-slate-500">${f.notes || '-'}</td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="9" class="p-8 text-center text-slate-400">No fuel fill entries recorded</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add Fuel Fill Modal -->
        <div id="add-fuel-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div class="glass-panel rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/10">
                <div class="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                    <h3 class="text-sm font-bold text-white">Log Delivery Vehicle Fuel Fill</h3>
                    <button onclick="closeModal('add-fuel-modal')" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10">✕</button>
                </div>
                <form onsubmit="handleSaveFuel(event)" class="p-5 space-y-4 text-xs">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Select Vehicle *</label>
                            <select id="new-fuel-veh" required class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                ${APP_DATA.vehicles.map(v => `<option value="${v.id}">${v.vehicle_name} (${v.vehicle_number})</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Driver In-Charge</label>
                            <select id="new-fuel-drv" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="">Unassigned</option>
                                ${APP_DATA.workers.map(w => `<option value="${w.id}">${w.name} (${w.role})</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Fuel Type *</label>
                            <select id="new-fuel-type" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="Diesel">Diesel</option>
                                <option value="Petrol">Petrol</option>
                                <option value="CNG">CNG</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Amount Spent (₹) *</label>
                            <input type="number" id="new-fuel-amount" step="10" required placeholder="e.g. 2500" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Liters Filled</label>
                            <input type="number" id="new-fuel-liters" step="0.1" placeholder="e.g. 28.5" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Date Filled *</label>
                            <input type="date" id="new-fuel-date" value="${new Date().toISOString().split('T')[0]}" required class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Odometer Reading (KM)</label>
                            <input type="number" id="new-fuel-odometer" placeholder="e.g. 42500" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Receipt / Bill Slip</label>
                            <input type="file" id="new-fuel-receipt" accept="image/*" class="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Petrol Pump Notes</label>
                            <input type="text" id="new-fuel-notes" placeholder="e.g., HP Petrol Pump" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" onclick="closeModal('add-fuel-modal')" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-colgate hover:bg-colgate-dark text-white font-bold rounded-xl shadow-sm">Save Fuel Log</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Add Vehicle Modal -->
        <div id="add-vehicle-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div class="glass-panel rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-white/10">
                <div class="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                    <h3 class="text-sm font-bold text-white">Register Delivery Vehicle</h3>
                    <button onclick="closeModal('add-vehicle-modal')" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10">✕</button>
                </div>
                <form onsubmit="handleSaveVehicle(event)" class="p-5 space-y-4 text-xs">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Registration / Number Plate *</label>
                        <input type="text" id="new-veh-number" required placeholder="e.g. MH-14-XY-9999" class="w-full px-3 py-2 uppercase font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Vehicle Description / Model *</label>
                        <input type="text" id="new-veh-name" required placeholder="e.g. Tata Ace Gold (Everest Van 2)" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Vehicle Type</label>
                            <select id="new-veh-type" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="Delivery Van">Delivery Van</option>
                                <option value="Mini Truck">Mini Truck</option>
                                <option value="Auto Rickshaw">Auto Rickshaw</option>
                                <option value="Delivery Bike">Delivery Bike</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Fuel Type</label>
                            <select id="new-veh-fuel" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="Diesel">Diesel</option>
                                <option value="Petrol">Petrol</option>
                                <option value="CNG">CNG</option>
                            </select>
                        </div>
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" onclick="closeModal('add-vehicle-modal')" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-colgate hover:bg-colgate-dark text-white font-bold rounded-xl shadow-sm">Save Vehicle</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('view-fuel').innerHTML = html;

    // Render Fuel Page Analytics Bar Chart
    setTimeout(() => {
        const canvas = document.getElementById('fuelPageChartCanvas');
        if (canvas) {
            if (currentVehicleFuelChart) currentVehicleFuelChart.destroy();

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const labels = [];
            const dataVals = [];

            for (let i = 5; i >= 0; i--) {
                const d = new Date(curYear, curMonth - 1 - i, 1);
                const y = d.getFullYear();
                const m = d.getMonth() + 1;
                labels.push(`${monthNames[m - 1]} ${y}`);

                const spent = filtered
                    .filter(f => {
                        const [fy, fm] = f.date.split('-').map(Number);
                        return fy === y && fm === m;
                    })
                    .reduce((sum, f) => sum + (Number(f.amount_spent) || 0), 0);

                dataVals.push(spent);
            }

            const ctx = canvas.getContext('2d');
            let barGrad = 'rgba(6, 182, 212, 0.85)';
            if (ctx) {
                const g = ctx.createLinearGradient(0, 0, 0, 240);
                g.addColorStop(0, '#06B6D4');
                g.addColorStop(1, '#8B5CF6');
                barGrad = g;
            }

            currentVehicleFuelChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Fuel Expense (₹)',
                        data: dataVals,
                        backgroundColor: barGrad,
                        hoverBackgroundColor: '#22D3EE',
                        borderColor: '#06B6D4',
                        borderWidth: 1.5,
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 45
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0D0E1C',
                            titleColor: '#F8FAFC',
                            bodyColor: '#38BDF8',
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                            borderWidth: 1,
                            padding: 10,
                            cornerRadius: 8,
                            displayColors: false,
                            callbacks: {
                                label: context => ' Monthly Fuel: ₹' + Number(context.raw || 0).toLocaleString('en-IN')
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.06)' },
                            ticks: {
                                color: '#94A3B8',
                                font: { size: 10 },
                                callback: val => '₹' + Number(val).toLocaleString('en-IN')
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#94A3B8',
                                font: { size: 11, weight: '600' }
                            }
                        }
                    }
                }
            });
        }
        lucide.createIcons();
    }, 100);
}

function handleSaveFuel(e) {
    e.preventDefault();
    const vehicle_id = Number(document.getElementById('new-fuel-veh').value);
    const driverVal = document.getElementById('new-fuel-drv').value;
    const driver_id = driverVal ? Number(driverVal) : null;
    const fuel_type = document.getElementById('new-fuel-type').value;
    const amount_spent = Number(document.getElementById('new-fuel-amount').value);
    const liters = Number(document.getElementById('new-fuel-liters').value) || 0;
    const date = document.getElementById('new-fuel-date').value || new Date().toISOString().split('T')[0];
    const odoVal = document.getElementById('new-fuel-odometer').value;
    const odometer_reading = odoVal ? Number(odoVal) : null;
    const notes = document.getElementById('new-fuel-notes').value.trim();

    const newId = APP_DATA.fuel_expenses.length ? Math.max(...APP_DATA.fuel_expenses.map(f => f.id)) + 1 : 1;

    const newExpense = {
        id: newId,
        vehicle_id,
        driver_id,
        date,
        fuel_type,
        amount_spent,
        liters,
        odometer_reading,
        receipt_image: "",
        notes
    };

    const receiptInput = document.getElementById('new-fuel-receipt');
    if (receiptInput && receiptInput.files && receiptInput.files[0]) {
        compressImageFile(receiptInput.files[0], 600, 0.7)
            .then(dataUrl => {
                newExpense.receipt_image = dataUrl;
                APP_DATA.fuel_expenses.push(newExpense);
                StorageManager.save(APP_DATA);
                closeModal('add-fuel-modal');
                renderFuel();
                showToast(`Fuel expense of ${formatINR(amount_spent)} saved permanently!`);
            })
            .catch(err => {
                console.error('Fuel receipt compression error:', err);
                showToast('Failed to compress receipt. Saved expense without receipt image.', 'error');
                APP_DATA.fuel_expenses.push(newExpense);
                StorageManager.save(APP_DATA);
                closeModal('add-fuel-modal');
                renderFuel();
            });
        return;
    }

    APP_DATA.fuel_expenses.push(newExpense);
    StorageManager.save(APP_DATA);
    closeModal('add-fuel-modal');
    renderFuel();
    showToast(`Fuel expense of ${formatINR(amount_spent)} saved permanently!`);
}

function handleSaveVehicle(e) {
    e.preventDefault();
    const vehicle_number = document.getElementById('new-veh-number').value.trim().toUpperCase();
    const vehicle_name = document.getElementById('new-veh-name').value.trim();
    const vehicle_type = document.getElementById('new-veh-type').value;
    const fuel_type = document.getElementById('new-veh-fuel').value;

    const newId = APP_DATA.vehicles.length ? Math.max(...APP_DATA.vehicles.map(v => v.id)) + 1 : 1;

    APP_DATA.vehicles.push({
        id: newId,
        vehicle_number,
        vehicle_name,
        vehicle_type,
        fuel_type,
        assigned_driver_id: null,
        status: "Active"
    });

    StorageManager.save(APP_DATA);
    closeModal('add-vehicle-modal');
    renderFuel();
    showToast(`Vehicle '${vehicle_number}' registered!`);
}

// -------------------------------------------------------------------
// VEHICLE FLEET MANAGEMENT: REMOVE / DELETE VEHICLE
// -------------------------------------------------------------------
function promptDeleteVehicle(vehicleId) {
    const v = APP_DATA.vehicles.find(item => item.id === Number(vehicleId));
    if (!v) {
        showToast("Vehicle not found", "error");
        return;
    }

    // Active Dispatch Check (Safeguard)
    const activeBeat = (APP_DATA.dispatch_beats || []).find(b => 
        b.vehicle_id === v.id && (b.status === 'Dispatched' || b.status === 'DISPATCHED')
    );

    const iconWrap = document.getElementById('delete-veh-icon-wrap');
    const titleEl = document.getElementById('delete-veh-modal-title');
    const bodyEl = document.getElementById('delete-veh-modal-body');
    const footerEl = document.getElementById('delete-veh-modal-footer');

    if (activeBeat) {
        if (iconWrap) {
            iconWrap.className = "w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center flex-shrink-0";
            iconWrap.innerHTML = '<i data-lucide="alert-triangle" class="w-5 h-5"></i>';
        }
        if (titleEl) titleEl.textContent = "Vehicle In Active Dispatch";

        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-2">
                    <div class="flex items-center gap-2 font-bold text-xs text-amber-800">
                        <i data-lucide="shield-alert" class="w-4 h-4 text-amber-600"></i>
                        <span>Cannot Remove Dispatched Vehicle</span>
                    </div>
                    <p class="text-xs text-slate-700 leading-relaxed">
                        Vehicle <strong class="font-mono text-[#1E2421] bg-white px-2 py-0.5 rounded border border-amber-200">${v.vehicle_number}</strong> (${v.vehicle_name}) is currently assigned to an active route with the status <span class="px-1.5 py-0.5 rounded bg-amber-200/70 font-bold uppercase text-[10px] text-amber-900">${activeBeat.status}</span>.
                    </p>
                    <div class="p-3 rounded-xl bg-white border border-amber-200/60 flex items-center justify-between text-xs">
                        <div>
                            <span class="font-bold text-[#1E2421] block">${activeBeat.beat_name}</span>
                            <span class="text-[10px] text-slate-500">${formatDateDisplay(activeBeat.dispatch_date)} • ${activeBeat.crates_everest} Crates, ${activeBeat.cartons_colgate} Cartons</span>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                            ${activeBeat.status}
                        </span>
                    </div>
                    <p class="text-[11px] text-slate-500 pt-1">
                        Cannot remove a vehicle currently on a dispatched route. Please mark the beat completed or reassign the delivery vehicle before deletion.
                    </p>
                </div>
            `;
        }

        if (footerEl) {
            footerEl.innerHTML = `
                <button type="button" onclick="closeModal('delete-vehicle-modal')" class="px-5 py-2.5 bg-[#1E2421] hover:bg-[#3A544A] text-white text-xs font-bold rounded-xl shadow-sm transition-all">
                    Understood
                </button>
            `;
        }
    } else {
        if (iconWrap) {
            iconWrap.className = "w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center flex-shrink-0";
            iconWrap.innerHTML = '<i data-lucide="trash-2" class="w-5 h-5"></i>';
        }
        if (titleEl) titleEl.textContent = "Remove Vehicle";

        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="space-y-3">
                    <p class="text-xs text-[#1E2421] leading-relaxed">
                        Are you sure you want to remove vehicle <strong class="font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">${v.vehicle_number}</strong>? This action cannot be undone.
                    </p>
                    
                    <div class="p-3.5 rounded-2xl bg-[#F8F9F6] border border-[#ECEEE8] space-y-1.5">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-[#7A827E]">Description / Model:</span>
                            <span class="font-bold text-[#1E2421]">${v.vehicle_name}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-[#7A827E]">Fuel & Type:</span>
                            <span class="font-bold text-[#1E2421]">${v.fuel_type} (${v.vehicle_type || 'Commercial'})</span>
                        </div>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-[#7A827E]">Fleet Status:</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF2EC] text-[#466358]">${v.status}</span>
                        </div>
                    </div>

                    <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-800 flex items-start gap-2">
                        <i data-lucide="info" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
                        <span>This vehicle will be permanently removed from new beat dispatches. Historical fuel records will remain preserved in logs.</span>
                    </div>
                </div>
            `;
        }

        if (footerEl) {
            footerEl.innerHTML = `
                <button type="button" onclick="closeModal('delete-vehicle-modal')" class="px-4 py-2.5 text-xs font-semibold text-[#7A827E] hover:text-[#1E2421] rounded-xl hover:bg-[#EFF2EC] transition-colors">
                    Cancel
                </button>
                <button type="button" onclick="confirmDeleteVehicle(${v.id})" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    <span>Confirm Remove</span>
                </button>
            `;
        }
    }

    openModal('delete-vehicle-modal');
    lucide.createIcons();
}

function confirmDeleteVehicle(vehicleId) {
    const vIndex = APP_DATA.vehicles.findIndex(item => item.id === Number(vehicleId));
    if (vIndex === -1) {
        showToast("Vehicle not found or already removed", "error");
        closeModal('delete-vehicle-modal');
        return;
    }

    const veh = APP_DATA.vehicles[vIndex];
    const vehNumber = veh.vehicle_number;

    // Double check active route safeguard
    const activeBeat = (APP_DATA.dispatch_beats || []).find(b => 
        b.vehicle_id === veh.id && (b.status === 'Dispatched' || b.status === 'DISPATCHED')
    );
    if (activeBeat) {
        showToast(`Cannot remove vehicle ${vehNumber}: Currently on active route '${activeBeat.beat_name}'`, "error");
        closeModal('delete-vehicle-modal');
        return;
    }

    // 1. Remove from in-memory state
    APP_DATA.vehicles.splice(vIndex, 1);

    // 2. Clear fuel vehicle filter if selected
    if (fuelVehicleFilter === String(vehicleId)) {
        fuelVehicleFilter = '';
    }

    // 3. Persist state to localStorage and sync to Firebase Realtime Database
    StorageManager.save(APP_DATA);

    // 4. Close modal
    closeModal('delete-vehicle-modal');

    // 5. Re-render UI views immediately
    if (currentView === 'fuel') {
        renderFuel();
    } else {
        renderView(currentView);
    }

    // 6. Display brief feedback toast
    showToast(`Vehicle '${vehNumber}' removed successfully`, "success");
}

// -------------------------------------------------------------------
// 11. VIEW: BEAT DISPATCHES
// -------------------------------------------------------------------
function renderDispatches() {
    const today = new Date().toISOString().split('T')[0];
    const todayDispatches = APP_DATA.dispatch_beats.filter(d => d.dispatch_date === today);

    const totalEverestCrates = todayDispatches.reduce((sum, d) => sum + (Number(d.crates_everest) || 0), 0);
    const totalColgateCartons = todayDispatches.reduce((sum, d) => sum + (Number(d.cartons_colgate) || 0), 0);

    const html = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h2 class="text-xl font-bold text-white">Beat Dispatches & Stock Loading Log</h2>
                <p class="text-xs text-slate-400">Track delivery van routes, driver-helper crews, Everest crates, and Colgate cartons</p>
            </div>
            <button onclick="openModal('add-dispatch-modal')" class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] self-start">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Dispatch New Beat</span>
            </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div class="glass-card p-5 rounded-2xl border-rose-500/20">
                <span class="text-xs font-bold uppercase tracking-wider text-rose-400">Everest Crates Dispatched</span>
                <div class="mt-2 text-2xl font-extrabold text-white">${totalEverestCrates} Crates</div>
                <span class="text-[11px] text-slate-500 mt-1 block">Spices blends, hing, garam & kitchen king</span>
            </div>
            <div class="glass-card p-5 rounded-2xl border-blue-500/20">
                <span class="text-xs font-bold uppercase tracking-wider text-blue-400">Colgate Cartons Dispatched</span>
                <div class="mt-2 text-2xl font-extrabold text-white">${totalColgateCartons} Cartons</div>
                <span class="text-[11px] text-slate-500 mt-1 block">Toothpastes, Vedshakti, MaxFresh</span>
            </div>
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Beats Logged</span>
                <div class="mt-2 text-2xl font-extrabold text-white">${APP_DATA.dispatch_beats.length} Routes</div>
                <span class="text-[11px] text-slate-400 mt-1 block">Market distribution beats</span>
            </div>
        </div>

        <div class="glass-card rounded-2xl overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-[#0D0E1C] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-white/[0.07]">
                        <tr>
                            <th class="py-3 px-4">Date</th>
                            <th class="py-3 px-4">Beat / Route</th>
                            <th class="py-3 px-4">Vehicle</th>
                            <th class="py-3 px-4">Crew (Driver & Helper)</th>
                            <th class="py-3 px-4">Everest Crates</th>
                            <th class="py-3 px-4">Colgate Cartons</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.06] text-slate-200">
                        ${APP_DATA.dispatch_beats.length ? APP_DATA.dispatch_beats.map(b => {
                            const veh = APP_DATA.vehicles.find(v => v.id === b.vehicle_id) || { vehicle_name: 'Unknown', vehicle_number: '' };
                            const drv = APP_DATA.workers.find(w => w.id === b.driver_id) || { name: 'Unassigned' };
                            const hlp = APP_DATA.workers.find(w => w.id === b.helper_id) || { name: 'None' };
                            return `
                                <tr class="hover:bg-white/[0.03]">
                                    <td class="py-3.5 px-4 whitespace-nowrap text-slate-300">${formatDateDisplay(b.dispatch_date)}</td>
                                    <td class="py-3.5 px-4 font-bold text-white">
                                        ${b.beat_name}
                                        ${b.notes ? `<span class="block text-[11px] font-normal text-slate-400">${b.notes}</span>` : ''}
                                    </td>
                                    <td class="py-3.5 px-4 whitespace-nowrap">
                                        <span class="font-mono text-slate-800 font-bold block">${veh.vehicle_number}</span>
                                        <span class="text-[10px] text-slate-400">${veh.vehicle_name}</span>
                                    </td>
                                    <td class="py-3.5 px-4 whitespace-nowrap">
                                        <div>Driver: <strong class="text-slate-900">${drv.name}</strong></div>
                                        <div class="text-[11px] text-slate-500">Helper: ${hlp.name}</div>
                                    </td>
                                    <td class="py-3.5 px-4 whitespace-nowrap font-extrabold text-everest">${b.crates_everest} Crates</td>
                                    <td class="py-3.5 px-4 whitespace-nowrap font-extrabold text-colgate">${b.cartons_colgate} Cartons</td>
                                    <td class="py-3.5 px-4 whitespace-nowrap">
                                        <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${b.status === 'Dispatched' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${b.status}</span>
                                    </td>
                                    <td class="py-3.5 px-4 text-right whitespace-nowrap">
                                        ${b.status === 'Dispatched' ? `
                                            <button onclick="toggleDispatchStatus(${b.id}, 'Completed')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px]">Mark Completed</button>
                                        ` : '<span class="text-slate-400 text-[11px]">Delivered</span>'}
                                    </td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="8" class="p-8 text-center text-slate-400">No beat dispatches logged</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add Dispatch Modal -->
        <div id="add-dispatch-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div class="glass-panel rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/10">
                <div class="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                    <h3 class="text-sm font-bold text-white">Dispatch Delivery Beat / Route</h3>
                    <button onclick="closeModal('add-dispatch-modal')" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10">✕</button>
                </div>
                <form onsubmit="handleSaveDispatch(event)" class="p-5 space-y-4 text-xs">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Beat / Route Name *</label>
                        <input type="text" id="new-beat-name" required placeholder="e.g. Main Bazaar Wholesale Route A" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Vehicle *</label>
                            <select id="new-beat-veh" required class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                ${APP_DATA.vehicles.map(v => `<option value="${v.id}">${v.vehicle_name} (${v.vehicle_number})</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Dispatch Date *</label>
                            <input type="date" id="new-beat-date" value="${new Date().toISOString().split('T')[0]}" required class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Delivery Driver</label>
                            <select id="new-beat-drv" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="">Unassigned</option>
                                ${APP_DATA.workers.map(w => `<option value="${w.id}">${w.name} (${w.role})</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Godown Helper</label>
                            <select id="new-beat-hlp" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="">None</option>
                                ${APP_DATA.workers.map(w => `<option value="${w.id}">${w.name} (${w.role})</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Everest Crates</label>
                            <input type="number" id="new-beat-everest" min="0" value="0" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Colgate Cartons</label>
                            <input type="number" id="new-beat-colgate" min="0" value="0" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Notes / Drop Points</label>
                        <input type="text" id="new-beat-notes" placeholder="e.g. 20 retail stores" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" onclick="closeModal('add-dispatch-modal')" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-everest hover:bg-everest-dark text-white font-bold rounded-xl shadow-sm">Save & Dispatch</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('view-dispatches').innerHTML = html;
}

function handleSaveDispatch(e) {
    e.preventDefault();
    const beat_name = document.getElementById('new-beat-name').value.trim();
    const vehicle_id = Number(document.getElementById('new-beat-veh').value);
    const dispatch_date = document.getElementById('new-beat-date').value || new Date().toISOString().split('T')[0];
    const drvVal = document.getElementById('new-beat-drv').value;
    const hlpVal = document.getElementById('new-beat-hlp').value;
    const driver_id = drvVal ? Number(drvVal) : null;
    const helper_id = hlpVal ? Number(hlpVal) : null;
    const crates_everest = Number(document.getElementById('new-beat-everest').value) || 0;
    const cartons_colgate = Number(document.getElementById('new-beat-colgate').value) || 0;
    const notes = document.getElementById('new-beat-notes').value.trim();

    const newId = APP_DATA.dispatch_beats.length ? Math.max(...APP_DATA.dispatch_beats.map(d => d.id)) + 1 : 1;

    APP_DATA.dispatch_beats.push({
        id: newId,
        dispatch_date,
        beat_name,
        vehicle_id,
        driver_id,
        helper_id,
        crates_everest,
        cartons_colgate,
        status: "Dispatched",
        notes
    });

    StorageManager.save(APP_DATA);
    closeModal('add-dispatch-modal');
    renderDispatches();
    showToast(`Dispatch '${beat_name}' recorded!`);
}

function toggleDispatchStatus(id, newStatus) {
    const b = APP_DATA.dispatch_beats.find(d => d.id === id);
    if (!b) return;
    b.status = newStatus;
    StorageManager.save(APP_DATA);
    renderDispatches();
    showToast(`Beat dispatch marked as '${newStatus}'`);
}

// -------------------------------------------------------------------
// 12. VIEW: DAMAGED & EXPIRY RETURNS
// -------------------------------------------------------------------
let returnBrandFilter = '';
let returnStatusFilter = '';

function renderReturns() {
    let filtered = APP_DATA.damaged_returns.filter(r => {
        if (returnBrandFilter && r.brand !== returnBrandFilter) return false;
        if (returnStatusFilter && r.claim_status !== returnStatusFilter) return false;
        return true;
    });

    const totalClaims = APP_DATA.damaged_returns.reduce((sum, r) => sum + (Number(r.credit_note_amount) || 0), 0);
    const pendingCredit = APP_DATA.damaged_returns.filter(r => r.claim_status !== 'Credit Note Received').reduce((sum, r) => sum + (Number(r.credit_note_amount) || 0), 0);
    const creditedAmount = APP_DATA.damaged_returns.filter(r => r.claim_status === 'Credit Note Received').reduce((sum, r) => sum + (Number(r.credit_note_amount) || 0), 0);

    const html = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h2 class="text-xl font-bold text-white">Damaged & Expiry Return Register</h2>
                <p class="text-xs text-slate-400">Track damaged cartons, leaking paste tubes, and expired spice packets to claim credit notes</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="exportReturnsCSV()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors">
                    <i data-lucide="download" class="w-4 h-4 text-emerald-600"></i>
                    <span>Export CSV</span>
                </button>
                <button onclick="openModal('add-return-modal')" class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    <span>Log Damaged Stock</span>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Return Claims</span>
                <div class="mt-2 text-2xl font-extrabold text-white">${formatINR(totalClaims)}</div>
                <span class="text-[11px] text-slate-400 mt-1 block">Everest & Colgate returns logged</span>
            </div>
            <div class="glass-card p-5 rounded-2xl border-amber-500/20">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Awaiting Depot Credit Note</span>
                <div class="mt-2 text-2xl font-extrabold text-amber-400">${formatINR(pendingCredit)}</div>
                <span class="text-[11px] text-amber-400 mt-1 block">Pending approval at depot</span>
            </div>
            <div class="glass-card p-5 rounded-2xl border-emerald-500/20">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Credit Notes Received</span>
                <div class="mt-2 text-2xl font-extrabold text-emerald-400">${formatINR(creditedAmount)}</div>
                <span class="text-[11px] text-emerald-400 mt-1 block">Credited to distributor ledger</span>
            </div>
        </div>

        <div class="glass-card p-4 rounded-2xl">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div class="sm:col-span-6">
                    <select onchange="returnBrandFilter = this.value; renderReturns();" class="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        <option value="">All Brands (Everest & Colgate)</option>
                        <option value="Everest Spices" ${returnBrandFilter === 'Everest Spices' ? 'selected' : ''}>Everest Spices</option>
                        <option value="Colgate-Palmolive" ${returnBrandFilter === 'Colgate-Palmolive' ? 'selected' : ''}>Colgate-Palmolive</option>
                    </select>
                </div>
                <div class="sm:col-span-6">
                    <select onchange="returnStatusFilter = this.value; renderReturns();" class="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        <option value="">All Claim Statuses</option>
                        <option value="Pending Inspection" ${returnStatusFilter === 'Pending Inspection' ? 'selected' : ''}>Pending Inspection</option>
                        <option value="Submitted to Depot" ${returnStatusFilter === 'Submitted to Depot' ? 'selected' : ''}>Submitted to Depot</option>
                        <option value="Credit Note Received" ${returnStatusFilter === 'Credit Note Received' ? 'selected' : ''}>Credit Note Received</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="glass-card rounded-2xl overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-[#0D0E1C] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-white/[0.07]">
                        <tr>
                            <th class="py-3 px-4">Date</th>
                            <th class="py-3 px-4">Brand</th>
                            <th class="py-3 px-4">Product & Retailer</th>
                            <th class="py-3 px-4">Quantity</th>
                            <th class="py-3 px-4">Reason</th>
                            <th class="py-3 px-4">Claim Value</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/[0.06] text-slate-200">
                        ${filtered.length ? filtered.map(r => `
                            <tr class="hover:bg-white/[0.03]">
                                <td class="py-3 px-4 whitespace-nowrap text-slate-300">${formatDateDisplay(r.return_date)}</td>
                                <td class="py-3 px-4 whitespace-nowrap">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.brand.includes('Everest') ? 'bg-red-50 text-everest border border-red-200' : 'bg-blue-50 text-colgate border border-blue-200'}">${r.brand}</span>
                                </td>
                                <td class="py-3 px-4 font-bold text-white">
                                    ${r.product_name}
                                    <span class="block text-[10px] text-slate-400 font-normal">Retailer: ${r.retailer_name} ${r.batch_no ? '• Batch: ' + r.batch_no : ''}</span>
                                </td>
                                <td class="py-3 px-4 whitespace-nowrap font-bold">${r.quantity} ${r.unit}</td>
                                <td class="py-3 px-4 whitespace-nowrap">${r.reason}</td>
                                <td class="py-3 px-4 whitespace-nowrap font-extrabold text-slate-900">${formatINR(r.credit_note_amount)}</td>
                                <td class="py-3 px-4 whitespace-nowrap">
                                    <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${r.claim_status === 'Credit Note Received' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${r.claim_status}</span>
                                    ${r.credit_note_number ? `<span class="block font-mono text-[9px] text-emerald-700 mt-0.5">#${r.credit_note_number}</span>` : ''}
                                </td>
                                <td class="py-3 px-4 text-right whitespace-nowrap">
                                    <button onclick="openUpdateClaimModal(${r.id})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[10px]">Update Claim</button>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="8" class="p-8 text-center text-slate-400">No damage return records found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add Return Modal -->
        <div id="add-return-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div class="glass-panel rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/10">
                <div class="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                    <h3 class="text-sm font-bold text-white">Log Damaged / Expired Product</h3>
                    <button onclick="closeModal('add-return-modal')" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10">✕</button>
                </div>
                <form onsubmit="handleSaveReturn(event)" class="p-5 space-y-4 text-xs">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Company / Brand *</label>
                            <select id="new-ret-brand" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="Everest Spices">Everest Spices</option>
                                <option value="Colgate-Palmolive">Colgate-Palmolive</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Return Date *</label>
                            <input type="date" id="new-ret-date" value="${new Date().toISOString().split('T')[0]}" required class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Product Description *</label>
                        <input type="text" id="new-ret-prod" required placeholder="e.g. Everest Kitchen King 100g or Colgate MaxFresh 150g" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Retailer / Kirana Shop *</label>
                            <input type="text" id="new-ret-ret" required placeholder="e.g. Shree Ganesh Kirana" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Batch Number</label>
                            <input type="text" id="new-ret-batch" placeholder="e.g. EV-2026-B8" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Quantity *</label>
                            <input type="number" id="new-ret-qty" min="1" value="1" required class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Unit</label>
                            <select id="new-ret-unit" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                                <option value="Cartons">Cartons</option>
                                <option value="Packets">Packets</option>
                                <option value="Tubes">Tubes</option>
                                <option value="Boxes">Boxes</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Claim Amt (₹) *</label>
                            <input type="number" id="new-ret-amt" step="10" required placeholder="e.g. 1800" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Damage Reason</label>
                        <select id="new-ret-reason" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                            <option value="Damaged in Transit">Damaged in Transit</option>
                            <option value="Packaging Leakage">Packaging Leakage</option>
                            <option value="Expired">Expired</option>
                            <option value="Seal Broken">Seal Broken</option>
                        </select>
                    </div>
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" onclick="closeModal('add-return-modal')" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm">Save Return Claim</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Update Claim Modal Container -->
        <div id="update-claim-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div id="update-claim-modal-content" class="glass-panel rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-white/10"></div>
        </div>
    `;

    document.getElementById('view-returns').innerHTML = html;
}

function handleSaveReturn(e) {
    e.preventDefault();
    const brand = document.getElementById('new-ret-brand').value;
    const return_date = document.getElementById('new-ret-date').value || new Date().toISOString().split('T')[0];
    const product_name = document.getElementById('new-ret-prod').value.trim();
    const retailer_name = document.getElementById('new-ret-ret').value.trim();
    const batch_no = document.getElementById('new-ret-batch').value.trim();
    const quantity = Number(document.getElementById('new-ret-qty').value) || 1;
    const unit = document.getElementById('new-ret-unit').value;
    const credit_note_amount = Number(document.getElementById('new-ret-amt').value) || 0;
    const reason = document.getElementById('new-ret-reason').value;

    const newId = APP_DATA.damaged_returns.length ? Math.max(...APP_DATA.damaged_returns.map(r => r.id)) + 1 : 1;

    APP_DATA.damaged_returns.push({
        id: newId,
        return_date,
        brand,
        product_name,
        retailer_name,
        batch_no,
        expiry_date: "",
        quantity,
        unit,
        reason,
        claim_status: "Pending Inspection",
        credit_note_amount,
        credit_note_number: "",
        notes: ""
    });

    StorageManager.save(APP_DATA);
    closeModal('add-return-modal');
    renderReturns();
    showToast(`Damaged return for '${product_name}' logged!`);
}

function openUpdateClaimModal(id) {
    const r = APP_DATA.damaged_returns.find(item => item.id === id);
    if (!r) return;

    const modalContent = document.getElementById('update-claim-modal-content');
    modalContent.innerHTML = `
        <div class="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <h3 class="text-sm font-bold text-white">Update Depot Credit Note Claim</h3>
            <button onclick="closeModal('update-claim-modal')" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10">✕</button>
        </div>
        <form onsubmit="handleSaveClaimUpdate(event, ${r.id})" class="p-5 space-y-4 text-xs">
            <div>
                <span class="block text-slate-500 font-bold">Product:</span>
                <p class="font-bold text-slate-900 text-sm mt-0.5">${r.product_name}</p>
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Claim Status *</label>
                <select id="claim-status-input" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    <option value="Pending Inspection" ${r.claim_status === 'Pending Inspection' ? 'selected' : ''}>Pending Inspection</option>
                    <option value="Submitted to Depot" ${r.claim_status === 'Submitted to Depot' ? 'selected' : ''}>Submitted to Depot</option>
                    <option value="Credit Note Received" ${r.claim_status === 'Credit Note Received' ? 'selected' : ''}>Credit Note Received</option>
                    <option value="Rejected" ${r.claim_status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Approved Credit Amount (₹)</label>
                <input type="number" id="claim-amt-input" step="10" value="${r.credit_note_amount}" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Credit Note Number</label>
                <input type="text" id="claim-num-input" value="${r.credit_note_number || ''}" placeholder="e.g. CN-EV-9821" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button type="button" onclick="closeModal('update-claim-modal')" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 bg-colgate hover:bg-colgate-dark text-white font-bold rounded-xl shadow-sm">Save Claim Update</button>
            </div>
        </form>
    `;

    openModal('update-claim-modal');
}

function handleSaveClaimUpdate(e, id) {
    e.preventDefault();
    const r = APP_DATA.damaged_returns.find(item => item.id === id);
    if (!r) return;

    r.claim_status = document.getElementById('claim-status-input').value;
    r.credit_note_amount = Number(document.getElementById('claim-amt-input').value) || 0;
    r.credit_note_number = document.getElementById('claim-num-input').value.trim();

    StorageManager.save(APP_DATA);
    closeModal('update-claim-modal');
    renderReturns();
    showToast(`Claim status updated for '${r.product_name}'`);
}

// -------------------------------------------------------------------
// 13. VIEW: MONTHLY SALARY & ADVANCE SETTLEMENT CALCULATOR
// -------------------------------------------------------------------
let settlementYear = new Date().getFullYear();
let settlementMonth = new Date().getMonth() + 1;

function renderSettlements() {
    const activeWorkers = APP_DATA.workers.filter(w => w.status === 'Active');
    const monthStr = `${settlementYear}-${String(settlementMonth).padStart(2, '0')}`;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const html = `
        <div class="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h2 class="text-base font-bold text-white">Godown Staff Payroll & Advance Reconciliation</h2>
                <p class="text-xs text-slate-400">Auto-calculate net payout: <code class="text-violet-300 bg-violet-500/10 px-1 rounded">(Days Worked × Daily Wage) - Advances Deducted = Net Payout</code></p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <select onchange="settlementMonth = Number(this.value); renderSettlements();" class="text-xs font-bold py-2 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-violet-500/50">
                    ${monthNames.map((name, idx) => `<option value="${idx + 1}" ${settlementMonth === idx + 1 ? 'selected' : ''}>${name}</option>`).join('')}
                </select>
                <select onchange="settlementYear = Number(this.value); renderSettlements();" class="text-xs font-bold py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-colgate outline-none">
                    ${[settlementYear - 1, settlementYear, settlementYear + 1].map(y => `<option value="${y}" ${settlementYear === y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
                <button onclick="exportSettlementsCSV()" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>Export CSV</span>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${activeWorkers.map(w => {
                const attSum = getWorkerAttendanceSummary(w.id, settlementYear, settlementMonth);
                const gross = attSum.effective_days * w.daily_wage;
                const pendingAdv = getWorkerPendingAdvances(w.id);
                const autoDeduct = Math.min(pendingAdv, gross);
                const netPay = Math.max(0, gross - autoDeduct);

                const existingSettlement = APP_DATA.salary_settlements.find(s => s.worker_id === w.id && s.month_year === monthStr);

                return `
                    <div class="glass-card rounded-2xl overflow-hidden flex flex-col justify-between">
                        <div class="p-5 border-b border-white/[0.08] flex items-center justify-between ${existingSettlement ? 'bg-emerald-500/10' : 'bg-white/[0.02]'}">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                                    ${w.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 class="text-sm font-bold text-white leading-tight">${w.name}</h3>
                                    <p class="text-[11px] text-slate-400">${w.role} • Wage: <strong class="text-slate-200">${formatINR(w.daily_wage)}/day</strong></p>
                                </div>
                            </div>

                            ${existingSettlement ? `
                                <div class="flex items-center gap-2">
                                    <span class="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Settled</span>
                                    <button onclick="renderVoucher(${existingSettlement.id})" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800" title="Print Salary Slip">
                                        <i data-lucide="printer" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            ` : `
                                <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">Unsettled</span>
                            `}
                        </div>

                        <div class="p-5 space-y-4 text-xs">
                            <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-center">
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Attendance Days</span>
                                    <span class="text-base font-extrabold text-white mt-0.5 block">${attSum.effective_days} Days</span>
                                    <span class="text-[10px] text-slate-500">P: ${attSum.present} | H: ${attSum.half_day}</span>
                                </div>
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Gross Earned</span>
                                    <span class="text-base font-extrabold text-emerald-700 mt-0.5 block">${formatINR(gross)}</span>
                                    <span class="text-[10px] text-slate-500">${attSum.effective_days} × ${formatINR(w.daily_wage)}</span>
                                </div>
                            </div>

                            <div class="flex items-center justify-between p-3 rounded-xl ${pendingAdv > 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-white/[0.04] border border-white/[0.07] text-slate-400'}">
                                <span class="font-semibold">Outstanding Advance Khata:</span>
                                <span class="font-extrabold ${pendingAdv > 0 ? 'text-amber-400' : 'text-slate-300'}">${formatINR(pendingAdv)}</span>
                            </div>

                            <form onsubmit="handleProcessSettlement(event, ${w.id}, '${monthStr}', ${gross})" class="space-y-3 pt-1">
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Advance Deducted (₹)</label>
                                        <input type="number" id="deduct_${w.id}" value="${existingSettlement ? existingSettlement.advances_deducted : autoDeduct}" min="0" step="50" oninput="updateLivePayout(${w.id}, ${gross})" class="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Bonus / Incentive (₹)</label>
                                        <input type="number" id="bonus_${w.id}" value="${existingSettlement ? existingSettlement.bonus_incentive : 0}" min="0" step="50" oninput="updateLivePayout(${w.id}, ${gross})" class="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none">
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Payment Mode</label>
                                        <select id="mode_${w.id}" class="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none">
                                            <option value="Cash" ${existingSettlement && existingSettlement.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
                                            <option value="Bank Transfer" ${existingSettlement && existingSettlement.payment_mode === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                                            <option value="UPI" ${existingSettlement && existingSettlement.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Ref / UTR / Voucher</label>
                                        <input type="text" id="ref_${w.id}" value="${existingSettlement ? existingSettlement.payment_reference : ''}" placeholder="Voucher # or UTR" class="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none">
                                    </div>
                                </div>

                                <div class="mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-900/50 to-indigo-900/50 border border-violet-500/20 text-white flex items-center justify-between">
                                    <div>
                                        <span class="text-[10px] font-bold text-slate-400 uppercase block">Calculated Net Payout</span>
                                        <span id="live_net_${w.id}" class="text-xl font-black text-emerald-400">
                                            ${formatINR(existingSettlement ? existingSettlement.net_payout : netPay)}
                                        </span>
                                    </div>
                                    <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg transition-colors shadow-md flex items-center gap-1.5">
                                        <i data-lucide="check-circle" class="w-4 h-4"></i>
                                        <span>${existingSettlement ? 'Re-Settle' : 'Settle & Print Slip'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    document.getElementById('view-settlements').innerHTML = html;
}

function updateLivePayout(workerId, gross) {
    const deductEl = document.getElementById(`deduct_${workerId}`);
    const bonusEl = document.getElementById(`bonus_${workerId}`);
    const liveNetEl = document.getElementById(`live_net_${workerId}`);

    const deduct = Number(deductEl ? deductEl.value : 0) || 0;
    const bonus = Number(bonusEl ? bonusEl.value : 0) || 0;

    const net = Math.max(0, (gross - deduct) + bonus);
    if (liveNetEl) liveNetEl.textContent = formatINR(net);
}

function handleProcessSettlement(e, workerId, monthStr, gross) {
    e.preventDefault();
    const w = APP_DATA.workers.find(item => item.id === workerId);
    if (!w) return;

    const [year, month] = monthStr.split('-').map(Number);
    const attSum = getWorkerAttendanceSummary(w.id, year, month);

    const deduct = Number(document.getElementById(`deduct_${workerId}`).value) || 0;
    const bonus = Number(document.getElementById(`bonus_${workerId}`).value) || 0;
    const mode = document.getElementById(`mode_${workerId}`).value;
    const ref = document.getElementById(`ref_${workerId}`).value.trim();

    const net = Math.max(0, (gross - deduct) + bonus);

    let settlement = APP_DATA.salary_settlements.find(s => s.worker_id === workerId && s.month_year === monthStr);
    if (!settlement) {
        const newId = APP_DATA.salary_settlements.length ? Math.max(...APP_DATA.salary_settlements.map(s => s.id)) + 1 : 1;
        settlement = {
            id: newId,
            worker_id: workerId,
            month_year: monthStr,
            days_present: attSum.present,
            half_days: attSum.half_day,
            paid_leaves: attSum.paid_leave,
            absent_days: attSum.absent,
            effective_days: attSum.effective_days,
            daily_wage: w.daily_wage,
            gross_earnings: gross,
            advances_deducted: deduct,
            bonus_incentive: bonus,
            net_payout: net,
            settlement_date: new Date().toISOString().split('T')[0],
            payment_mode: mode,
            payment_reference: ref,
            notes: ""
        };
        APP_DATA.salary_settlements.push(settlement);
    } else {
        settlement.days_present = attSum.present;
        settlement.half_days = attSum.half_day;
        settlement.paid_leaves = attSum.paid_leave;
        settlement.absent_days = attSum.absent;
        settlement.effective_days = attSum.effective_days;
        settlement.daily_wage = w.daily_wage;
        settlement.gross_earnings = gross;
        settlement.advances_deducted = deduct;
        settlement.bonus_incentive = bonus;
        settlement.net_payout = net;
        settlement.settlement_date = new Date().toISOString().split('T')[0];
        settlement.payment_mode = mode;
        settlement.payment_reference = ref;
    }

    // Deduct / settle worker's approved advances up to deduct amount
    let remainingDeduct = deduct;
    const approvedAdvances = APP_DATA.advances.filter(a => a.worker_id === workerId && a.status === 'Approved');
    for (const adv of approvedAdvances) {
        if (remainingDeduct <= 0) break;
        if (adv.amount_paid <= remainingDeduct) {
            remainingDeduct -= adv.amount_paid;
            adv.status = 'Settled';
            adv.settlement_id = settlement.id;
        } else {
            adv.status = 'Settled';
            adv.settlement_id = settlement.id;
            const remainingBal = adv.amount_paid - remainingDeduct;
            remainingDeduct = 0;
            const newAdvId = APP_DATA.advances.length ? Math.max(...APP_DATA.advances.map(a => a.id)) + 1 : 1;
            APP_DATA.advances.push({
                id: newAdvId,
                worker_id: workerId,
                request_date: adv.request_date,
                payment_date: adv.payment_date,
                amount_requested: remainingBal,
                amount_paid: remainingBal,
                payment_mode: adv.payment_mode,
                reason: `Remaining balance from Advance #${adv.id}`,
                status: 'Approved',
                settlement_id: null
            });
        }
    }

    StorageManager.save(APP_DATA);
    showToast(`Salary settled for ${w.name}! Net payout: ${formatINR(net)}`);
    renderVoucher(settlement.id);
}

// -------------------------------------------------------------------
// 14. VIEW: PRINTABLE WAGE PAYMENT VOUCHER
// -------------------------------------------------------------------
function renderVoucher(settlementId) {
    const s = APP_DATA.salary_settlements.find(item => item.id === settlementId);
    if (!s) return;

    const w = APP_DATA.workers.find(item => item.id === s.worker_id) || { name: 'Worker', role: '', phone: '' };

    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
    const voucherEl = document.getElementById('view-voucher');
    voucherEl.classList.remove('hidden');

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = `Wage Payout Voucher #${s.id}`;

    voucherEl.innerHTML = `
        <div class="space-y-6 max-w-4xl mx-auto">
            <div class="no-print flex items-center justify-between">
                <button onclick="switchView('settlements')" class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i>
                    <span>Back to Calculator</span>
                </button>
                <button onclick="window.print()" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    <span>Print Official Voucher</span>
                </button>
            </div>

            <div class="bg-white rounded-2xl border border-slate-300 shadow-lg p-8 voucher-container">
                <div class="border-b-2 border-slate-900 pb-6 text-center">
                    <div class="inline-block px-3 py-1 rounded bg-red-100 text-everest text-[11px] font-bold uppercase tracking-wider mb-2">
                        Authorized FMCG Distribution Depot
                    </div>
                    <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Anupama Agencies</h1>
                    <p class="text-xs text-slate-600 font-semibold mt-1">
                        Authorized Distributor: <strong>Everest Spices</strong> & <strong>Colgate-Palmolive India Ltd.</strong>
                    </p>
                    <p class="text-[11px] text-slate-500 mt-0.5">Godown & Warehouse Operations • Daily Wage Payout Voucher</p>
                </div>

                <div class="py-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                        <span class="text-slate-400 font-medium block">Voucher Number:</span>
                        <span class="font-mono font-bold text-slate-900">VCHR-${s.id}-${s.month_year}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-medium block">Payout Month:</span>
                        <span class="font-bold text-slate-900">${s.month_year}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-medium block">Disbursement Date:</span>
                        <span class="font-bold text-slate-900">${formatDateDisplay(s.settlement_date)}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-medium block">Payment Mode:</span>
                        <span class="font-bold text-slate-900">${s.payment_mode} ${s.payment_reference ? '(' + s.payment_reference + ')' : ''}</span>
                    </div>
                </div>

                <div class="py-5 border-b border-slate-200 text-xs">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Godown Staff Particulars</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <span class="text-slate-500 block">Worker Name:</span>
                            <span class="text-sm font-extrabold text-slate-900">${w.name}</span>
                        </div>
                        <div>
                            <span class="text-slate-500 block">Designation / Role:</span>
                            <span class="font-bold text-slate-800">${w.role}</span>
                        </div>
                        <div>
                            <span class="text-slate-500 block">Registered Contact:</span>
                            <span class="font-bold text-slate-800">${w.phone}</span>
                        </div>
                    </div>
                </div>

                <div class="py-5 border-b border-slate-200 text-xs">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Attendance Days Breakdown</h3>
                    <div class="grid grid-cols-4 gap-3 text-center">
                        <div class="p-2.5 rounded bg-slate-50 border border-slate-100">
                            <span class="text-[10px] text-slate-500 uppercase font-bold block">Present (Full)</span>
                            <span class="text-sm font-bold text-slate-900 mt-1 block">${s.days_present}</span>
                        </div>
                        <div class="p-2.5 rounded bg-slate-50 border border-slate-100">
                            <span class="text-[10px] text-slate-500 uppercase font-bold block">Half Days (0.5)</span>
                            <span class="text-sm font-bold text-slate-900 mt-1 block">${s.half_days}</span>
                        </div>
                        <div class="p-2.5 rounded bg-slate-50 border border-slate-100">
                            <span class="text-[10px] text-slate-500 uppercase font-bold block">Paid Leaves</span>
                            <span class="text-sm font-bold text-slate-900 mt-1 block">${s.paid_leaves}</span>
                        </div>
                        <div class="p-2.5 rounded bg-blue-50/60 border border-blue-200">
                            <span class="text-[10px] text-colgate uppercase font-bold block">Effective Days</span>
                            <span class="text-sm font-black text-colgate mt-1 block">${s.effective_days} Days</span>
                        </div>
                    </div>
                </div>

                <div class="py-6 border-b-2 border-slate-900 text-xs">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Earnings & Deductions Summary</h3>
                    <table class="w-full">
                        <tbody class="divide-y divide-slate-100">
                            <tr>
                                <td class="py-2.5 text-slate-600">Daily Wage Rate</td>
                                <td class="py-2.5 text-right font-medium">${formatINR(s.daily_wage)} / day</td>
                            </tr>
                            <tr>
                                <td class="py-2.5 text-slate-600">Effective Days Worked (${s.effective_days} Days × ${formatINR(s.daily_wage)})</td>
                                <td class="py-2.5 text-right font-bold text-slate-900">${formatINR(s.gross_earnings)}</td>
                            </tr>
                            <tr>
                                <td class="py-2.5 text-rose-600 font-semibold">Less: Advance Recovered from Khata Ledger</td>
                                <td class="py-2.5 text-right font-bold text-rose-600">-${formatINR(s.advances_deducted)}</td>
                            </tr>
                            ${s.bonus_incentive > 0 ? `
                                <tr>
                                    <td class="py-2.5 text-emerald-600 font-semibold">Add: Festival Bonus / Overtime Incentive</td>
                                    <td class="py-2.5 text-right font-bold text-emerald-600">+${formatINR(s.bonus_incentive)}</td>
                                </tr>
                            ` : ''}
                            <tr class="bg-slate-900 text-white font-extrabold text-sm">
                                <td class="py-3.5 px-3 uppercase tracking-wider">Net Amount Payable to Staff</td>
                                <td class="py-3.5 px-3 text-right text-base text-emerald-400 font-black">${formatINR(s.net_payout)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="pt-12 pb-4 grid grid-cols-2 gap-8 text-center text-xs">
                    <div>
                        <div class="border-t border-slate-400 w-48 mx-auto pt-2 font-bold text-slate-800">
                            Worker Signature / Thumb
                        </div>
                        <span class="text-[10px] text-slate-400">Received full payment as calculated</span>
                    </div>
                    <div>
                        <div class="border-t border-slate-400 w-48 mx-auto pt-2 font-bold text-slate-800">
                            For Anupama Agencies
                        </div>
                        <span class="text-[10px] text-slate-400">Authorized Godown Manager</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------------------
// 14.5. VIEW: STOCK BATCH & EXPIRY QR TRACKING (FEFO)
// -------------------------------------------------------------------

const FMCG_CATALOG = {
    'Everest Spices': [
        'Everest Garam Masala 100g',
        'Everest Kashmiri Mirch Powder 100g',
        'Everest Kitchen King Masala 100g',
        'Everest Chhole Masala 100g',
        'Everest Pav Bhaji Masala 100g',
        'Everest Chaat Masala 100g',
        'Everest Chicken Masala 100g',
        'Everest Turmeric Powder 200g',
        'Everest Coriander Powder 200g',
        'Everest Cumin Seeds (Jeera) 100g',
        'Everest Sambhar Masala 100g',
        'Everest Meat Masala 100g'
    ],
    'Colgate-Palmolive': [
        'Colgate MaxFresh Blue Gel 150g',
        'Colgate MaxFresh Red Peppermint 150g',
        'Colgate Strong Teeth Dental Cream 200g',
        'Colgate Strong Teeth Dental Cream 100g',
        'Colgate Vedshakti Ayurvedic Herbal 100g',
        'Colgate Total Active Health 120g',
        'Colgate ZigZag Charcoal Toothbrush (Pack of 6)',
        'Colgate Super Flexi Toothbrush (Medium)',
        'Palmolive Aroma Sensations Body Wash 250ml',
        'Palmolive Naturals Liquid Hand Wash 250ml'
    ]
};

function getBatchExpiryInfo(expDateStr) {
    if (!expDateStr) {
        return {
            daysRemaining: 0,
            status: 'unknown',
            label: 'Unknown',
            shortLabel: 'Unknown',
            color: 'slate',
            textColor: 'text-slate-400',
            badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
        };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expDateStr);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
        return {
            daysRemaining,
            status: 'expired',
            label: 'Expired - Do Not Dispatch',
            shortLabel: 'Expired (Blocked)',
            color: 'rose',
            accentBg: 'bg-rose-500/15',
            accentBorder: 'border-rose-500/40',
            textColor: 'text-rose-400',
            badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        };
    } else if (daysRemaining <= 60) {
        return {
            daysRemaining,
            status: 'near_expiry',
            label: 'Near Expiry - FEFO Priority',
            shortLabel: 'Near Expiry (FEFO)',
            color: 'amber',
            accentBg: 'bg-amber-500/15',
            accentBorder: 'border-amber-500/40',
            textColor: 'text-amber-400',
            badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        };
    } else {
        return {
            daysRemaining,
            status: 'safe',
            label: 'Safe to Dispatch',
            shortLabel: 'Safe to Dispatch',
            color: 'emerald',
            accentBg: 'bg-emerald-500/15',
            accentBorder: 'border-emerald-500/40',
            textColor: 'text-emerald-400',
            badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
    }
}

function calculateShelfLifePct(mfgDateStr, expDateStr) {
    if (!mfgDateStr || !expDateStr) return { pct: 100, totalDays: 0, daysRemaining: 0 };
    const mfg = new Date(mfgDateStr).getTime();
    const exp = new Date(expDateStr).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDuration = exp - mfg;
    if (totalDuration <= 0) return { pct: 0, totalDays: 0, daysRemaining: 0 };

    const remaining = exp - today.getTime();
    if (remaining <= 0) {
        return {
            pct: 0,
            totalDays: Math.max(1, Math.round(totalDuration / (1000 * 60 * 60 * 24))),
            daysRemaining: Math.round(remaining / (1000 * 60 * 60 * 24))
        };
    }

    const pct = Math.max(0, Math.min(100, Math.round((remaining / totalDuration) * 100)));
    return {
        pct,
        totalDays: Math.round(totalDuration / (1000 * 60 * 60 * 24)),
        daysRemaining: Math.round(remaining / (1000 * 60 * 60 * 24))
    };
}

function renderQRCodeElement(targetContainer, textPayload, size = 150) {
    let container = targetContainer;
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;
    container.innerHTML = '';

    const payloadStr = typeof textPayload === 'object' ? JSON.stringify(textPayload) : String(textPayload);

    // 1. If QRCode.toCanvas or QRCode.toDataURL is available (npm qrcode library)
    if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        canvas.className = "mx-auto block";
        container.appendChild(canvas);
        QRCode.toCanvas(canvas, payloadStr, { width: size, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, function(err) {
            if (err) console.warn("QRCode.toCanvas fallback:", err);
        });
        return;
    }

    if (typeof QRCode !== 'undefined' && typeof QRCode.toDataURL === 'function') {
        const img = document.createElement('img');
        img.alt = "Crate QR Code";
        img.width = size;
        img.height = size;
        img.style.width = size + 'px';
        img.style.height = size + 'px';
        img.style.display = 'block';
        img.style.imageRendering = 'pixelated';
        img.className = "mx-auto object-contain";
        container.appendChild(img);
        QRCode.toDataURL(payloadStr, { width: size, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, function(err, url) {
            if (!err && url) img.src = url;
        });
        return;
    }

    // 2. If new QRCode(...) constructor is available (davidshimjs qrcodejs)
    if (typeof QRCode === 'function') {
        try {
            const tempDiv = document.createElement('div');
            new QRCode(tempDiv, {
                text: payloadStr,
                width: size,
                height: size,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: (typeof QRCode.CorrectLevel !== 'undefined') ? QRCode.CorrectLevel.M : 0
            });

            // Extract canvas or data URL image
            let dataUrl = '';
            const canvas = tempDiv.querySelector('canvas');
            if (canvas) {
                try {
                    dataUrl = canvas.toDataURL('image/png');
                } catch (ce) {}
            }
            if (!dataUrl) {
                const innerImg = tempDiv.querySelector('img');
                if (innerImg && innerImg.src && innerImg.src.startsWith('data:')) {
                    dataUrl = innerImg.src;
                }
            }

            if (dataUrl) {
                const img = document.createElement('img');
                img.src = dataUrl;
                img.alt = "Crate QR Code";
                img.width = size;
                img.height = size;
                img.style.width = size + 'px';
                img.style.height = size + 'px';
                img.style.display = 'block';
                img.style.imageRendering = 'pixelated';
                img.className = "mx-auto object-contain";
                container.appendChild(img);
                return;
            } else {
                while (tempDiv.firstChild) {
                    const child = tempDiv.firstChild;
                    if (child.style) child.style.display = 'block';
                    container.appendChild(child);
                }
                return;
            }
        } catch (e) {
            console.warn('QRCode.js execution fallback:', e);
        }
    }

    // 3. Guaranteed High-Reliability Fallback (Image Service)
    const encoded = encodeURIComponent(payloadStr);
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
    img.alt = "Crate QR Code";
    img.width = size;
    img.height = size;
    img.style.width = size + 'px';
    img.style.height = size + 'px';
    img.style.display = 'block';
    img.style.imageRendering = 'pixelated';
    img.className = "mx-auto object-contain";
    container.appendChild(img);
}

function onStockBrandChange() {
    const brandSelect = document.getElementById('stock-inward-brand');
    const prodInput = document.getElementById('stock-inward-product');
    const datalist = document.getElementById('stock-product-datalist');
    const batchInput = document.getElementById('stock-inward-batch');

    if (!brandSelect) return;
    const brand = brandSelect.value;
    const prods = FMCG_CATALOG[brand] || [];

    if (datalist) {
        datalist.innerHTML = prods.map(p => `<option value="${p}">${p}</option>`).join('');
    }
    if (prodInput && prods.length > 0 && (!prodInput.value || !prods.includes(prodInput.value))) {
        prodInput.value = prods[0];
    }
    if (batchInput) {
        batchInput.value = generateRandomBatchNo(brand);
    }
}

function generateRandomBatchNo(brand) {
    const prefix = (brand && brand.includes('Colgate')) ? 'CP' : 'EV';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randCode = chars.charAt(Math.floor(Math.random() * chars.length)) + Math.floor(10 + Math.random() * 89);
    return `${prefix}-${yy}${mm}-${randCode}`;
}

function applyExpiryPreset(months) {
    const mfgInput = document.getElementById('stock-inward-mfg');
    const expInput = document.getElementById('stock-inward-exp');
    if (!expInput) return;

    const baseDate = (mfgInput && mfgInput.value) ? new Date(mfgInput.value) : new Date();
    const target = new Date(baseDate);
    target.setMonth(target.getMonth() + months);
    expInput.value = target.toISOString().split('T')[0];
}

function handleSaveStockBatch(event) {
    if (event) event.preventDefault();

    const brand = document.getElementById('stock-inward-brand').value;
    const product = document.getElementById('stock-inward-product').value.trim();
    const batch = document.getElementById('stock-inward-batch').value.trim();
    const mfg = document.getElementById('stock-inward-mfg').value;
    const exp = document.getElementById('stock-inward-exp').value;
    const qty = Number(document.getElementById('stock-inward-qty').value) || 1;
    const notes = document.getElementById('stock-inward-notes').value.trim();

    if (!product || !batch || !mfg || !exp) {
        showToast("Please fill in all required batch fields (Product, Batch, MFG, EXP).", "error");
        return;
    }

    if (new Date(exp) <= new Date(mfg)) {
        showToast("Expiry date must be strictly after the manufacturing date.", "error");
        return;
    }

    const newId = (APP_DATA.stock_batches && APP_DATA.stock_batches.length > 0)
        ? Math.max(...APP_DATA.stock_batches.map(b => b.id || 0)) + 1
        : 1;

    const newBatch = {
        id: newId,
        brand,
        product,
        batch,
        mfg,
        exp,
        qty,
        notes: notes || "Depot Bay Stored"
    };

    if (!APP_DATA.stock_batches) APP_DATA.stock_batches = [];
    APP_DATA.stock_batches.unshift(newBatch);
    StorageManager.save(APP_DATA);

    // Update live generated QR display
    renderLiveBatchPreviewCard(newBatch);

    // Refresh directory table
    renderStockDirectoryTable();

    // Reset batch no for next entry
    document.getElementById('stock-inward-batch').value = generateRandomBatchNo(brand);

    showToast(`Batch '${batch}' (${product}) successfully inwarded & QR generated!`, "success");
}

function setStockQrPreviewMode(mode) {
    stockQrPreviewMode = mode;
    const warehouseEl = document.getElementById('preview-mode-warehouse');
    const devEl = document.getElementById('preview-mode-developer');
    const btnWarehouse = document.getElementById('btn-mode-warehouse');
    const btnDev = document.getElementById('btn-mode-developer');

    if (mode === 'warehouse') {
        if (warehouseEl) {
            warehouseEl.classList.remove('hidden');
            warehouseEl.classList.add('block');
        }
        if (devEl) {
            devEl.classList.remove('block');
            devEl.classList.add('hidden');
        }
        if (btnWarehouse) {
            btnWarehouse.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md";
        }
        if (btnDev) {
            btnDev.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
        }
    } else {
        if (warehouseEl) {
            warehouseEl.classList.remove('block');
            warehouseEl.classList.add('hidden');
        }
        if (devEl) {
            devEl.classList.remove('hidden');
            devEl.classList.add('block');
        }
        if (btnWarehouse) {
            btnWarehouse.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
        }
        if (btnDev) {
            btnDev.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md";
        }
    }
    lucide.createIcons();
}

function copyBatchJsonPayload(encodedPayload) {
    try {
        const text = decodeURIComponent(encodedPayload);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast("1-Click Copy: JSON payload copied to clipboard!", "success");
            }).catch(() => {
                fallbackCopyPayload(text);
            });
        } else {
            fallbackCopyPayload(text);
        }
    } catch (e) {
        showToast("Failed to copy JSON payload", "error");
    }
}

function fallbackCopyPayload(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showToast("1-Click Copy: JSON payload copied to clipboard!", "success");
    } catch (err) {
        showToast("Please select and copy the JSON text manually.", "info");
    }
    document.body.removeChild(ta);
}

function renderLiveBatchPreviewCard(batch) {
    const container = document.getElementById('stock-live-qr-preview-container');
    if (!container) return;

    const expInfo = getBatchExpiryInfo(batch.exp);
    const shelfLife = calculateShelfLifePct(batch.mfg, batch.exp);
    const payload = {
        id: batch.id,
        brand: batch.brand,
        product: batch.product,
        batch: batch.batch,
        mfg: batch.mfg,
        exp: batch.exp,
        qty: batch.qty
    };
    const jsonString = JSON.stringify(payload, null, 2);
    const jsonByteSize = new Blob([jsonString]).size;

    let plainEnglishStatus = '';
    let shelfLifeBarGradient = 'from-emerald-500 to-teal-400';
    let shelfLifeTextColor = 'text-emerald-400';

    if (expInfo.status === 'safe') {
        plainEnglishStatus = `${expInfo.daysRemaining} Days Remaining • Safe for Dispatch`;
        shelfLifeBarGradient = 'from-emerald-500 to-teal-400';
        shelfLifeTextColor = 'text-emerald-400';
    } else if (expInfo.status === 'near_expiry') {
        plainEnglishStatus = `${expInfo.daysRemaining} Days Remaining • Near Expiry (FEFO Priority)`;
        shelfLifeBarGradient = 'from-amber-500 to-orange-400';
        shelfLifeTextColor = 'text-amber-400';
    } else {
        plainEnglishStatus = `Expired ${Math.abs(expInfo.daysRemaining)} Days Ago • Do Not Dispatch`;
        shelfLifeBarGradient = 'from-rose-600 to-red-500';
        shelfLifeTextColor = 'text-rose-400';
    }

    container.innerHTML = `
        <div class="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                        <i data-lucide="qr-code" class="w-4 h-4"></i>
                    </span>
                    <div>
                        <h4 class="text-sm font-bold text-white">Generated Crate QR Code</h4>
                        <p class="text-[11px] text-slate-400">Ready for label printing & camera check</p>
                    </div>
                </div>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${expInfo.badgeClass}">
                    ${expInfo.label}
                </span>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                <div class="p-3 bg-white rounded-xl shadow-lg flex-shrink-0 flex items-center justify-center">
                    <div id="live-preview-qr-mount"></div>
                </div>
                <div class="space-y-1.5 text-xs text-slate-300 w-full min-w-0">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Brand:</span>
                        <strong class="text-white">${batch.brand}</strong>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Product:</span>
                        <strong class="text-white truncate max-w-[180px]">${batch.product}</strong>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Batch No:</span>
                        <strong class="text-cyan-300 font-mono">${batch.batch}</strong>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Crate Qty:</span>
                        <strong class="text-white">${batch.qty} Crates</strong>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">MFG / EXP:</span>
                        <strong class="text-slate-300">${formatDateDisplay(batch.mfg)} / ${formatDateDisplay(batch.exp)}</strong>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Days to Expiry:</span>
                        <strong class="${expInfo.textColor}">${expInfo.daysRemaining} Days</strong>
                    </div>
                </div>
            </div>

            <!-- Segmented Mode Switcher & Content (Warehouse View vs Developer View) -->
            <div class="space-y-3 pt-1">
                <!-- Segmented Mode Switcher Pill Bar -->
                <div class="p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-1">
                    <button type="button" id="btn-mode-warehouse" onclick="setStockQrPreviewMode('warehouse')" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${stockQrPreviewMode === 'warehouse' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                        <i data-lucide="boxes" class="w-3.5 h-3.5"></i>
                        <span>Warehouse View</span>
                    </button>
                    <button type="button" id="btn-mode-developer" onclick="setStockQrPreviewMode('developer')" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${stockQrPreviewMode === 'developer' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                        <i data-lucide="code-2" class="w-3.5 h-3.5"></i>
                        <span>Developer View</span>
                    </button>
                </div>

                <!-- Mode 1: Warehouse View (Default) -->
                <div id="preview-mode-warehouse" class="${stockQrPreviewMode === 'warehouse' ? 'block' : 'hidden'} space-y-3 animate-in fade-in duration-200">
                    <!-- Visual Shelf-Life Bar Card -->
                    <div class="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-slate-300 font-bold flex items-center gap-1.5">
                                <i data-lucide="shield-check" class="w-3.5 h-3.5 ${expInfo.status === 'safe' ? 'text-emerald-400' : expInfo.status === 'near_expiry' ? 'text-amber-400' : 'text-rose-400'}"></i>
                                <span>Crate Status & Shelf-Life</span>
                            </span>
                            <span class="font-mono font-black ${shelfLifeTextColor}">
                                ${shelfLife.pct}% Remaining
                            </span>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="w-full h-2.5 rounded-full bg-white/[0.08] overflow-hidden p-0.5 border border-white/5">
                            <div class="h-full rounded-full bg-gradient-to-r ${shelfLifeBarGradient} transition-all duration-500 shadow-sm" style="width: ${Math.max(3, Math.min(100, shelfLife.pct))}%"></div>
                        </div>

                        <!-- Plain-English Status Text -->
                        <div class="flex items-center justify-between text-[11px] font-medium pt-0.5">
                            <span class="${shelfLifeTextColor} font-bold">${plainEnglishStatus}</span>
                            <span class="text-[10px] text-slate-500 font-mono">FEFO Check</span>
                        </div>
                    </div>

                    <!-- 2x2 Clean Metric Tiles -->
                    <div class="grid grid-cols-2 gap-2.5 text-xs">
                        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                            <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Batch Code</span>
                            <strong class="text-xs sm:text-sm font-mono font-black text-cyan-300 mt-1 block truncate">${batch.batch}</strong>
                        </div>
                        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                            <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Quantity</span>
                            <strong class="text-xs sm:text-sm font-black text-white mt-1 block">${batch.qty} Crates</strong>
                        </div>
                        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                            <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">MFG Date</span>
                            <strong class="text-xs sm:text-sm font-bold text-slate-200 mt-1 block">${formatDateDisplay(batch.mfg)}</strong>
                        </div>
                        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                            <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">EXP Date</span>
                            <strong class="text-xs sm:text-sm font-bold text-slate-100 mt-1 block underline decoration-amber-400/50">${formatDateDisplay(batch.exp)}</strong>
                        </div>
                    </div>
                </div>

                <!-- Mode 2: Developer View -->
                <div id="preview-mode-developer" class="${stockQrPreviewMode === 'developer' ? 'block' : 'hidden'} space-y-2 animate-in fade-in duration-200">
                    <div class="bg-black/50 rounded-xl border border-white/[0.08] p-3 space-y-2">
                        <div class="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                            <div class="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                <i data-lucide="file-json" class="w-3.5 h-3.5 text-violet-400"></i>
                                <span>Payload: <strong>${jsonByteSize} Bytes</strong></span>
                            </div>
                            <button type="button" onclick="copyBatchJsonPayload('${encodeURIComponent(jsonString)}')" class="px-2.5 py-1 rounded-lg bg-violet-600/25 hover:bg-violet-600/40 border border-violet-500/40 text-violet-200 hover:text-white text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm">
                                <i data-lucide="copy" class="w-3 h-3"></i>
                                <span>1-Click Copy JSON</span>
                            </button>
                        </div>
                        <pre class="text-[11px] text-cyan-300 font-mono overflow-x-auto p-2.5 rounded-lg bg-black/70 max-h-48 leading-relaxed scrollbar-thin select-all border border-white/5">${jsonString}</pre>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
                <button onclick="printBatchLabel(${batch.id})" class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 transition-all">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    <span>1-Click Print Crate Label</span>
                </button>
            </div>
        </div>
    `;

    renderQRCodeElement('live-preview-qr-mount', payload, 140);
    lucide.createIcons();
}

function deleteStockBatch(batchId) {
    const batch = (APP_DATA.stock_batches || []).find(b => b.id === batchId);
    if (!batch) return;

    if (confirm(`Are you sure you want to delete batch ${batch.batch} (${batch.product}) from active stock?`)) {
        APP_DATA.stock_batches = APP_DATA.stock_batches.filter(b => b.id !== batchId);
        StorageManager.save(APP_DATA);
        renderStockQRView();
        showToast(`Batch ${batch.batch} removed from inventory.`, "info");
    }
}

function dispatchBatchCrates(batchId) {
    const batch = (APP_DATA.stock_batches || []).find(b => b.id === batchId);
    if (!batch) return;

    const input = prompt(`Enter number of crates to dispatch from Batch ${batch.batch} (Available: ${batch.qty} Crates):`, String(Math.min(batch.qty, 10)));
    if (input === null) return;

    const qtyToDispatch = Number(input);
    if (isNaN(qtyToDispatch) || qtyToDispatch <= 0) {
        showToast("Please enter a valid crate count.", "error");
        return;
    }
    if (qtyToDispatch > batch.qty) {
        showToast(`Cannot dispatch ${qtyToDispatch} crates. Only ${batch.qty} crates available in this batch.`, "error");
        return;
    }

    batch.qty -= qtyToDispatch;

    // Link and update today's active beat dispatch if present
    const todayStr = new Date().toISOString().split('T')[0];
    if (APP_DATA.dispatch_beats && APP_DATA.dispatch_beats.length > 0) {
        const activeBeat = APP_DATA.dispatch_beats.find(b => b.dispatch_date === todayStr && b.status === 'Dispatched') || APP_DATA.dispatch_beats[0];
        if (activeBeat) {
            if (batch.brand && batch.brand.includes('Everest')) {
                activeBeat.crates_everest = (Number(activeBeat.crates_everest) || 0) + qtyToDispatch;
            } else {
                activeBeat.cartons_colgate = (Number(activeBeat.cartons_colgate) || 0) + qtyToDispatch;
            }
        }
    }

    StorageManager.save(APP_DATA);

    showToast(`Dispatched ${qtyToDispatch} crates of '${batch.product}'. Remaining: ${batch.qty} crates.`, "success");

    if (lastScannedBatch && lastScannedBatch.id === batchId) {
        lastScannedBatch.qty = batch.qty;
        renderScanResultCard(lastScannedBatch);
    }

    renderStockDirectoryTable();
    if (typeof currentView !== 'undefined' && currentView === 'dispatch' && typeof renderDispatchesView === 'function') {
        renderDispatchesView();
    }
}

function moveBatchToDamagedReturns(batchId) {
    const batch = (APP_DATA.stock_batches || []).find(b => b.id === batchId);
    if (!batch) return;

    if (!confirm(`Move ${batch.qty} crates of batch '${batch.batch}' (${batch.product}) directly into Damaged & Expiry Register for credit note claim?`)) {
        return;
    }

    closeModal('scanned-crate-modal');

    const todayStr = new Date().toISOString().split('T')[0];
    const newId = (APP_DATA.damaged_returns && APP_DATA.damaged_returns.length > 0)
        ? Math.max(...APP_DATA.damaged_returns.map(r => r.id || 0)) + 1
        : 1;

    if (!APP_DATA.damaged_returns) APP_DATA.damaged_returns = [];
    APP_DATA.damaged_returns.push({
        id: newId,
        return_date: todayStr,
        brand: batch.brand,
        product_name: batch.product,
        retailer_name: "Godown Expiry Check (FEFO QR)",
        batch_no: batch.batch,
        expiry_date: batch.exp,
        quantity: batch.qty,
        unit: "Crates",
        reason: "Expired Stock",
        claim_status: "Pending Inspection",
        credit_note_amount: 0,
        credit_note_number: "",
        notes: `Auto-logged from Stock QR Expiry Scanner. MFG: ${batch.mfg}, EXP: ${batch.exp}.`
    });

    // Remove from active batches
    APP_DATA.stock_batches = APP_DATA.stock_batches.filter(b => b.id !== batchId);
    StorageManager.save(APP_DATA);

    showToast(`Batch ${batch.batch} moved to Damaged & Expiry Register!`, "success");

    const scanContainer = document.getElementById('scan-result-container');
    if (scanContainer) scanContainer.innerHTML = '';
    const modalContent = document.getElementById('scanned-crate-modal-content');
    if (modalContent) modalContent.innerHTML = '';

    renderStockQRView();
    if (typeof currentView !== 'undefined' && currentView === 'damaged-returns' && typeof renderDamagedReturnsView === 'function') {
        renderDamagedReturnsView();
    }
}

function printBatchLabel(batchId) {
    const batch = (APP_DATA.stock_batches || []).find(b => b.id === batchId);
    if (!batch) {
        showToast("Batch not found for printing.", "error");
        return;
    }

    const expInfo = getBatchExpiryInfo(batch.exp);
    const payload = {
        id: batch.id,
        brand: batch.brand,
        product: batch.product,
        batch: batch.batch,
        mfg: batch.mfg,
        exp: batch.exp,
        qty: batch.qty
    };

    const buildLabelHtml = (qrMountId) => `
        <div class="crate-print-card p-6 bg-white text-black border-4 border-black rounded-2xl max-w-sm w-full mx-auto font-sans shadow-2xl relative">
            <div class="text-center border-b-2 border-black pb-2 mb-3">
                <div class="text-[10px] font-black tracking-widest uppercase text-slate-700">ANUPAMA AGENCIES FMCG WAREHOUSE</div>
                <div class="text-lg font-black text-black uppercase tracking-tight mt-0.5">${batch.brand}</div>
                <div class="text-xs font-bold text-slate-800">${batch.product}</div>
            </div>
            
            <div class="flex flex-col items-center justify-center my-3 bg-white p-3 border-2 border-black rounded-xl text-center">
                <!-- 150x150px Crisp QR Code Mount -->
                <div id="${qrMountId}" class="w-[150px] h-[150px] min-w-[150px] min-h-[150px] bg-white flex items-center justify-center mx-auto overflow-hidden"></div>
                <div class="inline-block mt-2.5 px-3 py-1 bg-black text-white rounded-md text-[11px] font-mono font-black tracking-wider">
                    BATCH: ${batch.batch}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs border-t-2 border-black pt-2 font-mono">
                <div>
                    <span class="text-[9px] text-slate-600 font-sans uppercase font-bold">Batch Number:</span><br>
                    <strong class="text-sm font-black text-black">${batch.batch}</strong>
                </div>
                <div>
                    <span class="text-[9px] text-slate-600 font-sans uppercase font-bold">Crates / Cartons:</span><br>
                    <strong class="text-sm font-black text-black">${batch.qty} Crates</strong>
                </div>
                <div>
                    <span class="text-[9px] text-slate-600 font-sans uppercase font-bold">Mfg Date:</span><br>
                    <strong class="font-bold text-black">${formatDateDisplay(batch.mfg)}</strong>
                </div>
                <div>
                    <span class="text-[9px] text-slate-600 font-sans uppercase font-bold">Expiry Date:</span><br>
                    <strong class="font-bold text-black underline">${formatDateDisplay(batch.exp)}</strong>
                </div>
            </div>

            <div class="mt-3 pt-2 border-t-2 border-dashed border-black text-center">
                <div class="inline-block px-3 py-1 text-xs font-black uppercase rounded ${expInfo.status === 'expired' ? 'bg-black text-white' : expInfo.status === 'near_expiry' ? 'border-2 border-black text-black font-black' : 'bg-slate-200 text-black'}">
                    ${expInfo.status === 'expired' ? '⛔ EXPIRED - DO NOT DISPATCH' : expInfo.status === 'near_expiry' ? '⚡ FEFO PRIORITY DISPATCH' : '✅ SAFE TO DISPATCH'}
                </div>
                <div class="text-[9px] text-slate-600 mt-1 font-mono">Days Left: ${expInfo.daysRemaining} • Official Consignee Crate Tag</div>
            </div>
        </div>
    `;

    const modalContent = document.getElementById('stock-label-modal-content');
    const printArea = document.getElementById('stock-label-print-area');

    if (modalContent) modalContent.innerHTML = buildLabelHtml('modal-crate-qr-mount');
    if (printArea) printArea.innerHTML = buildLabelHtml('print-crate-qr-mount');

    openModal('stock-label-modal');

    // Render 150x150px crisp QR code into both containers with distinct IDs
    renderQRCodeElement('modal-crate-qr-mount', payload, 150);
    renderQRCodeElement('print-crate-qr-mount', payload, 150);
}

function triggerCrateLabelPrint() {
    window.print();
}

function startCameraScanner() {
    const reader = document.getElementById('qr-reader');
    if (!reader) return;

    if (typeof Html5Qrcode === 'undefined') {
        showToast("HTML5-QRCode scanner engine is still loading. Please check connection.", "error");
        return;
    }

    if (isScannerRunning) {
        stopCameraScanner();
        return;
    }

    try {
        if (!html5QrScannerInstance) {
            html5QrScannerInstance = new Html5Qrcode("qr-reader");
        }

        const config = {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
        };

        reader.innerHTML = `
            <div class="p-6 text-center text-xs text-slate-300 animate-pulse flex flex-col items-center gap-2">
                <i data-lucide="camera" class="w-8 h-8 text-cyan-400"></i>
                <span>Initializing camera & requesting permission...</span>
            </div>
        `;
        lucide.createIcons();

        html5QrScannerInstance.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                handleScannedQRCode(decodedText);
            },
            () => {
                // Ignore per-frame non-match
            }
        ).then(() => {
            isScannerRunning = true;
            updateScannerUI(true);
            showToast("Camera scanner active! Point camera at batch QR label.", "info");
        }).catch(err => {
            console.error("Camera startup error:", err);
            isScannerRunning = false;
            updateScannerUI(false);
            reader.innerHTML = `
                <div class="p-6 text-center text-xs space-y-2">
                    <span class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                        <i data-lucide="video-off" class="w-5 h-5"></i>
                    </span>
                    <p class="font-bold text-white">Camera Permission Denied or Unavailable</p>
                    <p class="text-slate-400 text-[11px]">Allow browser camera permission or use the photo upload / manual batch search options below.</p>
                </div>
            `;
            lucide.createIcons();
            showToast("Camera access denied or camera not found.", "error");
        });
    } catch (err) {
        console.error("Scanner exception:", err);
        showToast("Could not start scanner: " + err.message, "error");
    }
}

function stopCameraScanner() {
    if (html5QrScannerInstance && isScannerRunning) {
        html5QrScannerInstance.stop().then(() => {
            isScannerRunning = false;
            updateScannerUI(false);
            const reader = document.getElementById('qr-reader');
            if (reader) {
                reader.innerHTML = `
                    <div class="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-500">
                            <i data-lucide="camera" class="w-6 h-6"></i>
                        </div>
                        <p class="font-medium text-slate-300">Camera is paused</p>
                        <p class="text-[11px] text-slate-500">Click 'Start Camera Scanner' to scan batch crates with phone or webcam</p>
                    </div>
                `;
                lucide.createIcons();
            }
        }).catch(e => {
            console.warn("Error stopping camera:", e);
            isScannerRunning = false;
            updateScannerUI(false);
        });
    }
}

function updateScannerUI(isRunning) {
    const btn = document.getElementById('btn-toggle-camera');
    if (!btn) return;
    if (isRunning) {
        btn.innerHTML = `<i data-lucide="video-off" class="w-4 h-4"></i><span>Stop Camera</span>`;
        btn.className = "px-4 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] flex items-center gap-2";
    } else {
        btn.innerHTML = `<i data-lucide="camera" class="w-4 h-4"></i><span>Start Camera Scanner</span>`;
        btn.className = "px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2";
    }
    lucide.createIcons();
}

function scanQrFromImageFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (typeof Html5Qrcode === 'undefined') {
        showToast("HTML5-QRCode engine not ready", "error");
        return;
    }

    const tempScanner = new Html5Qrcode("qr-reader-temp");
    tempScanner.scanFile(file, true)
        .then(decodedText => {
            handleScannedQRCode(decodedText);
            showToast("QR code recognized from image!", "success");
            tempScanner.clear();
        })
        .catch(err => {
            console.error("Image scan error:", err);
            showToast("Could not recognize QR code in image. Please ensure photo is clear.", "error");
            tempScanner.clear();
        });
}

function handleManualBatchSearch(batchNo) {
    const val = (batchNo || (document.getElementById('manual-batch-search-input') && document.getElementById('manual-batch-search-input').value) || '').trim();
    if (!val) {
        showToast("Please enter or select a batch number to search.", "error");
        return;
    }
    const match = (APP_DATA.stock_batches || []).find(b => b.batch && b.batch.toLowerCase() === val.toLowerCase());
    if (match) {
        handleScannedQRCode(JSON.stringify(match));
    } else {
        showToast(`Batch '${val}' not found in active stock.`, "error");
    }
}

function playScanBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        // AudioContext not allowed or unsupported
    }
}

function handleScanNextCrate() {
    closeModal('scanned-crate-modal');
    isScanPaused = false;
    if (typeof currentView !== 'undefined' && currentView !== 'stock-qr' && typeof switchView === 'function') {
        switchView('stock-qr');
    }
    stockQrActiveTab = 'scanner';
    renderStockQRView();

    setTimeout(() => {
        const reader = document.getElementById('qr-reader');
        if (reader) reader.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof html5QrScannerInstance !== 'undefined' && html5QrScannerInstance && isScannerRunning) {
            try {
                html5QrScannerInstance.resume();
            } catch (e) {
                startCameraScanner();
            }
        } else {
            startCameraScanner();
        }
        showToast("Ready for next crate! Point camera at QR code.", "info");
    }, 150);
}

function handleScannedQRCode(decodedText) {
    if (!decodedText) return;
    if (isScanPaused) return;

    playScanBeep();

    let batchObj = null;
    let parsedPayload = null;

    try {
        parsedPayload = JSON.parse(decodedText);
    } catch (e) {
        parsedPayload = null;
    }

    if (parsedPayload && typeof parsedPayload === 'object') {
        const match = (APP_DATA.stock_batches || []).find(b =>
            (b.batch && parsedPayload.batch && b.batch.toLowerCase() === parsedPayload.batch.toLowerCase()) ||
            (b.id && parsedPayload.id && b.id === parsedPayload.id)
        );
        if (match) {
            batchObj = match;
        } else {
            batchObj = {
                id: parsedPayload.id || Date.now(),
                brand: parsedPayload.brand || "Everest Spices",
                product: parsedPayload.product || "Scanned FMCG Item",
                batch: parsedPayload.batch || "BATCH-" + Date.now(),
                mfg: parsedPayload.mfg || new Date().toISOString().split('T')[0],
                exp: parsedPayload.exp || new Date().toISOString().split('T')[0],
                qty: Number(parsedPayload.qty) || 1,
                notes: "Scanned from external crate QR code"
            };
        }
    } else {
        const trimmed = decodedText.trim();
        const match = (APP_DATA.stock_batches || []).find(b =>
            b.batch && b.batch.toLowerCase() === trimmed.toLowerCase()
        );
        if (match) {
            batchObj = match;
        } else {
            showToast(`Scanned Code: '${trimmed}' - No matching batch found in active stock.`, "error");
            return;
        }
    }

    lastScannedBatch = batchObj;
    renderScanResultCard(batchObj);
    openModal('scanned-crate-modal');

    isScanPaused = true;
    if (typeof html5QrScannerInstance !== 'undefined' && html5QrScannerInstance && isScannerRunning) {
        try { html5QrScannerInstance.pause(true); } catch(e){}
    }

    showToast(`Scanned: ${batchObj.product} (Batch: ${batchObj.batch})`, "success");
}

function renderScanResultCard(batch) {
    const container = document.getElementById('scan-result-container');
    const modalContent = document.getElementById('scanned-crate-modal-content');
    if (!container && !modalContent) return;

    const expInfo = getBatchExpiryInfo(batch.exp);
    const shelfLife = calculateShelfLifePct(batch.mfg, batch.exp);

    let statusHeader = '';
    let statusBorderClass = '';
    let progressGradient = 'from-emerald-500 to-teal-400';
    let progressTextColor = 'text-emerald-400';

    if (expInfo.status === 'safe') {
        statusBorderClass = 'border-emerald-500/40 bg-emerald-950/20';
        progressGradient = 'from-emerald-500 to-teal-400';
        progressTextColor = 'text-emerald-400';
        statusHeader = `
            <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <div class="flex items-center gap-3">
                    <span class="w-9 h-9 rounded-xl bg-emerald-500/25 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                        <i data-lucide="check-circle-2" class="w-5 h-5"></i>
                    </span>
                    <div>
                        <div class="font-black text-sm text-emerald-100 uppercase tracking-wide">Safe to Dispatch</div>
                        <div class="text-xs text-emerald-300/80">Crate meets quality shelf-life requirements (>60 Days)</div>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/30 border border-emerald-500/50 text-emerald-100 shadow-sm">
                    ${expInfo.daysRemaining} Days Left
                </span>
            </div>
        `;
    } else if (expInfo.status === 'near_expiry') {
        statusBorderClass = 'border-amber-500/50 bg-amber-950/25 shadow-[0_0_25px_rgba(245,158,11,0.18)]';
        progressGradient = 'from-amber-500 to-orange-400';
        progressTextColor = 'text-amber-400';
        statusHeader = `
            <div class="p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-orange-500/15 to-amber-500/10 border border-amber-500/40 text-amber-200 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <div class="flex items-center gap-3">
                    <span class="w-9 h-9 rounded-xl bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300 animate-pulse">
                        <i data-lucide="clock" class="w-5 h-5"></i>
                    </span>
                    <div>
                        <div class="font-black text-sm text-amber-100 uppercase tracking-wide">Near Expiry — FEFO Priority</div>
                        <div class="text-xs text-amber-300/80">Dispatch immediately under First-Expiry-First-Out (1-60 Days)</div>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-black bg-amber-500/30 border border-amber-500/50 text-amber-100 shadow-sm">
                    ${expInfo.daysRemaining} Days Left
                </span>
            </div>
        `;
    } else {
        statusBorderClass = 'border-rose-500/50 bg-rose-950/30 shadow-[0_0_30px_rgba(244,63,94,0.25)]';
        progressGradient = 'from-rose-600 to-red-500';
        progressTextColor = 'text-rose-400';
        statusHeader = `
            <div class="p-4 rounded-2xl bg-gradient-to-r from-rose-500/25 via-red-500/20 to-rose-500/10 border border-rose-500/40 text-rose-200 flex items-center justify-between shadow-[0_0_25px_rgba(244,63,94,0.25)]">
                <div class="flex items-center gap-3">
                    <span class="w-9 h-9 rounded-xl bg-rose-500/30 border border-rose-500/50 flex items-center justify-center text-rose-200 animate-bounce">
                        <i data-lucide="alert-octagon" class="w-5 h-5"></i>
                    </span>
                    <div>
                        <div class="font-black text-sm text-rose-100 uppercase tracking-wide">🚨 Expired Stock — Do Not Dispatch</div>
                        <div class="text-xs text-rose-300/80">Dispatch blocked. Quarantine batch for manufacturer credit claim.</div>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-black bg-rose-500/30 border border-rose-500/50 text-rose-100 shadow-sm">
                    Expired (${Math.abs(expInfo.daysRemaining)}d ago)
                </span>
            </div>
        `;
    }

    const brandStyle = (batch.brand && batch.brand.includes('Everest'))
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

    const cardHtml = `
        <div class="glass-card rounded-2xl p-5 sm:p-6 border ${statusBorderClass} space-y-5 animate-in fade-in duration-300">
            <!-- Header: Brand Badge & Bold Product Name -->
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div class="space-y-1.5">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${brandStyle}">
                            ${batch.brand}
                        </span>
                        <span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/[0.06] border border-white/10 text-cyan-300">
                            #ID: ${batch.id || 'N/A'}
                        </span>
                    </div>
                    <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                        ${batch.product}
                    </h3>
                </div>
                <button onclick="printBatchLabel(${batch.id})" title="Print 1-Click Crate Label" class="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5">
                    <i data-lucide="printer" class="w-3.5 h-3.5 text-cyan-400"></i>
                    <span>Print Label</span>
                </button>
            </div>

            <!-- Color-Coded Status Banner -->
            ${statusHeader}

            <!-- 2x2 Structured Details Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                    <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Batch Number</span>
                    <strong class="text-sm font-mono font-black text-cyan-300 mt-1 block tracking-wide">${batch.batch}</strong>
                </div>
                <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                    <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Available Stock</span>
                    <div class="mt-1 flex items-baseline gap-1">
                        <strong class="text-base font-black text-white">${batch.qty}</strong>
                        <span class="text-xs text-slate-400 font-semibold">Crates / Cartons</span>
                    </div>
                </div>
                <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                    <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Manufacturing Date (MFG)</span>
                    <strong class="text-xs font-bold text-slate-200 mt-1 block">${formatDateDisplay(batch.mfg)}</strong>
                </div>
                <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                    <span class="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Expiry Date (EXP)</span>
                    <strong class="text-xs font-bold text-slate-100 mt-1 block underline decoration-amber-400/50">${formatDateDisplay(batch.exp)}</strong>
                </div>
            </div>

            <!-- Shelf-Life Progress Bar -->
            <div class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-400 font-bold flex items-center gap-1.5">
                        <i data-lucide="hourglass" class="w-3.5 h-3.5 text-cyan-400"></i>
                        Shelf-Life Duration Remaining
                    </span>
                    <span class="font-mono font-black ${progressTextColor}">
                        ${shelfLife.pct}% (${expInfo.daysRemaining <= 0 ? '0' : expInfo.daysRemaining} of ${shelfLife.totalDays} days)
                    </span>
                </div>
                <div class="w-full h-3 rounded-full bg-white/[0.08] overflow-hidden p-0.5 border border-white/5">
                    <div class="h-full rounded-full bg-gradient-to-r ${progressGradient} transition-all duration-500 shadow-sm" style="width: ${Math.max(3, Math.min(100, shelfLife.pct))}%"></div>
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                    <span>MFG: ${batch.mfg}</span>
                    <span class="font-semibold ${expInfo.textColor}">${expInfo.label}</span>
                    <span>EXP: ${batch.exp}</span>
                </div>
            </div>

            <!-- Quick Action Footer Buttons -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                ${expInfo.status !== 'expired' ? `
                    <button onclick="dispatchBatchCrates(${batch.id})" class="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 group">
                        <i data-lucide="truck" class="w-4 h-4 transition-transform group-hover:translate-x-0.5"></i>
                        <span>Dispatch Crates</span>
                    </button>
                ` : `
                    <button disabled class="px-4 py-3 rounded-xl bg-white/[0.04] text-slate-500 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2 border border-white/5">
                        <i data-lucide="slash" class="w-4 h-4 text-rose-500/50"></i>
                        <span>Dispatch Blocked</span>
                    </button>
                `}

                <button onclick="moveBatchToDamagedReturns(${batch.id})" class="px-4 py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <i data-lucide="package-x" class="w-4 h-4"></i>
                    <span>Log as Damaged / Expired</span>
                </button>

                <button onclick="handleScanNextCrate()" class="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <i data-lucide="scan-line" class="w-4 h-4"></i>
                    <span>Scan Next Crate</span>
                </button>
            </div>
        </div>
    `;

    if (container) container.innerHTML = cardHtml;
    if (modalContent) modalContent.innerHTML = cardHtml;
    lucide.createIcons();
}

function renderStockDirectoryTable() {
    const tableContainer = document.getElementById('stock-directory-table-container');
    if (!tableContainer) return;

    let batches = [...(APP_DATA.stock_batches || [])];

    // Sort by FEFO (Earliest expiry date first)
    batches.sort((a, b) => new Date(a.exp).getTime() - new Date(b.exp).getTime());

    // Filter by search query
    if (stockQrSearchQuery) {
        const q = stockQrSearchQuery.toLowerCase();
        batches = batches.filter(b =>
            (b.product && b.product.toLowerCase().includes(q)) ||
            (b.brand && b.brand.toLowerCase().includes(q)) ||
            (b.batch && b.batch.toLowerCase().includes(q))
        );
    }

    // Filter by status tab
    if (stockQrStatusFilter !== 'all') {
        batches = batches.filter(b => getBatchExpiryInfo(b.exp).status === stockQrStatusFilter);
    }

    if (batches.length === 0) {
        tableContainer.innerHTML = `
            <div class="p-12 text-center text-slate-400">
                <i data-lucide="inbox" class="w-10 h-10 mx-auto text-slate-500 mb-2"></i>
                <p class="font-bold text-white">No stock batches found</p>
                <p class="text-xs text-slate-500 mt-1">Adjust your search filter or inward new batch stock using the form above.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    tableContainer.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-white/[0.04] text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                    <tr>
                        <th class="py-3 px-4">QR / Label</th>
                        <th class="py-3 px-4">Product & Brand</th>
                        <th class="py-3 px-4">Batch Number</th>
                        <th class="py-3 px-4">MFG / EXP Date</th>
                        <th class="py-3 px-4">Days to Expiry</th>
                        <th class="py-3 px-4 text-center">In-Stock Crates</th>
                        <th class="py-3 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-white/[0.06]">
                    ${batches.map(b => {
                        const expInfo = getBatchExpiryInfo(b.exp);
                        return `
                            <tr class="hover:bg-white/[0.02] transition-colors group">
                                <td class="py-3 px-4">
                                    <button onclick="printBatchLabel(${b.id})" title="Click to view & print crate label" class="w-9 h-9 rounded-lg bg-white p-1 hover:ring-2 hover:ring-cyan-400 transition-all flex items-center justify-center cursor-pointer shadow-sm">
                                        <div id="table-qr-mini-${b.id}" class="w-full h-full flex items-center justify-center"></div>
                                    </button>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="font-bold text-white">${b.product}</div>
                                    <span class="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold ${b.brand.includes('Everest') ? 'bg-rose-500/15 text-rose-300' : 'bg-blue-500/15 text-blue-300'}">
                                        ${b.brand}
                                    </span>
                                </td>
                                <td class="py-3 px-4 font-mono font-bold text-cyan-300">
                                    ${b.batch}
                                </td>
                                <td class="py-3 px-4 text-slate-400">
                                    <div>MFG: <strong class="text-slate-300">${formatDateDisplay(b.mfg)}</strong></div>
                                    <div class="mt-0.5">EXP: <strong class="text-slate-200 underline">${formatDateDisplay(b.exp)}</strong></div>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${expInfo.badgeClass}">
                                        <span class="w-1.5 h-1.5 rounded-full ${expInfo.color === 'emerald' ? 'bg-emerald-400' : expInfo.color === 'amber' ? 'bg-amber-400' : 'bg-rose-400 animate-ping'}"></span>
                                        ${expInfo.daysRemaining <= 0 ? `Expired (${Math.abs(expInfo.daysRemaining)}d)` : `${expInfo.daysRemaining} Days`}
                                    </span>
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <span class="inline-block px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 font-black text-sm text-white">
                                        ${b.qty} <span class="text-[10px] font-normal text-slate-400">crates</span>
                                    </span>
                                </td>
                                <td class="py-3 px-4 text-right">
                                    <div class="flex items-center justify-end gap-1.5">
                                        <button onclick="printBatchLabel(${b.id})" title="Print Label" class="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors">
                                            <i data-lucide="printer" class="w-3.5 h-3.5 text-cyan-400"></i>
                                        </button>
                                        ${expInfo.status !== 'expired' ? `
                                            <button onclick="dispatchBatchCrates(${b.id})" title="Add to Beat Dispatch" class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                                                <i data-lucide="truck" class="w-3.5 h-3.5"></i>
                                            </button>
                                        ` : `
                                            <button onclick="moveBatchToDamagedReturns(${b.id})" title="Move to Damaged & Expiry" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors">
                                                <i data-lucide="package-x" class="w-3.5 h-3.5"></i>
                                            </button>
                                        `}
                                        <button onclick="deleteStockBatch(${b.id})" title="Delete Batch" class="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Mount thumbnails
    batches.forEach(b => {
        const mount = document.getElementById(`table-qr-mini-${b.id}`);
        if (mount) {
            renderQRCodeElement(mount, { id: b.id, brand: b.brand, product: b.product, batch: b.batch, mfg: b.mfg, exp: b.exp, qty: b.qty }, 32);
        }
    });

    lucide.createIcons();
}

function renderStockQRView() {
    const viewContainer = document.getElementById('view-stock-qr');
    if (!viewContainer) return;

    const batches = APP_DATA.stock_batches || [];
    const expired = batches.filter(b => getBatchExpiryInfo(b.exp).status === 'expired');
    const nearExpiry = batches.filter(b => getBatchExpiryInfo(b.exp).status === 'near_expiry');
    const safe = batches.filter(b => getBatchExpiryInfo(b.exp).status === 'safe');
    const totalCrates = batches.reduce((sum, b) => sum + (Number(b.qty) || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultBatchNo = generateRandomBatchNo('Everest Spices');

    viewContainer.innerHTML = `
        <!-- Header Banner -->
        <div class="glass-card rounded-2xl p-6 text-white relative overflow-hidden card-hover">
            <div class="absolute -top-24 -right-24 w-60 h-60 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-20 -left-20 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
                        <i data-lucide="qr-code" class="w-3.5 h-3.5"></i>
                        <span>First-Expiry-First-Out (FEFO) Warehouse Engine</span>
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-white">Stock Batch & Expiry QR Code Management</h2>
                    <p class="text-slate-400 text-sm mt-1 max-w-2xl">
                        Generate 1-click printable QR crate stickers for <strong class="text-rose-300">Everest Spices</strong> & <strong class="text-blue-300">Colgate-Palmolive</strong>, and scan with smartphone rear camera for instant FEFO dispatch verification.
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2.5">
                    <button onclick="exportStockBatchesCSV()" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold transition-all border border-white/10">
                        <i data-lucide="download" class="w-4 h-4 text-emerald-400"></i>
                        <span>Export Batches CSV</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 4 KPI Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="glass-card rounded-2xl p-4 card-hover">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Active Batches</span>
                    <span class="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                        <i data-lucide="boxes" class="w-4 h-4"></i>
                    </span>
                </div>
                <div class="mt-2 flex items-baseline gap-2">
                    <span class="text-2xl font-black text-white">${batches.length}</span>
                    <span class="text-xs font-semibold text-slate-400">(${totalCrates} Crates)</span>
                </div>
                <div class="mt-2 text-[11px] text-slate-400">Everest Spices & Colgate stock</div>
            </div>

            <div class="glass-card rounded-2xl p-4 card-hover">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Safe to Dispatch</span>
                    <span class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <i data-lucide="shield-check" class="w-4 h-4"></i>
                    </span>
                </div>
                <div class="mt-2 flex items-baseline gap-2">
                    <span class="text-2xl font-black text-emerald-400">${safe.length}</span>
                    <span class="text-xs font-semibold text-slate-400">Batches</span>
                </div>
                <div class="mt-2 text-[11px] text-slate-400">> 60 days remaining shelf-life</div>
            </div>

            <div class="glass-card rounded-2xl p-4 card-hover">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Near Expiry (FEFO)</span>
                    <span class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/20">
                        <i data-lucide="clock" class="w-4 h-4"></i>
                    </span>
                </div>
                <div class="mt-2 flex items-baseline gap-2">
                    <span class="text-2xl font-black text-amber-400">${nearExpiry.length}</span>
                    <span class="text-xs font-semibold text-slate-400">Batches</span>
                </div>
                <div class="mt-2 text-[11px] text-slate-400">1 to 60 days remaining (Priority)</div>
            </div>

            <div class="glass-card rounded-2xl p-4 card-hover">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-rose-400">Expired (Blocked)</span>
                    <span class="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/20">
                        <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                    </span>
                </div>
                <div class="mt-2 flex items-baseline gap-2">
                    <span class="text-2xl font-black text-rose-400">${expired.length}</span>
                    <span class="text-xs font-semibold text-slate-400">Batches</span>
                </div>
                <div class="mt-2 text-[11px] text-rose-400/80">Quarantine for Credit Claim</div>
            </div>
        </div>

        <!-- Navigation Tabs for the 2 Modules -->
        <div class="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] max-w-md">
            <button onclick="stockQrActiveTab = 'inward'; renderStockQRView();" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${stockQrActiveTab === 'inward' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>1. Stock Inward & QR</span>
            </button>
            <button onclick="stockQrActiveTab = 'scanner'; renderStockQRView();" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${stockQrActiveTab === 'scanner' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="camera" class="w-4 h-4"></i>
                <span>2. Live Camera Scanner</span>
            </button>
        </div>

        <!-- Panel 1: Stock Inward & QR Generator -->
        <div id="panel-stock-inward" class="${stockQrActiveTab === 'inward' ? 'block' : 'hidden'} space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Left Column: Inward Form -->
                <div class="lg:col-span-7 glass-card rounded-2xl p-6">
                    <div class="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
                        <div class="flex items-center gap-3">
                            <span class="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.2)]">
                                <i data-lucide="package-plus" class="w-5 h-5"></i>
                            </span>
                            <div>
                                <h3 class="text-base font-bold text-white">Inward New Batch & Generate QR</h3>
                                <p class="text-xs text-slate-400">Log incoming FMCG consignments and generate crate labels</p>
                            </div>
                        </div>
                    </div>

                    <form onsubmit="handleSaveStockBatch(event)" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <!-- Brand Selection -->
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Brand *</label>
                                <select id="stock-inward-brand" onchange="onStockBrandChange()" class="w-full text-xs font-bold py-2.5 px-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
                                    <option value="Everest Spices" class="bg-[#121324] text-white">Everest Spices</option>
                                    <option value="Colgate-Palmolive" class="bg-[#121324] text-white">Colgate-Palmolive</option>
                                </select>
                            </div>

                            <!-- Batch Number -->
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Batch Number *</label>
                                    <button type="button" onclick="document.getElementById('stock-inward-batch').value = generateRandomBatchNo(document.getElementById('stock-inward-brand').value)" class="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold">
                                        Auto-Gen Code
                                    </button>
                                </div>
                                <input type="text" id="stock-inward-batch" value="${defaultBatchNo}" required class="w-full text-xs font-mono font-bold py-2.5 px-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
                            </div>
                        </div>

                        <!-- Product Name -->
                        <div>
                            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Product Name *</label>
                            <input list="stock-product-datalist" type="text" id="stock-inward-product" value="Everest Garam Masala 100g" required placeholder="Type product name or select from catalog" class="w-full text-xs py-2.5 px-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
                            <datalist id="stock-product-datalist">
                                ${FMCG_CATALOG['Everest Spices'].map(p => `<option value="${p}">${p}</option>`).join('')}
                            </datalist>
                        </div>

                        <!-- Dates: MFG & EXP -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Manufacturing Date (MFG) *</label>
                                <input type="date" id="stock-inward-mfg" value="${todayStr}" required class="w-full text-xs py-2.5 px-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Expiry Date (EXP) *</label>
                                    <div class="flex items-center gap-1">
                                        <button type="button" onclick="applyExpiryPreset(6)" class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 font-mono">+6M</button>
                                        <button type="button" onclick="applyExpiryPreset(12)" class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 font-mono">+12M</button>
                                        <button type="button" onclick="applyExpiryPreset(24)" class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 font-mono">+24M</button>
                                    </div>
                                </div>
                                <input type="date" id="stock-inward-exp" required class="w-full text-xs py-2.5 px-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
                            </div>
                        </div>

                        <!-- Quantity and Godown Bay -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Crate / Carton Quantity *</label>
                                <input type="number" id="stock-inward-qty" min="1" value="25" required class="w-full text-xs font-bold py-2.5 px-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Godown Stacking Bay / Notes</label>
                                <input type="text" id="stock-inward-notes" placeholder="e.g. Bay C - Rack 04" class="w-full text-xs py-2.5 px-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <div class="pt-2">
                            <button type="submit" class="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)] flex items-center justify-center gap-2">
                                <i data-lucide="qr-code" class="w-4 h-4"></i>
                                <span>Save Stock Batch & Generate Crate QR</span>
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Right Column: Live QR Preview Card -->
                <div class="lg:col-span-5" id="stock-live-qr-preview-container">
                    ${batches.length > 0 ? '' : `
                        <div class="glass-card rounded-2xl p-6 text-center text-slate-400">
                            <i data-lucide="qr-code" class="w-12 h-12 mx-auto text-slate-500 mb-2"></i>
                            <p class="font-bold text-white text-sm">QR Code Preview Area</p>
                            <p class="text-xs text-slate-500 mt-1">Fill the inward form on the left to generate and print crate QR codes.</p>
                        </div>
                    `}
                </div>
            </div>
        </div>

        <!-- Panel 2: Live Camera QR Scanner (Godown Check & Dispatch) -->
        <div id="panel-stock-scanner" class="${stockQrActiveTab === 'scanner' ? 'block' : 'hidden'} space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Left: Camera Viewfinder & Controls -->
                <div class="lg:col-span-5 glass-card rounded-2xl p-6 space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                        <div class="flex items-center gap-2.5">
                            <span class="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                                <i data-lucide="scan-line" class="w-5 h-5"></i>
                            </span>
                            <div>
                                <h3 class="text-sm font-bold text-white">Live Camera Scanner</h3>
                                <p class="text-[11px] text-slate-400">Smartphone rear camera or depot webcam</p>
                            </div>
                        </div>
                    </div>

                    <!-- Camera Viewfinder Box -->
                    <div id="qr-reader" class="w-full rounded-2xl overflow-hidden bg-black/60 border-2 border-dashed border-cyan-500/30 min-h-[260px] flex items-center justify-center relative">
                        <div class="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-500">
                                <i data-lucide="camera" class="w-6 h-6"></i>
                            </div>
                            <p class="font-medium text-slate-300">Camera is ready</p>
                            <p class="text-[11px] text-slate-500">Click below to start camera scanner</p>
                        </div>
                    </div>

                    <!-- Toggle Camera Button -->
                    <button id="btn-toggle-camera" onclick="startCameraScanner()" class="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2">
                        <i data-lucide="camera" class="w-4 h-4"></i>
                        <span>Start Camera Scanner</span>
                    </button>

                    <!-- Alternative Fallbacks: Photo Upload & Manual Search -->
                    <div class="pt-3 border-t border-white/[0.08] space-y-3">
                        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fallback Verification Options</div>
                        
                        <!-- Upload Image -->
                        <div class="flex items-center gap-2">
                            <label class="flex-1 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-300 cursor-pointer transition-colors flex items-center justify-center gap-2">
                                <i data-lucide="image" class="w-4 h-4 text-cyan-400"></i>
                                <span>Scan from Photo / Gallery</span>
                                <input type="file" accept="image/*" onchange="scanQrFromImageFile(event)" class="hidden">
                            </label>
                        </div>

                        <!-- Manual Batch Dropdown / Search -->
                        <div class="flex items-center gap-2">
                            <select id="manual-batch-search-select" onchange="if(this.value) handleManualBatchSearch(this.value)" class="flex-1 text-xs py-2 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-slate-200 focus:outline-none">
                                <option value="" class="bg-[#121324]">-- Quick Select Existing Batch --</option>
                                ${batches.map(b => `<option value="${b.batch}" class="bg-[#121324]">${b.batch} • ${b.product}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Right: Scan Result Card & Quick Actions -->
                <div class="lg:col-span-7" id="scan-result-container">
                    ${lastScannedBatch ? '' : `
                        <div class="glass-card rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[340px]">
                            <div class="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                                <i data-lucide="scan" class="w-8 h-8"></i>
                            </div>
                            <h4 class="text-base font-bold text-white">Awaiting QR Scan</h4>
                            <p class="text-xs text-slate-400 mt-1 max-w-sm">
                                Point camera at crate sticker or select a batch from the fallback list to verify shelf-life, calculate days remaining, and process dispatch.
                            </p>
                        </div>
                    `}
                </div>
            </div>
        </div>

        <!-- Section 3: Active Stock Batches Directory Table (FEFO Sorted) -->
        <div class="glass-card rounded-2xl p-6 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div>
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i data-lucide="database" class="w-4 h-4 text-cyan-400"></i>
                        <span>Active Stock Batches Directory (FEFO Order)</span>
                    </h3>
                    <p class="text-xs text-slate-400">Sorted by nearest expiration date first for FIFO/FEFO depot dispatch</p>
                </div>

                <!-- Search and Status Filter -->
                <div class="flex flex-wrap items-center gap-2">
                    <div class="relative">
                        <input type="text" oninput="stockQrSearchQuery = this.value; renderStockDirectoryTable();" placeholder="Search batch or product..." class="text-xs py-2 pl-8 pr-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-48 sm:w-56">
                        <i data-lucide="search" class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3"></i>
                    </div>

                    <!-- Filter pills -->
                    <div class="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-[11px]">
                        <button onclick="stockQrStatusFilter = 'all'; renderStockDirectoryTable();" class="px-2.5 py-1 rounded-lg font-bold transition-colors ${stockQrStatusFilter === 'all' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}">All</button>
                        <button onclick="stockQrStatusFilter = 'safe'; renderStockDirectoryTable();" class="px-2.5 py-1 rounded-lg font-bold transition-colors ${stockQrStatusFilter === 'safe' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-emerald-300'}">Safe</button>
                        <button onclick="stockQrStatusFilter = 'near_expiry'; renderStockDirectoryTable();" class="px-2.5 py-1 rounded-lg font-bold transition-colors ${stockQrStatusFilter === 'near_expiry' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-amber-300'}">Near Expiry</button>
                        <button onclick="stockQrStatusFilter = 'expired'; renderStockDirectoryTable();" class="px-2.5 py-1 rounded-lg font-bold transition-colors ${stockQrStatusFilter === 'expired' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-rose-300'}">Expired</button>
                    </div>
                </div>
            </div>

            <!-- Table Container -->
            <div id="stock-directory-table-container"></div>
        </div>
    `;

    // Apply default expiry preset (+12 months) if inward panel is active
    if (stockQrActiveTab === 'inward') {
        applyExpiryPreset(12);
        if (batches.length > 0) {
            renderLiveBatchPreviewCard(batches[0]);
        }
    } else if (stockQrActiveTab === 'scanner' && lastScannedBatch) {
        renderScanResultCard(lastScannedBatch);
    }

    renderStockDirectoryTable();
    lucide.createIcons();
}

// -------------------------------------------------------------------
// 15. CSV EXPORT UTILITIES (UTF-8 BOM COMPATIBLE)
// -------------------------------------------------------------------
function downloadCSV(filename, csvContent) {
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded ${filename}`);
}

function exportAttendanceCSV() {
    const headers = ['Attendance ID', 'Date', 'Worker Name', 'Role', 'Status', 'Notes'];
    const rows = APP_DATA.attendances.map(a => {
        const w = APP_DATA.workers.find(item => item.id === a.worker_id) || { name: 'Unknown', role: '' };
        return [a.id, a.date, `"${w.name}"`, `"${w.role}"`, `"${a.status}"`, `"${a.notes || ''}"`].join(',');
    });
    downloadCSV('Anupama_Agencies_Attendance_Register.csv', [headers.join(','), ...rows].join('\r\n'));
}

function exportAdvancesCSV() {
    const headers = ['Advance ID', 'Worker Name', 'Role', 'Payment Date', 'Amount (INR)', 'Payment Mode', 'Reason', 'Status'];
    const rows = APP_DATA.advances.map(a => {
        const w = APP_DATA.workers.find(item => item.id === a.worker_id) || { name: 'Unknown', role: '' };
        return [a.id, `"${w.name}"`, `"${w.role}"`, a.payment_date, a.amount_paid, `"${a.payment_mode}"`, `"${a.reason || ''}"`, `"${a.status}"`].join(',');
    });
    downloadCSV('Anupama_Agencies_Khata_Advances.csv', [headers.join(','), ...rows].join('\r\n'));
}

function exportFuelCSV() {
    const headers = ['Expense ID', 'Date', 'Vehicle Number', 'Vehicle Name', 'Driver', 'Fuel Type', 'Amount Spent (INR)', 'Liters', 'Odometer Reading', 'Notes'];
    const rows = APP_DATA.fuel_expenses.map(f => {
        const v = APP_DATA.vehicles.find(item => item.id === f.vehicle_id) || { vehicle_number: '', vehicle_name: '' };
        const d = APP_DATA.workers.find(item => item.id === f.driver_id) || { name: 'Unassigned' };
        return [f.id, f.date, `"${v.vehicle_number}"`, `"${v.vehicle_name}"`, `"${d.name}"`, `"${f.fuel_type}"`, f.amount_spent, f.liters, f.odometer_reading || '', `"${f.notes || ''}"`].join(',');
    });
    downloadCSV('Anupama_Agencies_Fuel_Expenses.csv', [headers.join(','), ...rows].join('\r\n'));
}

function exportSettlementsCSV() {
    const headers = ['Settlement ID', 'Month-Year', 'Worker Name', 'Role', 'Effective Days', 'Daily Wage', 'Gross Earnings', 'Advances Deducted', 'Bonus', 'Net Payout', 'Payment Date', 'Mode', 'Reference'];
    const rows = APP_DATA.salary_settlements.map(s => {
        const w = APP_DATA.workers.find(item => item.id === s.worker_id) || { name: 'Unknown', role: '' };
        return [s.id, s.month_year, `"${w.name}"`, `"${w.role}"`, s.effective_days, s.daily_wage, s.gross_earnings, s.advances_deducted, s.bonus_incentive, s.net_payout, s.settlement_date, `"${s.payment_mode}"`, `"${s.payment_reference || ''}"`].join(',');
    });
    downloadCSV('Anupama_Agencies_Salary_Settlements.csv', [headers.join(','), ...rows].join('\r\n'));
}

function exportReturnsCSV() {
    const headers = ['Return ID', 'Date', 'Brand', 'Product Name', 'Retailer Name', 'Batch No', 'Quantity', 'Unit', 'Reason', 'Claim Status', 'Claim Amount (INR)', 'Credit Note Number'];
    const rows = APP_DATA.damaged_returns.map(r => {
        return [r.id, r.return_date, `"${r.brand}"`, `"${r.product_name}"`, `"${r.retailer_name}"`, `"${r.batch_no || ''}"`, r.quantity, `"${r.unit}"`, `"${r.reason}"`, `"${r.claim_status}"`, r.credit_note_amount, `"${r.credit_note_number || ''}"`].join(',');
    });
    downloadCSV('Anupama_Agencies_Damaged_Returns.csv', [headers.join(','), ...rows].join('\r\n'));
}

function exportStockBatchesCSV() {
    const headers = ['Batch ID', 'Brand', 'Product Name', 'Batch Number', 'MFG Date', 'EXP Date', 'Days Remaining', 'FEFO Shelf Life Status', 'Crates In Stock', 'Bay Notes'];
    const rows = (APP_DATA.stock_batches || []).map(b => {
        const expInfo = getBatchExpiryInfo(b.exp);
        return [
            b.id,
            `"${b.brand}"`,
            `"${b.product}"`,
            `"${b.batch}"`,
            b.mfg,
            b.exp,
            expInfo.daysRemaining,
            `"${expInfo.label}"`,
            b.qty,
            `"${b.notes || ''}"`
        ].join(',');
    });
    downloadCSV('Anupama_Agencies_Stock_Batches_QR.csv', [headers.join(','), ...rows].join('\r\n'));
}

function exportAllCSV() {
    exportAttendanceCSV();
    setTimeout(exportAdvancesCSV, 300);
    setTimeout(exportFuelCSV, 600);
    setTimeout(exportReturnsCSV, 900);
    setTimeout(exportStockBatchesCSV, 1200);
}

// -------------------------------------------------------------------
// 16. EXCEL (.XLSX) MULTI-SHEET BACKUP & RESTORE UTILITIES
// -------------------------------------------------------------------
function downloadBackupExcel() {
    if (typeof XLSX === 'undefined') {
        showToast("SheetJS (xlsx) library is still initializing. Please check your internet connection.", "error");
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        // 1. Workers (Staff Directory & Daily Wages)
        const workersData = (APP_DATA.workers || []).map(w => ({
            "Worker ID": w.id,
            "Worker Name": w.name,
            "Mobile Phone": w.phone,
            "Emergency Contact": w.emergency_contact || '',
            "Role / Designation": w.role,
            "Daily Wage (INR)": Number(w.daily_wage) || 0,
            "Monthly Salary (INR)": Number(w.monthly_salary) || 0,
            "Employment Status": w.status || 'Active',
            "Joining Date": w.join_date || '',
            "Photo Path": w.photo_path || ''
        }));
        const wsWorkers = XLSX.utils.json_to_sheet(workersData.length ? workersData : [{ "Worker ID": 1, "Worker Name": "", "Mobile Phone": "", "Emergency Contact": "", "Role / Designation": "", "Daily Wage (INR)": 0, "Monthly Salary (INR)": 0, "Employment Status": "Active", "Joining Date": "", "Photo Path": "" }]);
        XLSX.utils.book_append_sheet(wb, wsWorkers, "Workers");

        // 2. Attendance (Daily & Monthly Muster Logs)
        const attendanceData = (APP_DATA.attendances || []).map(a => {
            const w = (APP_DATA.workers || []).find(item => item.id === a.worker_id) || { name: 'Unknown' };
            return {
                "Attendance ID": a.id,
                "Worker ID": a.worker_id,
                "Worker Name": w.name,
                "Attendance Date": a.date,
                "Status": a.status,
                "Notes": a.notes || ''
            };
        });
        const wsAttendance = XLSX.utils.json_to_sheet(attendanceData.length ? attendanceData : [{ "Attendance ID": 1, "Worker ID": 1, "Worker Name": "", "Attendance Date": "", "Status": "Present", "Notes": "" }]);
        XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance");

        // 3. Advances (Staff Advance Khata)
        const advancesData = (APP_DATA.advances || []).map(adv => {
            const w = (APP_DATA.workers || []).find(item => item.id === adv.worker_id) || { name: 'Unknown' };
            return {
                "Advance ID": adv.id,
                "Worker ID": adv.worker_id,
                "Worker Name": w.name,
                "Payment Date": adv.payment_date,
                "Amount Paid (INR)": Number(adv.amount_paid) || 0,
                "Payment Mode": adv.payment_mode || 'Cash',
                "Reason": adv.reason || '',
                "Recovery Status": adv.status || 'Pending'
            };
        });
        const wsAdvances = XLSX.utils.json_to_sheet(advancesData.length ? advancesData : [{ "Advance ID": 1, "Worker ID": 1, "Worker Name": "", "Payment Date": "", "Amount Paid (INR)": 0, "Payment Mode": "Cash", "Reason": "", "Recovery Status": "Pending" }]);
        XLSX.utils.book_append_sheet(wb, wsAdvances, "Advances");

        // 4. Fuel_Logs (Vehicle Fleet Fuel Expenses)
        const fuelData = (APP_DATA.fuel_expenses || []).map(f => {
            const v = (APP_DATA.vehicles || []).find(item => item.id === f.vehicle_id) || { vehicle_number: '', vehicle_name: '' };
            const d = (APP_DATA.workers || []).find(item => item.id === f.driver_id) || { name: 'Unassigned' };
            return {
                "Expense ID": f.id,
                "Expense Date": f.date,
                "Vehicle ID": f.vehicle_id,
                "Vehicle Number": v.vehicle_number,
                "Vehicle Name": v.vehicle_name,
                "Driver ID": f.driver_id || '',
                "Driver Name": d.name,
                "Fuel Type": f.fuel_type || 'Diesel',
                "Amount Spent (INR)": Number(f.amount_spent) || 0,
                "Liters Filled": Number(f.liters) || 0,
                "Odometer Reading": Number(f.odometer_reading) || 0,
                "Notes": f.notes || ''
            };
        });
        const wsFuel = XLSX.utils.json_to_sheet(fuelData.length ? fuelData : [{ "Expense ID": 1, "Expense Date": "", "Vehicle ID": 1, "Vehicle Number": "", "Vehicle Name": "", "Driver ID": "", "Driver Name": "", "Fuel Type": "Diesel", "Amount Spent (INR)": 0, "Liters Filled": 0, "Odometer Reading": 0, "Notes": "" }]);
        XLSX.utils.book_append_sheet(wb, wsFuel, "Fuel_Logs");

        // 5. Beat_Dispatches (Daily Route & Stock Dispatches)
        const beatData = (APP_DATA.dispatch_beats || []).map(b => {
            const v = (APP_DATA.vehicles || []).find(item => item.id === b.vehicle_id) || { vehicle_number: '' };
            const d = (APP_DATA.workers || []).find(item => item.id === b.driver_id) || { name: 'Unassigned' };
            const h = (APP_DATA.workers || []).find(item => item.id === b.helper_id) || { name: 'None' };
            return {
                "Dispatch ID": b.id,
                "Dispatch Date": b.dispatch_date,
                "Beat Route Name": b.beat_name,
                "Vehicle ID": b.vehicle_id,
                "Vehicle Number": v.vehicle_number,
                "Driver ID": b.driver_id || '',
                "Driver Name": d.name,
                "Helper ID": b.helper_id || '',
                "Helper Name": h.name,
                "Crates Everest": Number(b.crates_everest) || 0,
                "Cartons Colgate": Number(b.cartons_colgate) || 0,
                "Dispatch Status": b.status || 'Dispatched',
                "Notes": b.notes || ''
            };
        });
        const wsBeats = XLSX.utils.json_to_sheet(beatData.length ? beatData : [{ "Dispatch ID": 1, "Dispatch Date": "", "Beat Route Name": "", "Vehicle ID": 1, "Vehicle Number": "", "Driver ID": "", "Driver Name": "", "Helper ID": "", "Helper Name": "", "Crates Everest": 0, "Cartons Colgate": 0, "Dispatch Status": "Dispatched", "Notes": "" }]);
        XLSX.utils.book_append_sheet(wb, wsBeats, "Beat_Dispatches");

        // 6. Damage_Expiry_Returns (Damaged & Expiry Claims)
        const returnsData = (APP_DATA.damaged_returns || []).map(r => ({
            "Return ID": r.id,
            "Return Date": r.return_date,
            "Brand": r.brand,
            "Product Name": r.product_name,
            "Retailer / Customer": r.retailer_name,
            "Batch Number": r.batch_no || '',
            "Expiry Date": r.expiry_date || '',
            "Quantity": Number(r.quantity) || 1,
            "Unit": r.unit || 'Crates',
            "Return Reason": r.reason || 'Damaged Carton',
            "Claim Status": r.claim_status || 'Pending Inspection',
            "Credit Note Amount (INR)": Number(r.credit_note_amount) || 0,
            "Credit Note Number": r.credit_note_number || '',
            "Notes": r.notes || ''
        }));
        const wsReturns = XLSX.utils.json_to_sheet(returnsData.length ? returnsData : [{ "Return ID": 1, "Return Date": "", "Brand": "", "Product Name": "", "Retailer / Customer": "", "Batch Number": "", "Expiry Date": "", "Quantity": 1, "Unit": "Crates", "Return Reason": "", "Claim Status": "Pending Inspection", "Credit Note Amount (INR)": 0, "Credit Note Number": "", "Notes": "" }]);
        XLSX.utils.book_append_sheet(wb, wsReturns, "Damage_Expiry_Returns");

        // 7. Stock_QR_Batches (Godown Stock Batches & FEFO)
        const batchesData = (APP_DATA.stock_batches || []).map(b => {
            const expInfo = (typeof getBatchExpiryInfo === 'function') ? getBatchExpiryInfo(b.exp) : { daysRemaining: 0, label: '' };
            return {
                "Batch ID": b.id,
                "Brand": b.brand,
                "Product Name": b.product,
                "Batch Number": b.batch,
                "MFG Date": b.mfg,
                "EXP Date": b.exp,
                "Days to Expiry": expInfo.daysRemaining,
                "FEFO Shelf Life Status": expInfo.label,
                "Crate Quantity": Number(b.qty) || 1,
                "Godown Bay Notes": b.notes || ''
            };
        });
        const wsBatches = XLSX.utils.json_to_sheet(batchesData.length ? batchesData : [{ "Batch ID": 1, "Brand": "", "Product Name": "", "Batch Number": "", "MFG Date": "", "EXP Date": "", "Days to Expiry": 0, "FEFO Shelf Life Status": "", "Crate Quantity": 1, "Godown Bay Notes": "" }]);
        XLSX.utils.book_append_sheet(wb, wsBatches, "Stock_QR_Batches");

        // 8. Vehicles Sheet (Fleet Master)
        const vehiclesData = (APP_DATA.vehicles || []).map(v => {
            const d = (APP_DATA.workers || []).find(w => w.id === v.assigned_driver_id) || { name: 'Unassigned' };
            return {
                "Vehicle ID": v.id,
                "Vehicle Number": v.vehicle_number,
                "Vehicle Name": v.vehicle_name,
                "Vehicle Type": v.vehicle_type || 'Delivery Van',
                "Fuel Type": v.fuel_type || 'Diesel',
                "Assigned Driver ID": v.assigned_driver_id || '',
                "Assigned Driver Name": d.name,
                "Vehicle Status": v.status || 'Active'
            };
        });
        const wsVehicles = XLSX.utils.json_to_sheet(vehiclesData.length ? vehiclesData : [{ "Vehicle ID": 1, "Vehicle Number": "", "Vehicle Name": "", "Vehicle Type": "", "Fuel Type": "", "Assigned Driver ID": "", "Assigned Driver Name": "", "Vehicle Status": "Active" }]);
        XLSX.utils.book_append_sheet(wb, wsVehicles, "Vehicles");

        // 9. Salary_Settlements Sheet
        const settlementsData = (APP_DATA.salary_settlements || []).map(s => {
            const w = (APP_DATA.workers || []).find(item => item.id === s.worker_id) || { name: 'Unknown', role: '' };
            return {
                "Settlement ID": s.id,
                "Month-Year": s.month_year,
                "Worker ID": s.worker_id,
                "Worker Name": w.name,
                "Role / Designation": w.role,
                "Effective Days": s.effective_days,
                "Daily Wage (INR)": s.daily_wage,
                "Gross Earnings (INR)": s.gross_earnings,
                "Advances Deducted (INR)": s.advances_deducted,
                "Bonus / Incentive (INR)": s.bonus_incentive || 0,
                "Net Payout (INR)": s.net_payout,
                "Settlement Date": s.settlement_date,
                "Payment Mode": s.payment_mode,
                "Payment Reference": s.payment_reference || ''
            };
        });
        const wsSettlements = XLSX.utils.json_to_sheet(settlementsData.length ? settlementsData : [{ "Settlement ID": 1, "Month-Year": "", "Worker ID": 1, "Worker Name": "", "Role / Designation": "", "Effective Days": 0, "Daily Wage (INR)": 0, "Gross Earnings (INR)": 0, "Advances Deducted (INR)": 0, "Bonus / Incentive (INR)": 0, "Net Payout (INR)": 0, "Settlement Date": "", "Payment Mode": "", "Payment Reference": "" }]);
        XLSX.utils.book_append_sheet(wb, wsSettlements, "Salary_Settlements");

        // Write and trigger download
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `Anupama_Agencies_Backup_${dateStr}.xlsx`;
        XLSX.writeFile(wb, filename);

        showToast(`Excel backup downloaded successfully (${filename})!`, "success");
    } catch (err) {
        console.error("Excel export error:", err);
        showToast("Error generating Excel backup file: " + err.message, "error");
    }
}

// Backward-compatibility alias
const downloadBackupJSON = downloadBackupExcel;

function restoreBackupFromFile() {
    const fileInput = document.getElementById('restore-file-input');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert("Please select a valid .xlsx (or .json) backup file to restore.");
        return;
    }

    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();

    // 1. Backward-compatibility: JSON backup restore
    if (fileName.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (!parsed.workers || !Array.isArray(parsed.workers)) {
                    throw new Error("Invalid backup format");
                }
                APP_DATA = normalizeAppData(parsed);
                StorageManager.save(APP_DATA);
                closeModal('backup-modal');
                renderView(currentView);
                showToast("Database restored successfully from JSON backup file!", "success");
            } catch (err) {
                alert("Error parsing backup JSON. Please ensure it is a valid Anupama Agencies backup file.");
            }
        };
        reader.readAsText(file);
        return;
    }

    // 2. Primary: Excel (.xlsx / .xls) restore with SheetJS
    if (typeof XLSX === 'undefined') {
        alert("SheetJS (xlsx) engine is loading. Please verify internet connection or refresh page.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error("Empty or invalid Excel workbook");
            }

            // Helper to match sheet name case-insensitively and ignore underscores/spaces
            const getSheetRows = (names) => {
                for (const name of names) {
                    const normTarget = name.toLowerCase().replace(/[\s_-]/g, '');
                    const foundName = workbook.SheetNames.find(sn => sn.toLowerCase().replace(/[\s_-]/g, '') === normTarget);
                    if (foundName && workbook.Sheets[foundName]) {
                        return XLSX.utils.sheet_to_json(workbook.Sheets[foundName], { defval: "" });
                    }
                }
                return [];
            };

            const restoredData = {
                version: 1,
                lastUpdated: Date.now(),
                workers: [],
                vehicles: [],
                attendances: [],
                advances: [],
                fuel_expenses: [],
                dispatch_beats: [],
                damaged_returns: [],
                salary_settlements: [],
                stock_batches: []
            };

            // Parse Workers
            const workersRows = getSheetRows(['Workers', 'Staff', 'Worker']);
            if (workersRows.length > 0) {
                restoredData.workers = workersRows
                    .filter(r => (r['Worker Name'] || r.name || r['name'] || '').toString().trim() !== '')
                    .map((r, idx) => ({
                        id: Number(r['Worker ID'] || r.id || idx + 1),
                        name: String(r['Worker Name'] || r.name || '').trim(),
                        phone: String(r['Mobile Phone'] || r.phone || r['Phone'] || '').trim(),
                        emergency_contact: String(r['Emergency Contact'] || r.emergency_contact || '').trim(),
                        role: String(r['Role / Designation'] || r.role || r['Designation'] || 'Staff').trim(),
                        daily_wage: Number(r['Daily Wage (INR)'] || r['Daily Wage'] || r.daily_wage || 0),
                        monthly_salary: Number(r['Monthly Salary (INR)'] || r['Monthly Salary'] || r.monthly_salary || 0),
                        status: String(r['Employment Status'] || r.status || 'Active').trim(),
                        join_date: String(r['Joining Date'] || r.join_date || '').trim(),
                        photo_path: String(r['Photo Path'] || r.photo_path || '').trim()
                    }));
            }

            // Parse Vehicles
            const vehiclesRows = getSheetRows(['Vehicles', 'Fleet', 'Vehicle']);
            if (vehiclesRows.length > 0) {
                restoredData.vehicles = vehiclesRows
                    .filter(r => (r['Vehicle Number'] || r.vehicle_number || '').toString().trim() !== '')
                    .map((r, idx) => ({
                        id: Number(r['Vehicle ID'] || r.id || idx + 1),
                        vehicle_number: String(r['Vehicle Number'] || r.vehicle_number || '').trim(),
                        vehicle_name: String(r['Vehicle Name'] || r.vehicle_name || '').trim(),
                        vehicle_type: String(r['Vehicle Type'] || r.vehicle_type || 'Delivery Van').trim(),
                        fuel_type: String(r['Fuel Type'] || r.fuel_type || 'Diesel').trim(),
                        assigned_driver_id: r['Assigned Driver ID'] ? Number(r['Assigned Driver ID']) : (r.assigned_driver_id ? Number(r.assigned_driver_id) : null),
                        status: String(r['Vehicle Status'] || r.status || 'Active').trim()
                    }));
            } else if (APP_DATA.vehicles && APP_DATA.vehicles.length > 0) {
                restoredData.vehicles = APP_DATA.vehicles;
            }

            // Parse Attendance
            const attendanceRows = getSheetRows(['Attendance', 'Attendances', 'Muster']);
            if (attendanceRows.length > 0) {
                restoredData.attendances = attendanceRows
                    .filter(r => (r['Attendance Date'] || r.date || '').toString().trim() !== '')
                    .map((r, idx) => ({
                        id: Number(r['Attendance ID'] || r.id || idx + 1),
                        worker_id: Number(r['Worker ID'] || r.worker_id || 1),
                        date: String(r['Attendance Date'] || r.date || '').trim(),
                        status: String(r['Status'] || r.status || 'Present').trim(),
                        notes: String(r['Notes'] || r.notes || '').trim()
                    }));
            }

            // Parse Advances
            const advancesRows = getSheetRows(['Advances', 'Advance', 'Khata']);
            if (advancesRows.length > 0) {
                restoredData.advances = advancesRows
                    .filter(r => (r['Amount Paid (INR)'] || r.amount_paid || r.amount || 0) > 0 || (r['Payment Date'] || r.payment_date))
                    .map((r, idx) => ({
                        id: Number(r['Advance ID'] || r.id || idx + 1),
                        worker_id: Number(r['Worker ID'] || r.worker_id || 1),
                        payment_date: String(r['Payment Date'] || r.payment_date || '').trim(),
                        amount_paid: Number(r['Amount Paid (INR)'] || r.amount_paid || r.amount || 0),
                        payment_mode: String(r['Payment Mode'] || r.payment_mode || 'Cash').trim(),
                        reason: String(r['Reason'] || r.reason || '').trim(),
                        status: String(r['Recovery Status'] || r.status || 'Pending').trim()
                    }));
            }

            // Parse Fuel Logs
            const fuelRows = getSheetRows(['Fuel_Logs', 'FuelLogs', 'Fuel', 'FuelExpenses']);
            if (fuelRows.length > 0) {
                restoredData.fuel_expenses = fuelRows
                    .filter(r => (r['Expense Date'] || r.date || '').toString().trim() !== '')
                    .map((r, idx) => ({
                        id: Number(r['Expense ID'] || r.id || idx + 1),
                        date: String(r['Expense Date'] || r.date || '').trim(),
                        vehicle_id: Number(r['Vehicle ID'] || r.vehicle_id || 1),
                        driver_id: r['Driver ID'] ? Number(r['Driver ID']) : (r.driver_id ? Number(r.driver_id) : null),
                        fuel_type: String(r['Fuel Type'] || r.fuel_type || 'Diesel').trim(),
                        amount_spent: Number(r['Amount Spent (INR)'] || r.amount_spent || 0),
                        liters: Number(r['Liters Filled'] || r.liters || 0),
                        odometer_reading: Number(r['Odometer Reading'] || r.odometer_reading || 0),
                        notes: String(r['Notes'] || r.notes || '').trim()
                    }));
            }

            // Parse Beat Dispatches
            const beatRows = getSheetRows(['Beat_Dispatches', 'BeatDispatches', 'Dispatches', 'Dispatch']);
            if (beatRows.length > 0) {
                restoredData.dispatch_beats = beatRows
                    .filter(r => (r['Dispatch Date'] || r.dispatch_date || '').toString().trim() !== '')
                    .map((r, idx) => ({
                        id: Number(r['Dispatch ID'] || r.id || idx + 1),
                        dispatch_date: String(r['Dispatch Date'] || r.dispatch_date || '').trim(),
                        beat_name: String(r['Beat Route Name'] || r.beat_name || 'Wholesale Beat').trim(),
                        vehicle_id: Number(r['Vehicle ID'] || r.vehicle_id || 1),
                        driver_id: r['Driver ID'] ? Number(r['Driver ID']) : (r.driver_id ? Number(r.driver_id) : null),
                        helper_id: r['Helper ID'] ? Number(r['Helper ID']) : (r.helper_id ? Number(r.helper_id) : null),
                        crates_everest: Number(r['Crates Everest'] || r.crates_everest || 0),
                        cartons_colgate: Number(r['Cartons Colgate'] || r.cartons_colgate || 0),
                        status: String(r['Dispatch Status'] || r.status || 'Dispatched').trim(),
                        notes: String(r['Notes'] || r.notes || '').trim()
                    }));
            }

            // Parse Damage & Expiry Returns
            const returnsRows = getSheetRows(['Damage_Expiry_Returns', 'DamagedReturns', 'Returns', 'Damage_Returns']);
            if (returnsRows.length > 0) {
                restoredData.damaged_returns = returnsRows
                    .filter(r => (r['Product Name'] || r.product_name || '').toString().trim() !== '')
                    .map((r, idx) => ({
                        id: Number(r['Return ID'] || r.id || idx + 1),
                        return_date: String(r['Return Date'] || r.return_date || '').trim(),
                        brand: String(r['Brand'] || r.brand || 'Everest Spices').trim(),
                        product_name: String(r['Product Name'] || r.product_name || '').trim(),
                        retailer_name: String(r['Retailer / Customer'] || r.retailer_name || '').trim(),
                        batch_no: String(r['Batch Number'] || r.batch_no || '').trim(),
                        expiry_date: String(r['Expiry Date'] || r.expiry_date || '').trim(),
                        quantity: Number(r['Quantity'] || r.quantity || 1),
                        unit: String(r['Unit'] || r.unit || 'Crates').trim(),
                        reason: String(r['Return Reason'] || r.reason || 'Expired Stock').trim(),
                        claim_status: String(r['Claim Status'] || r.claim_status || 'Pending Inspection').trim(),
                        credit_note_amount: Number(r['Credit Note Amount (INR)'] || r.credit_note_amount || 0),
                        credit_note_number: String(r['Credit Note Number'] || r.credit_note_number || '').trim(),
                        notes: String(r['Notes'] || r.notes || '').trim()
                    }));
            }
#contributors are aaryan shriya sachi 
            // Parse Stock QR Batches
            const batchesRows = getSheetRows(['Stock_QR_Batches', 'StockQRBatches', 'StockBatches', 'Batches']);
            if (batchesRows.length > 0) {
                restoredData.stock_batches = batchesRows
                    .filter(r => (r['Batch Number'] || r.batch || '').toString().trim() !== '')
                    .map((r, idx) => ({
                        id: Number(r['Batch ID'] || r.id || idx + 1),
                        brand: String(r['Brand'] || r.brand || 'Everest Spices').trim(),
                        product: String(r['Product Name'] || r.product || '').trim(),
                        batch: String(r['Batch Number'] || r.batch || '').trim(),
                        mfg: String(r['MFG Date'] || r.mfg || '').trim(),
                        exp: String(r['EXP Date'] || r.exp || '').trim(),
                        qty: Number(r['Crate Quantity'] || r.qty || 1),
                        notes: String(r['Godown Bay Notes'] || r.notes || '').trim()
                    }));
            }

            // Parse Salary Settlements
            const settlementRows = getSheetRows(['Salary_Settlements', 'SalarySettlements', 'Settlements']);
            if (settlementRows.length > 0) {
                restoredData.salary_settlements = settlementRows
                    .filter(r => (r['Month-Year'] || r.month_year || '').toString().trim() !== '')
                    .map((r, idx) => ({
                        id: Number(r['Settlement ID'] || r.id || idx + 1),
                        month_year: String(r['Month-Year'] || r.month_year || '').trim(),
                        worker_id: Number(r['Worker ID'] || r.worker_id || 1),
                        effective_days: Number(r['Effective Days'] || r.effective_days || 0),
                        daily_wage: Number(r['Daily Wage (INR)'] || r.daily_wage || 0),
                        gross_earnings: Number(r['Gross Earnings (INR)'] || r.gross_earnings || 0),
                        advances_deducted: Number(r['Advances Deducted (INR)'] || r.advances_deducted || 0),
                        bonus_incentive: Number(r['Bonus / Incentive (INR)'] || r.bonus_incentive || 0),
                        net_payout: Number(r['Net Payout (INR)'] || r.net_payout || 0),
                        settlement_date: String(r['Settlement Date'] || r.settlement_date || '').trim(),
                        payment_mode: String(r['Payment Mode'] || r.payment_mode || 'Cash').trim(),
                        payment_reference: String(r['Payment Reference'] || r.payment_reference || '').trim()
                    }));
            }

            if (restoredData.workers.length === 0 && (!restoredData.stock_batches || restoredData.stock_batches.length === 0)) {
                throw new Error("No valid agency records found in Excel workbook.");
            }

            // Normalize and save
            APP_DATA = normalizeAppData(restoredData);
            StorageManager.save(APP_DATA);

            closeModal('backup-modal');
            renderView(currentView);

            showToast(`Data restored successfully from ${file.name}! (${restoredData.workers.length} staff, ${restoredData.stock_batches ? restoredData.stock_batches.length : 0} stock batches)`, "success");
        } catch (err) {
            console.error("Excel restore error:", err);
            alert("Error parsing Excel backup file: " + err.message + "\nPlease verify the file format is a valid Anupama Agencies Excel backup.");
        }
    };
    reader.readAsArrayBuffer(file);
}

function confirmResetToSeed() {
    if (confirm("Reset all data to default initial seed? All custom additions will be replaced.")) {
        APP_DATA = StorageManager.resetToSeed();
        closeModal('backup-modal');
        renderView(currentView);
        showToast("Database reset to factory default sample data.");
    }
}

// -------------------------------------------------------------------
// 17. INITIALIZATION ON DOM READY
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Current date in header
    const dateBadge = document.getElementById('current-date-badge');
    if (dateBadge) {
        const today = new Date();
        dateBadge.textContent = today.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    const footerYear = document.getElementById('footer-year');
    if (footerYear) footerYear.textContent = new Date().getFullYear();

    // Mobile drawer toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const drawerCloseBtn = document.getElementById('mobile-drawer-close');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (menuBtn && mobileDrawer) {
        menuBtn.addEventListener('click', () => {
            mobileDrawer.classList.remove('-translate-x-full');
            if (backdrop) backdrop.classList.remove('hidden');
        });
    }

    if (drawerCloseBtn && mobileDrawer) {
        drawerCloseBtn.addEventListener('click', () => {
            mobileDrawer.classList.add('-translate-x-full');
            if (backdrop) backdrop.classList.add('hidden');
        });
    }

    if (backdrop && mobileDrawer) {
        backdrop.addEventListener('click', () => {
            mobileDrawer.classList.add('-translate-x-full');
            backdrop.classList.add('hidden');
        });
    }

    // Global Search Input
    const globalSearchInput = document.getElementById('global-search-input');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const q = (globalSearchInput.value || '').trim().toLowerCase();
                if (!q) return;
                if (q.includes('fuel') || q.includes('diesel') || q.includes('petrol')) {
                    switchView('fuel');
                } else if (q.includes('qr') || q.includes('batch') || q.includes('expiry') || q.includes('crate')) {
                    switchView('stock-qr');
                } else if (q.includes('adv') || q.includes('khata') || q.includes('loan')) {
                    switchView('advances');
                } else if (q.includes('dispatch') || q.includes('beat') || q.includes('route')) {
                    switchView('dispatches');
                } else if (q.includes('attend') || q.includes('muster') || q.includes('present')) {
                    switchView('attendance');
                } else if (q.includes('return') || q.includes('damage') || q.includes('claim')) {
                    switchView('returns');
                } else if (q.includes('salary') || q.includes('wage') || q.includes('payout')) {
                    switchView('settlements');
                } else {
                    workerSearchQuery = q;
                    switchView('workers');
                }
            }
        });
    }

    // Initialize 4-Digit Agency Security PIN Lock
    initPinLock();

    // Initialize Firebase Realtime Database multi-device cloud sync
    initFirebaseSync();

    // Default view
    switchView('dashboard');
});
