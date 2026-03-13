// ================================================================
// Google Apps Script — EnglishJibi Student Panel Backend
// ================================================================
//
// ── DEPLOYMENT INSTRUCTIONS ─────────────────────────────────────
//
//  1. Go to https://script.google.com and create a new project.
//
//  2. Your Google Sheet ID: 1PcgVZrGEwjuJa0lhnptAtI-e1_33jZ97Gpwt-3OFC0Y
//
//  3. In your Google Sheet, create THREE sheets (tabs):
//
//     - "REGISTRATION" — authentication & system data only:
//       studentId | studentName | email | password |
//       accessToken | status | lastAccessTime
//
//     - "STUDENT_DETAILS" — profile data (FK → REGISTRATION.studentId):
//       studentId | studentName | schoolName | className |
//       profileImageUrl | contactNumber | contactType | createdAt
//
//     - "RESULTS" — test results:
//       studentId | studentName | subject | level | set | score |
//       totalMarks | percentage | timeTaken | date | testId
//
//  4. Copy this entire file content into the Apps Script editor.
//
//  5. Deploy:
//     - Click Deploy → New deployment
//     - Type: Web app
//     - Execute as: Me
//     - Who has access: Anyone
//     - Click Deploy
//     - Copy the Web App URL
//
//  6. Paste the Web App URL into backend/api.js as BACKEND_URL:
//     const BACKEND_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
//
//  7. Done! Authentication + Result sync is now active.
//
// ── IMPORTANT NOTES ─────────────────────────────────────────────
//
//  - Google Apps Script handles CORS automatically for deployed web apps.
//  - The doPost function handles: login, saveResult, validateSession.
//  - The doGet function handles: getProgress, getProfile.
//  - Each redeployment generates a new URL — update BACKEND_URL.
//  - Passwords are stored as plain text in the sheet (column I).
//
// ================================================================

// ── CONFIGURATION ───────────────────────────────────────────────
const SHEET_ID = '1fyRDAfRltfuUDWFgGZQbf97pbnxzDBMBdKEkZHOkIUE';

// ── Sheet GIDs (numeric tab IDs — never change even if tab is renamed) ──
const SHEET_GID = {
    REGISTRATION: 1488800850  // https://docs.google.com/spreadsheets/d/...#gid=1488800850
};

// ── Column indices (0-based) for REGISTRATION sheet ─────────────
// PRIMARY KEY: STUDENT_ID
const REG_COL = {
    STUDENT_ID: 0,    // PK — system generated
    NAME: 1,
    EMAIL: 2,
    PASSWORD: 3,      // plain text password
    ACCESS_TOKEN: 4,
    STATUS: 5,
    LAST_ACCESS_TIME: 6
};

// ── Column indices (0-based) for STUDENT_DETAILS sheet ──────────
// FOREIGN KEY: STUDENT_ID → REGISTRATION.STUDENT_ID
const DET_COL = {
    STUDENT_ID: 0,    // FK → REGISTRATION.STUDENT_ID
    STUDENT_NAME: 1,
    SCHOOL_NAME: 2,
    CLASS_NAME: 3,
    PROFILE_IMAGE_URL: 4,  // empty until image system is integrated
    CONTACT_NUMBER: 5,
    CONTACT_TYPE: 6,       // 'self' or 'parents'
    CREATED_AT: 7
};

// ── Column indices (0-based) for RESULTS sheet ──────────────────
const RES_COL = {
    ID: 0,
    NAME: 1,
    SUBJECT: 2,
    LEVEL: 3,
    SET: 4,
    SCORE: 5,
    TOTAL: 6,
    PERCENTAGE: 7,
    TIME_TAKEN: 8,
    DATE: 9,
    TEST_ID: 10
};

// ── Execution-level spreadsheet cache ───────────────────────────
let _cachedSS = null;
function _getSS() {
    if (!_cachedSS) _cachedSS = SpreadsheetApp.openById(SHEET_ID);
    return _cachedSS;
}

/**
 * Get a sheet by its numeric GID (tab ID).
 * More reliable than getSheetByName() — survives tab renames.
 */
function _getSheetByGid(ss, gid) {
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
        if (sheets[i].getSheetId() === gid) return sheets[i];
    }
    return null;
}

/**
 * Get the REGISTRATION sheet using its pinned GID.
 * Falls back to name-based lookup for other sheets.
 */
function _getRegSheet(ss) {
    return _getSheetByGid(ss, SHEET_GID.REGISTRATION);
}

// ================================================================
// doPost — Handle incoming POST requests
// ================================================================
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action || 'saveResult';

        switch (action) {
            case 'login':
                return _handleLogin(data);
            case 'saveResult':
                return _handleSaveResult(data);
            case 'validateSession':
                return _handleValidateSession(data);
            case 'checkSession':
                return _handleCheckSession(data);
            case 'logout':
                return _handleLogout(data);
            case 'register':
                return _handleRegister(data);
            case 'listStudents':
                return _handleListStudents(data);
            case 'adminAction':
                return _handleAdminAction(data);
            case 'uploadPhoto':
                return _handleUploadPhoto(data);
            default:
                return _jsonResponse({ success: false, error: 'Unknown action: ' + action, code: 'UNKNOWN_ACTION' });
        }
    } catch (err) {
        return _jsonResponse({ success: false, error: err.toString(), code: 'INTERNAL_ERROR' });
    }
}

// ================================================================
// doGet — Handle incoming GET requests
// ================================================================
function doGet(e) {
    try {
        const action = e.parameter.action || '';
        const studentId = e.parameter.id || '';

        switch (action) {
            case 'getProgress':
                if (!studentId) return _jsonResponse({ success: false, error: 'Missing student ID', code: 'MISSING_ID' });
                return _jsonResponse(_getStudentProgress(studentId));

            case 'getProfile':
                if (!studentId) return _jsonResponse({ success: false, error: 'Missing student ID', code: 'MISSING_ID' });
                return _jsonResponse(_getStudentProfile(studentId));

            case 'getStudentResults':
                if (!studentId) return _jsonResponse({ success: false, error: 'Missing student ID', code: 'MISSING_ID' });
                return _jsonResponse(_getStudentResults(studentId));

            default:
                return _jsonResponse({
                    status: 'ok',
                    message: 'EnglishJibi Backend Active',
                    version: '2.0',
                    timestamp: new Date().toISOString()
                });
        }
    } catch (err) {
        return _jsonResponse({ success: false, error: err.toString(), code: 'INTERNAL_ERROR' });
    }
}

// ================================================================
// ACTION HANDLERS
// ================================================================

// ── Login Handler ───────────────────────────────────────────────
function _handleLogin(data) {
    if (!data.email || !data.password) {
        return _jsonResponse({ success: false, error: 'Email and password are required.', code: 'MISSING_FIELDS' });
    }

    const email = String(data.email).trim().toLowerCase();
    const password = String(data.password);

    // ── Rate limiting (5 attempts per email per 5 minutes) ──────
    const rateLimitKey = 'login_attempts_' + email;
    const cache = CacheService.getScriptCache();
    const attempts = parseInt(cache.get(rateLimitKey) || '0', 10);
    if (attempts >= 5) {
        return _jsonResponse({
            success: false,
            error: 'Too many login attempts. Please wait 5 minutes.',
            code: 'RATE_LIMITED'
        });
    }

    const ss = _getSS();
    const regSheet = _getRegSheet(ss);
    if (!regSheet) {
        return _jsonResponse({ success: false, error: 'Registration sheet not found.', code: 'SHEET_NOT_FOUND' });
    }

    // ── Targeted row lookup via TextFinder ──────────────────────
    const rowData = _findRowByColumn(regSheet, REG_COL.EMAIL, email);
    if (!rowData) {
        cache.put(rateLimitKey, String(attempts + 1), 300);
        return _jsonResponse({ success: false, error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }

    const row = rowData.values;
    const rowIndex = rowData.rowIndex;

    const studentId = row[REG_COL.STUDENT_ID];
    const studentName = row[REG_COL.NAME];
    const storedPassword = row[REG_COL.PASSWORD];
    const status = String(row[REG_COL.STATUS] || '').trim().toLowerCase();

    // Check status first
    if (status === 'pending') {
        return _jsonResponse({
            success: false, status: 'pending',
            error: 'Account pending approval. Please contact your teacher.',
            code: 'ACCOUNT_PENDING'
        });
    }
    if (status === 'suspended') {
        return _jsonResponse({
            success: false, status: 'suspended',
            error: 'Account suspended. Contact administrator.',
            code: 'ACCOUNT_SUSPENDED'
        });
    }
    if (status === 'rejected') {
        return _jsonResponse({
            success: false, status: 'rejected',
            error: 'Account rejected. Contact administrator.',
            code: 'ACCOUNT_REJECTED'
        });
    }
    if (status === 'blocked') {
        return _jsonResponse({
            success: false, status: 'blocked',
            error: 'Account blocked. Contact administrator.',
            code: 'ACCOUNT_BLOCKED'
        });
    }
    if (status !== 'approved') {
        return _jsonResponse({ success: false, error: 'Account not approved.', code: 'ACCOUNT_NOT_APPROVED' });
    }

    // Verify password
    if (password !== storedPassword) {
        cache.put(rateLimitKey, String(attempts + 1), 300);
        return _jsonResponse({ success: false, error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }

    // Generate active session token (forces logout on other devices)
    const activeSessionToken = Utilities.getUuid();
    regSheet.getRange(rowIndex, REG_COL.LAST_ACCESS_TIME + 1).setValue(new Date().toISOString());
    regSheet.getRange(rowIndex, REG_COL.ACCESS_TOKEN + 1).setValue(activeSessionToken);

    // Clear rate limit on success
    cache.remove(rateLimitKey);

    // ── Fetch profile details from STUDENT_DETAILS ──────────────
    let schoolName = '', className = '', profileImageUrl = '', contactNumber = '', contactType = '';
    const detSheet = ss.getSheetByName('STUDENT_DETAILS');
    if (detSheet) {
        const detRow = _findRowByColumn(detSheet, DET_COL.STUDENT_ID, studentId);
        if (detRow) {
            const d = detRow.values;
            schoolName = d[DET_COL.SCHOOL_NAME] || '';
            className = d[DET_COL.CLASS_NAME] || '';
            profileImageUrl = d[DET_COL.PROFILE_IMAGE_URL] || '';
            contactNumber = d[DET_COL.CONTACT_NUMBER] || '';
            contactType = d[DET_COL.CONTACT_TYPE] || '';
        }
    }

    return _jsonResponse({
        success: true,
        studentId: studentId,
        studentName: studentName,
        email: email,
        accessToken: activeSessionToken,
        schoolName: schoolName,
        className: className,
        contactType: contactType,
        contactNumber: contactNumber,
        profileImageUrl: profileImageUrl
    });
}

// ── Save Result Handler ─────────────────────────────────────────
function _handleSaveResult(data) {
    // Validate required fields
    if (!data.subject || !data.level || !data.set ||
        typeof data.score !== 'number' ||
        (typeof data.total !== 'number' && typeof data.totalMarks !== 'number')) {
        return _jsonResponse({ success: false, error: 'Missing required fields.', code: 'MISSING_FIELDS' });
    }

    const ss = _getSS();
    const studentId = data.id || data.studentId || 'anonymous';
    const studentName = data.name || data.studentName || 'Anonymous';

    // ── Verify student exists and is approved (targeted read) ───
    if (studentId !== 'anonymous') {
        const regSheet = _getRegSheet(ss);
        if (!regSheet) {
            return _jsonResponse({ success: false, error: 'Registration sheet not found.', code: 'SHEET_NOT_FOUND' });
        }
        const studentRow = _findRowByColumn(regSheet, REG_COL.STUDENT_ID, studentId);
        if (!studentRow) {
            return _jsonResponse({ success: false, error: 'Student not found.', code: 'STUDENT_NOT_FOUND' });
        }
        const status = String(studentRow.values[REG_COL.STATUS] || '').trim().toLowerCase();
        if (status !== 'approved') {
            return _jsonResponse({ success: false, error: 'Student not verified.', code: 'NOT_VERIFIED' });
        }
    }

    // ── Check for duplicate + append result ──────────────────────
    const resultsSheet = ss.getSheetByName('RESULTS');
    if (!resultsSheet) {
        return _jsonResponse({ success: false, error: 'RESULTS sheet not found.', code: 'SHEET_NOT_FOUND' });
    }

    // Check duplicate using testId (targeted search)
    if (data.testId) {
        const tsStr = String(data.testId);
        const finder = resultsSheet.createTextFinder(tsStr).matchEntireCell(true);
        const found = finder.findNext();
        if (found) {
            const foundRow = found.getRow();
            const rowVals = resultsSheet.getRange(foundRow, 1, 1, 11).getValues()[0];
            if (rowVals[RES_COL.ID] === studentId) {
                return _jsonResponse({ success: true, message: 'Duplicate — already saved.' });
            }
        }
    }

    // ── Append result ────────────────────────────────────────────
    resultsSheet.appendRow([
        studentId,
        studentName,
        data.subject,
        data.level,
        String(data.set),
        data.score,
        data.total || data.totalMarks,
        data.percentage || Math.round((data.score / (data.total || data.totalMarks)) * 100),
        data.timeTaken || 0,
        data.date || new Date().toISOString(),
        data.testId || ''
    ]);

    return _jsonResponse({ success: true, message: 'Result saved.' });
}

// ── Validate Session Handler ────────────────────────────────────
function _handleValidateSession(data) {
    if (!data.studentId || !data.token || !data.loginAt) {
        return _jsonResponse({ success: false, error: 'Invalid session data.', code: 'MISSING_FIELDS' });
    }

    const ss = _getSS();
    const regSheet = _getRegSheet(ss);
    if (!regSheet) return _jsonResponse({ success: false, error: 'Sheet not found.', code: 'SHEET_NOT_FOUND' });

    const row = _findRowByColumn(regSheet, REG_COL.STUDENT_ID, data.studentId);
    if (!row) return _jsonResponse({ success: false, verified: false });

    const status = String(row.values[REG_COL.STATUS] || '').trim().toLowerCase();
    return _jsonResponse({
        success: status === 'approved',
        verified: status === 'approved'
    });
}

// ── Check Session Handler (Server-authoritative) ────────────────
function _handleCheckSession(data) {
    const accessToken = data.accessToken || data.activeSessionToken;
    if (!data.studentId || !accessToken) {
        return _jsonResponse({ success: false, reason: 'missing_params' });
    }

    const ss = _getSS();
    const sheet = _getRegSheet(ss);
    if (!sheet) return _jsonResponse({ success: false, reason: 'sheet_not_found' });

    const row = _findRowByColumn(sheet, REG_COL.STUDENT_ID, data.studentId);
    if (!row) return _jsonResponse({ success: false, reason: 'student_not_found' });

    const status = String(row.values[REG_COL.STATUS] || '').trim().toLowerCase();
    if (status !== 'approved') {
        return _jsonResponse({ success: false, reason: 'account_not_approved' });
    }

    const storedToken = String(row.values[REG_COL.ACCESS_TOKEN] || '');
    if (storedToken === accessToken) {
        return _jsonResponse({ success: true });
    } else {
        return _jsonResponse({ success: false, reason: 'session_invalid' });
    }
}

// ── Logout Handler ──────────────────────────────────────────────
function _handleLogout(data) {
    if (!data.studentId) {
        return _jsonResponse({ success: false, error: 'Missing student ID.', code: 'MISSING_ID' });
    }

    const ss = _getSS();
    const sheet = _getRegSheet(ss);
    if (!sheet) return _jsonResponse({ success: false, error: 'Sheet not found.', code: 'SHEET_NOT_FOUND' });

    const row = _findRowByColumn(sheet, REG_COL.STUDENT_ID, data.studentId);
    if (!row) return _jsonResponse({ success: false, error: 'Student not found.', code: 'STUDENT_NOT_FOUND' });

    sheet.getRange(row.rowIndex, REG_COL.ACCESS_TOKEN + 1).setValue('');
    return _jsonResponse({ success: true });
}

// ── Register Handler ────────────────────────────────────────────
function _handleRegister(data) {
    if (!data.name || !data.email || !data.password) {
        return _jsonResponse({ success: false, error: 'Name, email, and password are required.', code: 'MISSING_FIELDS' });
    }

    const email = String(data.email).trim().toLowerCase();
    const name = String(data.name).trim();
    const password = String(data.password);

    if (password.length < 6) {
        return _jsonResponse({ success: false, error: 'Password must be at least 6 characters.', code: 'WEAK_PASSWORD' });
    }

    if (data.contactNumber !== undefined && data.contactNumber !== null && data.contactNumber !== '') {
        if (typeof data.contactNumber !== 'string' && typeof data.contactNumber !== 'number') {
            return _jsonResponse({ success: false, error: 'Invalid contact number.', code: 'INVALID_CONTACT' });
        }
    }

    const contactType = String(data.contactType || '').trim().toLowerCase();
    if (contactType && contactType !== 'self' && contactType !== 'parents') {
        return _jsonResponse({ success: false, error: 'contactType must be "self" or "parents".', code: 'INVALID_CONTACT_TYPE' });
    }

    const ss = _getSS();
    const regSheet = _getRegSheet(ss);
    if (!regSheet) return _jsonResponse({ success: false, error: 'Registration sheet not found.', code: 'SHEET_NOT_FOUND' });

    const detSheet = ss.getSheetByName('STUDENT_DETAILS');
    if (!detSheet) return _jsonResponse({ success: false, error: 'Student details sheet not found.', code: 'SHEET_NOT_FOUND' });

    // Check for duplicate email (targeted search)
    const existing = _findRowByColumn(regSheet, REG_COL.EMAIL, email);
    if (existing) {
        return _jsonResponse({ success: false, error: 'This email is already registered.', code: 'EMAIL_EXISTS' });
    }

    // Generate student ID — system assigned, unpredictable
    const studentId = 'STU_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
    const now = new Date().toISOString();

    // ── 1. Insert into REGISTRATION (authentication data) ────────
    regSheet.appendRow([
        studentId,   // 0: STUDENT_ID  (PK)
        name,        // 1: STUDENT_NAME
        email,       // 2: EMAIL
        password,    // 3: PASSWORD (plain text)
        '',          // 4: ACCESS_TOKEN (empty until login)
        'pending',   // 5: STATUS — teacher must approve
        ''           // 6: LAST_ACCESS_TIME
    ]);

    // ── 2. Insert into STUDENT_DETAILS (profile data) ────────────
    detSheet.appendRow([
        studentId,                    // 0: STUDENT_ID  (FK → REGISTRATION)
        name,                         // 1: STUDENT_NAME
        data.school || '',            // 2: SCHOOL_NAME
        data.class || '',            // 3: CLASS_NAME
        '',                           // 4: PROFILE_IMAGE_URL (empty — not integrated yet)
        data.contactNumber || '',     // 5: CONTACT_NUMBER
        contactType || '',            // 6: CONTACT_TYPE ('self' | 'parents')
        now                           // 7: CREATED_AT
    ]);

    return _jsonResponse({ success: true, message: 'Registration submitted. Await teacher approval.' });
}

// ================================================================
// ADMIN HANDLERS
// ================================================================

/**
 * List all students, optionally filtered by status.
 * data.statusFilter: 'pending' | 'approved' | 'suspended' | 'rejected' | 'all' (default: 'all')
 */
function _handleListStudents(data) {
    const ss = _getSS();
    const regSheet = _getRegSheet(ss);
    if (!regSheet) return _jsonResponse({ success: false, error: 'Sheet not found.', code: 'SHEET_NOT_FOUND' });

    const lastRow = regSheet.getLastRow();
    if (lastRow <= 1) return _jsonResponse({ success: true, students: [] });

    const allReg = regSheet.getRange(2, 1, lastRow - 1, regSheet.getLastColumn()).getValues();
    const filter = String(data.statusFilter || 'all').trim().toLowerCase();

    // ── Build a lookup map from STUDENT_DETAILS ──────────────────
    const detMap = {};
    const detSheet = ss.getSheetByName('STUDENT_DETAILS');
    if (detSheet && detSheet.getLastRow() > 1) {
        const allDet = detSheet.getRange(2, 1, detSheet.getLastRow() - 1, detSheet.getLastColumn()).getValues();
        for (let i = 0; i < allDet.length; i++) {
            const d = allDet[i];
            const sid = String(d[DET_COL.STUDENT_ID] || '').trim();
            if (sid) detMap[sid] = d;
        }
    }

    const students = [];
    for (let i = 0; i < allReg.length; i++) {
        const row = allReg[i];
        const status = String(row[REG_COL.STATUS] || '').trim().toLowerCase();

        if (filter !== 'all' && status !== filter) continue;

        const sid = String(row[REG_COL.STUDENT_ID] || '').trim();
        const det = detMap[sid] || [];

        students.push({
            studentId: sid,
            studentName: row[REG_COL.NAME] || '',
            email: row[REG_COL.EMAIL] || '',
            status: status,
            lastAccessTime: row[REG_COL.LAST_ACCESS_TIME] || '',
            // profile fields from STUDENT_DETAILS
            schoolName: det[DET_COL.SCHOOL_NAME] || '',
            className: det[DET_COL.CLASS_NAME] || '',
            contactNumber: det[DET_COL.CONTACT_NUMBER] || '',
            contactType: det[DET_COL.CONTACT_TYPE] || '',
            profileImageUrl: det[DET_COL.PROFILE_IMAGE_URL] || '',
            createdAt: det[DET_COL.CREATED_AT] || ''
        });
    }

    return _jsonResponse({ success: true, students: students });
}

/**
 * Admin action: approve, reject, suspend, or delete a student.
 * data.studentId, data.adminAction ('approve'|'reject'|'suspend'|'delete'), data.adminName
 */
function _handleAdminAction(data) {
    if (!data.studentId || !data.adminAction) {
        return _jsonResponse({ success: false, error: 'Missing studentId or adminAction.', code: 'MISSING_FIELDS' });
    }

    const validActions = ['approve', 'reject', 'suspend', 'delete'];
    const action = String(data.adminAction).trim().toLowerCase();
    if (!validActions.includes(action)) {
        return _jsonResponse({ success: false, error: 'Invalid action. Use: ' + validActions.join(', '), code: 'INVALID_ACTION' });
    }

    const ss = _getSS();
    const sheet = _getRegSheet(ss);
    if (!sheet) return _jsonResponse({ success: false, error: 'Sheet not found.', code: 'SHEET_NOT_FOUND' });

    const row = _findRowByColumn(sheet, REG_COL.STUDENT_ID, data.studentId);
    if (!row) return _jsonResponse({ success: false, error: 'Student not found.', code: 'STUDENT_NOT_FOUND' });

    if (action === 'delete') {
        // Also delete from STUDENT_DETAILS to maintain referential integrity
        const detSheet = ss.getSheetByName('STUDENT_DETAILS');
        if (detSheet) {
            const detRow = _findRowByColumn(detSheet, DET_COL.STUDENT_ID, data.studentId);
            if (detRow) detSheet.deleteRow(detRow.rowIndex);
        }
        sheet.deleteRow(row.rowIndex);
        return _jsonResponse({ success: true, message: 'Student deleted.' });
    }

    // Map action to status
    const statusMap = { approve: 'approved', reject: 'rejected', suspend: 'suspended' };
    const newStatus = statusMap[action];

    // Update status
    sheet.getRange(row.rowIndex, REG_COL.STATUS + 1).setValue(newStatus);

    // Clear session token if suspending/rejecting (force logout)
    if (action === 'suspend' || action === 'reject') {
        sheet.getRange(row.rowIndex, REG_COL.ACCESS_TOKEN + 1).setValue('');
    }

    return _jsonResponse({
        success: true,
        message: 'Student ' + action + 'd successfully.',
        studentId: data.studentId,
        newStatus: newStatus
    });
}

// ================================================================
// DATA RETRIEVAL HELPERS
// ================================================================

/**
 * Get all results for a specific student — structured like localStorage format.
 * Uses TextFinder for targeted reads when possible, falls back to filtered scan.
 */
function _getStudentProgress(studentId) {
    const ss = _getSS();
    const sheet = ss.getSheetByName('RESULTS');
    if (!sheet) return {};

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return {};

    // Read all data but only the columns we need
    const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    const progress = {};

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (String(row[RES_COL.ID]) !== String(studentId)) continue;

        const subject = row[RES_COL.SUBJECT];
        const level = row[RES_COL.LEVEL];
        const set = String(row[RES_COL.SET]);
        const score = row[RES_COL.SCORE];
        const total = row[RES_COL.TOTAL];
        const percentage = row[RES_COL.PERCENTAGE];
        const timeTaken = row[RES_COL.TIME_TAKEN];
        const date = row[RES_COL.DATE];
        const testId = row[RES_COL.TEST_ID];

        if (!progress[subject]) progress[subject] = {};
        if (!progress[subject][level]) progress[subject][level] = {};

        // Keep best score only
        const existing = progress[subject][level][set];
        if (!existing || percentage >= existing.percentage) {
            progress[subject][level][set] = {
                score, total, percentage, timeTaken, date, testId
            };
        }
    }

    return progress;
}

/**
 * Get all results for a specific student — flat array format.
 */
function _getStudentResults(studentId) {
    const ss = _getSS();
    const sheet = ss.getSheetByName('RESULTS');
    if (!sheet) return { success: false, error: 'RESULTS sheet not found.' };
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, results: [] };
    const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    const results = [];
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (String(row[RES_COL.ID]) !== String(studentId)) continue;
        results.push({
            id: row[RES_COL.ID],
            name: row[RES_COL.NAME],
            subject: row[RES_COL.SUBJECT],
            level: row[RES_COL.LEVEL],
            set: String(row[RES_COL.SET]),
            score: row[RES_COL.SCORE],
            totalMarks: row[RES_COL.TOTAL],
            percentage: row[RES_COL.PERCENTAGE],
            timeTaken: row[RES_COL.TIME_TAKEN],
            date: row[RES_COL.DATE],
            testId: row[RES_COL.TEST_ID] || ''
        });
    }
    return { success: true, results: results };
}

/**
 * Get student profile details from STUDENT_DETAILS sheet.
 * Uses targeted row lookup.
 */
function _getStudentProfile(studentId) {
    const ss = _getSS();
    const sheet = ss.getSheetByName('STUDENT_DETAILS');
    if (!sheet) return { success: false, error: 'STUDENT_DETAILS sheet not found.' };

    const row = _findRowByColumn(sheet, DET_COL.STUDENT_ID, studentId);
    if (!row) return { success: false, error: 'Student details not found.' };

    const d = row.values;
    return {
        success: true,
        studentId: d[DET_COL.STUDENT_ID],
        studentName: d[DET_COL.STUDENT_NAME],
        schoolName: d[DET_COL.SCHOOL_NAME],
        className: d[DET_COL.CLASS_NAME],
        profileImageUrl: d[DET_COL.PROFILE_IMAGE_URL],
        contactNumber: d[DET_COL.CONTACT_NUMBER],
        contactType: d[DET_COL.CONTACT_TYPE],
        createdAt: d[DET_COL.CREATED_AT]
    };
}

// ================================================================
// TARGETED ROW LOOKUP
// ================================================================

/**
 * Find a single row by searching a specific column for a value.
 * Uses TextFinder for O(1)-like lookup instead of full sheet scan.
 * Returns { rowIndex (1-based), values: [...] } or null.
 */
function _findRowByColumn(sheet, colIndex, searchValue) {
    if (!searchValue) return null;

    const searchStr = String(searchValue).trim();
    if (!searchStr) return null;

    // Use TextFinder on the specific column for fast lookup
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return null;

    const colRange = sheet.getRange(2, colIndex + 1, lastRow - 1, 1);
    const finder = colRange.createTextFinder(searchStr)
        .matchCase(colIndex === REG_COL.EMAIL ? false : true)
        .matchEntireCell(true);

    const found = finder.findNext();
    if (!found) return null;

    const rowIndex = found.getRow();
    const totalCols = sheet.getLastColumn();
    const values = sheet.getRange(rowIndex, 1, 1, totalCols).getValues()[0];

    // Double-check exact match (TextFinder may be case-insensitive)
    const cellVal = String(values[colIndex] || '').trim();
    if (colIndex === REG_COL.EMAIL) {
        if (cellVal.toLowerCase() !== searchStr.toLowerCase()) return null;
    } else {
        if (cellVal !== searchStr) return null;
    }

    return { rowIndex, values };
}

// ================================================================
// SECURITY + VALIDATION HELPERS
// ================================================================

/**
 * Return a JSON response with proper CORS headers.
 */
function _jsonResponse(data) {
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// ADMIN UTILITY FUNCTIONS (Run manually from Script Editor)
// ================================================================

/**
 * Upload / update a student's profile photo URL.
 * Student must be approved before uploading.
 */
function _handleUploadPhoto(data) {
    if (!data.studentId || !data.photoURL) {
        return _jsonResponse({ success: false, error: 'Missing studentId or photoURL.', code: 'MISSING_FIELDS' });
    }
    const ss = _getSS();

    // Verify student is approved in REGISTRATION
    const regSheet = _getRegSheet(ss);
    if (!regSheet) return _jsonResponse({ success: false, error: 'Sheet not found.', code: 'SHEET_NOT_FOUND' });
    const regRow = _findRowByColumn(regSheet, REG_COL.STUDENT_ID, data.studentId);
    if (!regRow) return _jsonResponse({ success: false, error: 'Student not found.', code: 'STUDENT_NOT_FOUND' });
    const status = String(regRow.values[REG_COL.STATUS] || '').trim().toLowerCase();
    if (status !== 'approved') {
        return _jsonResponse({ success: false, error: 'Account must be approved before uploading a photo.', code: 'NOT_APPROVED' });
    }

    // Update profile_image_url in STUDENT_DETAILS
    const detSheet = ss.getSheetByName('STUDENT_DETAILS');
    if (!detSheet) return _jsonResponse({ success: false, error: 'Student details sheet not found.', code: 'SHEET_NOT_FOUND' });
    const detRow = _findRowByColumn(detSheet, DET_COL.STUDENT_ID, data.studentId);
    if (!detRow) return _jsonResponse({ success: false, error: 'Student details not found.', code: 'STUDENT_NOT_FOUND' });
    detSheet.getRange(detRow.rowIndex, DET_COL.PROFILE_IMAGE_URL + 1).setValue(data.photoURL);

    return _jsonResponse({ success: true, profileImageUrl: data.photoURL });
}

/**
 * ADMIN: Create a new student registration with plain-text password.
 * Run this from Script Editor to add students.
 *
 * Usage: createStudent('STU001', 'John Doe', 'john@school.com', 'password123')
 * Note: Also call createStudentDetails() to populate the profile table.
 */
function createStudent(studentId, studentName, email, plainPassword) {
    if (!studentId || !studentName || !email || !plainPassword) {
        throw new Error('All parameters required: createStudent(studentId, studentName, email, plainPassword)');
    }
    email = String(email).trim().toLowerCase();
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = _getRegSheet(ss);
    if (!sheet) throw new Error('REGISTRATION sheet not found (check SHEET_GID.REGISTRATION)');

    // Check for existing email (targeted)
    const existingEmail = _findRowByColumn(sheet, REG_COL.EMAIL, email);
    if (existingEmail) throw new Error('Email already registered: ' + email);

    const existingId = _findRowByColumn(sheet, REG_COL.STUDENT_ID, studentId);
    if (existingId) throw new Error('Student ID already exists: ' + studentId);

    sheet.appendRow([
        studentId,    // 0: STUDENT_ID  (PK)
        studentName,  // 1: STUDENT_NAME
        email,        // 2: EMAIL
        plainPassword,// 3: PASSWORD (plain text)
        '',           // 4: ACCESS_TOKEN
        'approved',   // 5: STATUS
        ''            // 6: LAST_ACCESS_TIME
    ]);

    Logger.log('Student created: ' + studentId + ' (' + email + ')');
    return { success: true, studentId: studentId };
}

/**
 * ADMIN: Create student details entry.
 *
 * Usage: createStudentDetails('STU001', 'John Doe', 'ABC School', '10th', '9876543210', 'self')
 */
function createStudentDetails(studentId, studentName, schoolName, className, contactNumber, contactType) {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('STUDENT_DETAILS');
    if (!sheet) throw new Error('STUDENT_DETAILS sheet not found');

    sheet.appendRow([
        studentId,
        studentName,
        schoolName || '',
        className || '',
        '',                          // profileImageUrl — empty until image system integrated
        contactNumber || '',
        contactType || '',        // 'self' or 'parents'
        new Date().toISOString()
    ]);

    Logger.log('Student details created for: ' + studentId);
    return { success: true };
}
/**
 * ADMIN: Run this function from the Script Editor to create a test student.
 * Select "runCreateStudent" from the dropdown and click Run.
 */
function runCreateStudent() {
    const result = createStudent('STU004', 'John Doe', 'john@school.com', 'password123');
    Logger.log(result);
}

// ================================================================
// SETUP FUNCTION — Run ONCE to auto-create all sheets + headers
//
// HOW TO RUN:
//   1. Paste this entire file into https://script.google.com
//   2. Select "setupSpreadsheet" from the function dropdown at top
//   3. Click ▶ Run
//   4. Grant permissions when prompted (only once)
//   5. Check View → Logs for the success report
//   6. Open your Google Sheet — 3 sheets with headers will be ready
//
// SAFE TO RE-RUN: Never deletes existing data. Skips if headers exist.
// ================================================================

function setupSpreadsheet() {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const log = [];

    const SHEETS = [
        {
            name: 'REGISTRATION',
            // PRIMARY KEY: studentId — authentication & system data only
            headers: [
                'studentId', 'studentName', 'email', 'password',
                'accessToken', 'status', 'lastAccessTime'
            ],
            color: '#1a3c5e', tabColor: '#1a6eb5',
            columnWidths: {
                1: 160, 2: 180, 3: 220, 4: 200,
                5: 300, 6: 100, 7: 180
            }
        },
        {
            name: 'RESULTS',
            headers: [
                'studentId', 'studentName', 'subject', 'level', 'set',
                'score', 'totalMarks', 'percentage', 'timeTaken', 'date', 'testId'
            ],
            color: '#1a4a2e', tabColor: '#1e7e3e',
            columnWidths: {
                1: 160, 2: 180, 3: 100, 4: 100, 5: 80,
                6: 70, 7: 90, 8: 100, 9: 100, 10: 180, 11: 220
            }
        },
        {
            name: 'STUDENT_DETAILS',
            // FOREIGN KEY: studentId → REGISTRATION.studentId — profile data only
            headers: [
                'studentId', 'studentName', 'schoolName', 'className',
                'profileImageUrl', 'contactNumber', 'contactType', 'createdAt'
            ],
            color: '#3d2b00', tabColor: '#b58c00',
            columnWidths: {
                1: 160, 2: 180, 3: 200, 4: 120,
                5: 220, 6: 140, 7: 120, 8: 180
            }
        }
    ];

    for (const def of SHEETS) {
        // For REGISTRATION: resolve by pinned GID so the correct tab is always used
        let sheet = (def.name === 'REGISTRATION')
            ? _getSheetByGid(ss, SHEET_GID.REGISTRATION)
            : ss.getSheetByName(def.name);

        if (!sheet) {
            sheet = ss.insertSheet(def.name);
            log.push('✅ Created sheet: ' + def.name);
        } else {
            log.push('ℹ️  Sheet already exists: ' + def.name + ' (tab: "' + sheet.getName() + '")');
        }

        const headerRange = sheet.getRange(1, 1, 1, def.headers.length);
        const existingHeaders = headerRange.getValues()[0];
        const headersEmpty = existingHeaders.every(function (v) { return v === '' || v === null; });

        if (headersEmpty) {
            headerRange.setValues([def.headers]);
            headerRange
                .setBackground(def.color)
                .setFontColor('#ffffff')
                .setFontWeight('bold')
                .setFontSize(10)
                .setHorizontalAlignment('center')
                .setVerticalAlignment('middle')
                .setWrap(false);
            sheet.setRowHeight(1, 32);
            log.push('   ↳ Headers written (' + def.headers.length + ' columns)');
        } else {
            log.push('   ↳ Headers already present — skipped');
        }

        for (const col in def.columnWidths) {
            sheet.setColumnWidth(Number(col), def.columnWidths[col]);
        }
        sheet.setFrozenRows(1);
        sheet.setTabColor(def.tabColor);
        log.push('   ↳ Column widths set, header frozen, tab coloured');
    }

    log.push('');
    log.push('════════════════════════════════════════');
    log.push('✅ SETUP COMPLETE — EnglishJibi Student Panel');
    log.push('   Sheet ID : ' + SHEET_ID);
    log.push('   Next     : Deploy as Web App (see top of file)');
    log.push('════════════════════════════════════════');

    Logger.log(log.join('\n'));
    return log.join('\n');
}

function verifySetup() {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const expected = { REGISTRATION: 7, RESULTS: 11, STUDENT_DETAILS: 8 };
    const log = ['── EnglishJibi Sheet Verification ──'];
    let allOk = true;

    for (const name in expected) {
        // REGISTRATION is looked up by pinned GID, not by name
        const sheet = (name === 'REGISTRATION')
            ? _getSheetByGid(ss, SHEET_GID.REGISTRATION)
            : ss.getSheetByName(name);
        if (!sheet) {
            log.push('❌ MISSING: ' + name + ' → run setupSpreadsheet() first');
            allOk = false; continue;
        }
        const actualCols = sheet.getLastColumn();
        const ok = actualCols >= expected[name];
        const tabLabel = (name === 'REGISTRATION') ? ' (tab: "' + sheet.getName() + '", gid: ' + sheet.getSheetId() + ')' : '';
        log.push((ok ? '✅ ' : '⚠️  ') + name + ' — ' + actualCols + '/' + expected[name] + ' columns' + tabLabel);
        if (!ok) allOk = false;
    }

    log.push('');
    log.push(allOk ? '✅ All sheets OK.' : '⚠️  Issues found — re-run setupSpreadsheet().');
    Logger.log(log.join('\n'));
    return log.join('\n');
}