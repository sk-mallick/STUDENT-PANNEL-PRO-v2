# EnglishJibi Student Panel Pro — System Documentation

> **Version:** 2.0
> **Previous Version:** 1.0
> **Last Updated:** March 2026
> **Author:** Subham Kumar Mallick
> **Organization:** EnglishJibi Classes
> **Document Status:** Production

---

## Document Purpose

This document is the authoritative technical reference for **EnglishJibi Student Panel Pro v2.0**. It supersedes the Version 1.0 documentation in all areas where conflicts exist. All Version 1 architecture that remains unchanged is preserved and clearly marked. All new or modified components are explicitly identified with a **[v2 Update]** tag.

This document is intended for:

- **Software Developers** — implementing features and maintaining code
- **System Architects** — understanding structural design decisions
- **Technical Handover** — onboarding future engineers
- **Long-term Maintenance** — operational and debugging reference
- **AI-assisted Development** — providing a complete context snapshot

---

# Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Database Design](#3-database-design)
4. [Registration System](#4-registration-system)
5. [Result Storage System](#5-result-storage-system)
6. [Performance Optimization Strategy](#6-performance-optimization-strategy)
7. [Local Storage Caching Architecture](#7-local-storage-caching-architecture)
8. [Login Data Synchronization Flow](#8-login-data-synchronization-flow)
9. [Result Synchronization Flow](#9-result-synchronization-flow)
10. [Profile Refresh System](#10-profile-refresh-system)
11. [Concurrency Handling](#11-concurrency-handling)
12. [Backend API Reference](#12-backend-api-reference)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [Security Model](#14-security-model)
15. [Version 2 Technical Summary](#15-version-2-technical-summary)

---

# 1. Project Overview

## 1.1 Project Purpose

**EnglishJibi Student Panel Pro** is an interactive, web-based English grammar practice platform designed for students across multiple academic levels. It provides structured practice sets covering essential grammar topics: Tenses, Subject-Verb Agreement (SVA), Narration, Voice, Articles, Prepositions, and more.

Version 2.0 introduces an **enhanced data model**, a **performance-first local caching strategy**, a **Test_ID system for multi-attempt tracking**, and a **Profile Refresh mechanism** — while preserving all Version 1.0 architecture.

## 1.2 Problem Statement

Version 1 identified and addressed the following gaps in traditional English grammar education:

- Lack of structured, level-wise practice
- No instant feedback loop
- No persistent progress tracking
- Limited accessibility across devices

Version 2 additionally addresses:

- **Registration data incompleteness** — the V1 model lacked class, school, gender, contact, and photo fields
- **Result identity gaps** — no unique test attempt ID made multi-attempt tracking ambiguous
- **UI performance** — result and profile pages incurred backend round-trips on every load
- **Concurrent login overhead** — 20–30 simultaneous users exposed bottlenecks in backend query patterns
- **Profile stale-data problem** — no manual refresh mechanism existed on the profile page

## 1.3 Target Users

| User Type | Description |
|-----------|-------------|
| **Students** | Primary, Middle, and High school students (Classes 1–10) |
| **Teachers / Administrators** | Educators managing accounts, approvals, and progress monitoring |
| **Guardians** | Parents or guardians who may review student progress |

## 1.4 Real-World Use Case

A teacher at EnglishJibi Classes assigns grammar practice sets. Students log in from mobile or desktop, select a subject (e.g., Tenses), choose their level (e.g., Primary), and work through MCQ or fill-in-the-blank sets. After login, all student data is fetched once and stored in localStorage. Subsequent page navigations render from cache with millisecond response times. Completed results are stored locally and synced to Google Sheets in the background. The Profile page includes a Refresh button to pull the latest cloud data on demand.

## 1.5 Version Comparison

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Registration fields | Name, Email, Password | + Class, School, Gender, Contact, Role, Photo (post-approval) |
| Result tracking | Per-set best score | + Test_ID for multi-attempt history |
| Login data fetch | Progress only | Registration + Results for that student |
| Profile rendering | Backend fetch + local | Local-first, manual refresh button |
| Concurrent users | Unspecified | Designed for 20–30 simultaneous users |
| Photo upload | Not supported | Post-approval only |

---

# 2. System Architecture

## 2.1 Architecture Overview

The system follows a **static frontend + serverless backend + localStorage-first** architecture. Version 2 strengthens the local caching layer and formalizes the data sync contract.

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                  │
│  HTML Pages ──► JS Modules (ES6) ──► localStorage (Primary Store)│
│     │               │                     │                      │
│     │               ▼                     │                      │
│     │          backend/api.js             │                      │
│     │               │                     │                      │
│     ▼               ▼                     ▼                      │
│  Tailwind CSS   Google Apps Script    Offline Queue              │
│  (CDN)          (HTTPS REST API)     (localStorage)              │
│                      │                                           │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │              localStorage Stores (v2)                     │   │
│  │  grammarhub_progress_v2    — quiz results (subject/level) │   │
│  │  grammarhub_student_data   — registration profile data    │   │
│  │  grammarhub_results_cache  — flat results list            │   │
│  │  grammarhub_session        — auth session token           │   │
│  │  grammarhub_sync_queue     — offline result retry queue   │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
         ┌──────────────────────────┐
         │   Google Apps Script     │
         │   (Serverless Backend)   │
         │                          │
         │  doPost() ─── doGet()    │
         │       │           │      │
         │       ▼           ▼      │
         │  ┌─────────────────┐     │
         │  │  Google Sheets  │     │
         │  │                 │     │
         │  │  REGISTRATION   │     │
         │  │  RESULTS        │     │
         │  │  STUDENT_DETAILS│     │
         │  └─────────────────┘     │
         └──────────────────────────┘
```

## 2.2 Frontend Technologies

| Technology | Purpose |
|------------|---------|
| **HTML5** | Page structure and semantic markup |
| **Tailwind CSS (CDN)** | Utility-first CSS framework for responsive design |
| **Custom CSS** (`styles.css`) | Design tokens, glassmorphism effects, custom animations |
| **Vanilla JavaScript (ES6 Modules)** | Application logic — no frameworks, pure modular JS |
| **Inter (Google Fonts)** | Typography |
| **Canvas Confetti** | Celebratory animation on high-score quiz completion |

## 2.3 Backend Technologies

| Technology | Purpose |
|------------|---------|
| **Google Apps Script** | Serverless backend deployed as a Web App |
| **Google Sheets** | Database — structured spreadsheet acting as a relational store |
| **CacheService** | Server-side rate limiting for login attempts |
| **ContentService** | JSON API response generation with CORS support |
| **TextFinder** | Indexed row lookup for performance-optimized queries |

## 2.4 Database

**Google Sheets** serves as the database layer with three sheet tabs:

- `REGISTRATION` — Student accounts, credentials, session tokens, and extended registration fields (**[v2 Updated]**)
- `RESULTS` — All practice set scores, timestamps, and test attempt IDs (**[v2 Updated]**)
- `STUDENT_DETAILS` — Extended student profile data (school, class, guardian)

## 2.5 Hosting Environment

| Component | Hosting |
|-----------|---------|
| **Frontend** | Any static file host (GitHub Pages, Netlify, Vercel, or local server) |
| **Backend** | Google Apps Script (deployed as Web App — Google infrastructure) |
| **Database** | Google Sheets (Google Drive) |

## 2.6 Component Interaction Flow

1. The **browser** loads static HTML/CSS/JS files from the hosting server
2. `auth-guard.js` checks for a valid session in `localStorage` before rendering any protected page
3. **[v2]** On login, `api.js` fetches both **registration profile** and **results** for the student in a single coordinated call and stores them in localStorage
4. All subsequent page loads (dashboard, subject, level, profile) render **directly from localStorage** — no additional backend calls
5. `engine.js` saves results to localStorage immediately on quiz completion, then queues a background sync to Google Sheets
6. **[v2]** The Profile page includes a **Refresh button** that forces a fresh fetch from Google Sheets and updates localStorage
7. If the backend is unreachable, results are queued in localStorage and retried automatically on next load

---

# 3. Database Design

The database is implemented as a **Google Sheets** spreadsheet with three sheet tabs.

## 3.1 REGISTRATION Sheet — [v2 Updated]

Stores student accounts, credentials, session tokens, and all registration-time profile fields.

> **v2 Change:** The REGISTRATION sheet now consolidates fields previously split between REGISTRATION and STUDENT_DETAILS. The full expanded field set below replaces the minimal v1 schema.

| # | Column Name | Data Type | Description | Example |
|---|-------------|-----------|-------------|---------|
| 1 | `studentId` | String | Auto-generated unique ID (UUID-based prefix) | `STU_A1B2C3D4E5F6` |
| 2 | `studentName` | String | Full name of the student | `Rahul Sharma` |
| 3 | `class` | String | Student class/grade (dropdown 1–10) | `8` |
| 4 | `school` | String | School name (list or "Other") | `DPS Public School` |
| 5 | `gender` | String | Student gender (radio: Male / Female / Other) | `Male` |
| 6 | `contactType` | String | Contact category (Self / Parent) | `Parent` |
| 7 | `contactNumber` | String | Mobile number for contact | `9876543210` |
| 8 | `email` | String | Gmail ID (login credential, lowercase) | `rahul@gmail.com` |
| 9 | `passwordHash` | String | SHA-256 hash of salt + password | `a3f2b8c1d4...` |
| 10 | `salt` | String | Random 16-character salt for hashing | `e4f5a6b7c8d9e0f1` |
| 11 | `accessToken` | String (UUID) | Current active session token | `550e8400-e29b-...` |
| 12 | `registrationDate` | String (ISO) | Account creation timestamp | `2026-03-12T10:30:00.000Z` |
| 13 | `lastActiveTime` | String (ISO) | Last successful login / activity timestamp | `2026-03-12T14:00:00.000Z` |
| 14 | `registrationStatus` | String | Account status flag | `pending` / `approved` / `suspended` / `rejected` / `blocked` |
| 15 | `profilePhotoURL` | String | URL to uploaded profile photo (set only after approval) | `https://drive.google.com/...` |
| 16 | `role` | String | User role | `student` / `admin` |
| 17 | `approvedAt` | String (ISO) | Teacher approval timestamp | `2026-03-12T11:00:00.000Z` |
| 18 | `approvedBy` | String | Name of the approving admin | `Mrs. Gupta` |

**Primary Key:** `studentId`
**Unique Constraint:** `email` (enforced by application logic)

### 3.1.1 Photo Upload Rule — [v2 New]

> **CRITICAL BUSINESS RULE:** Photo upload is **prohibited** during the registration process.
>
> The `profilePhotoURL` field remains **empty** at registration time. A student may upload a profile photo **only after their account has been approved** by a teacher/administrator. This is enforced at both the frontend (no upload UI on register.html) and the backend (photo upload action validates `status === 'approved'` before accepting any upload).

### 3.1.2 Column Index Map (0-based, for backend script reference)

```javascript
const REG_COL = {
    STUDENT_ID:          0,   // studentId
    NAME:                1,   // studentName
    CLASS:               2,   // class
    SCHOOL:              3,   // school
    GENDER:              4,   // gender
    CONTACT_TYPE:        5,   // contactType
    CONTACT_NUMBER:      6,   // contactNumber
    EMAIL:               7,   // email
    HASH:                8,   // passwordHash
    SALT:                9,   // salt
    ACCESS_TOKEN:        10,  // accessToken (session)
    REGISTRATION_DATE:   11,  // registrationDate
    LAST_ACTIVE_TIME:    12,  // lastActiveTime
    STATUS:              13,  // registrationStatus
    PHOTO_URL:           14,  // profilePhotoURL
    ROLE:                15,  // role
    APPROVED_AT:         16,  // approvedAt
    APPROVED_BY:         17   // approvedBy
};
```

---

## 3.2 RESULTS Sheet — [v2 Updated]

Stores all practice set attempt records. Version 2 adds a `testId` field to uniquely identify each attempt and support multi-attempt tracking.

| # | Column Name | Data Type | Description | Example |
|---|-------------|-----------|-------------|---------|
| 1 | `id` | String | Foreign key → REGISTRATION.studentId | `STU_A1B2C3D4E5F6` |
| 2 | `name` | String | Student name (denormalized for readability) | `Rahul Sharma` |
| 3 | `subject` | String | Grammar subject identifier | `tenses` |
| 4 | `level` | String | Academic level | `primary` |
| 5 | `set` | String | Practice set number | `3` |
| 6 | `score` | Number | Number of correct answers | `12` |
| 7 | `totalMarks` | Number | Total questions in the set | `15` |
| 8 | `percentage` | Number | Score percentage (rounded integer) | `80` |
| 9 | `timeTaken` | Number | Time spent in seconds | `245` |
| 10 | `date` | String (ISO) | Attempt date and time | `2026-03-12T14:30:00.000Z` |
| 11 | `testId` | String | **[v2 New]** Unique identifier for this specific test attempt | `TEST_20260312_A1B2C3` |

**Foreign Key:** `id` → `REGISTRATION.studentId`

### 3.2.1 Test_ID Purpose and Format — [v2 New]

The `testId` field uniquely identifies **each individual test attempt**, enabling:

- **Multi-attempt tracking:** A student may attempt the same set multiple times; each attempt is a separate row with a unique `testId`
- **Duplicate detection:** The backend uses `testId` (replacing the v1 `timestamp`-based check) to prevent double-submission of the same attempt
- **Analytics:** Attempt history per set can be retrieved and compared

**Format:** `TEST_YYYYMMDD_XXXXXXXX` (date prefix + 8-character random alphanumeric)

**Generation (client-side):**
```javascript
function generateTestId() {
    const d = new Date();
    const dateStr = d.getFullYear().toString()
        + String(d.getMonth() + 1).padStart(2, '0')
        + String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `TEST_${dateStr}_${rand}`;
}
```

### 3.2.2 Column Index Map (0-based, for backend script reference)

```javascript
const RES_COL = {
    ID:          0,   // studentId
    NAME:        1,   // studentName
    SUBJECT:     2,   // subject
    LEVEL:       3,   // level
    SET:         4,   // set
    SCORE:       5,   // score
    TOTAL:       6,   // totalMarks
    PERCENTAGE:  7,   // percentage
    TIME_TAKEN:  8,   // timeTaken
    DATE:        9,   // date
    TEST_ID:     10   // testId [v2]
};
```

---

## 3.3 STUDENT_DETAILS Sheet

Stores extended student profile information. This sheet is retained for backward compatibility and supplementary data not covered by REGISTRATION.

| Column Name | Data Type | Description | Example |
|-------------|-----------|-------------|---------|
| `studentId` | String | Foreign key → REGISTRATION.studentId | `STU_A1B2C3D4E5F6` |
| `studentName` | String | Student name | `Rahul Sharma` |
| `schoolName` | String | Name of the student's school | `DPS Public School` |
| `className` | String | Class/grade of the student | `8` |
| `profileImageURL` | String | URL to profile photo | `https://...` |
| `guardianName` | String | Parent/guardian name | `Mr. Suresh Sharma` |
| `contactNumber` | String | Guardian contact number | `9876543210` |
| `address` | String | Student address | `Kolkata, West Bengal` |
| `createdAt` | String (ISO) | Record creation timestamp | `2026-03-12T10:30:00.000Z` |

> **Note:** In v2, most of these fields are now also captured in the REGISTRATION sheet at registration time. The STUDENT_DETAILS sheet remains for extended data and backward compatibility with v1-registered students.

---

## 3.4 Table Relationships

```
REGISTRATION (1) ──────────── (N) RESULTS
     │                                │
     │ studentId (id)                 │ id (studentId)
     │                                │ testId (unique per attempt)
     │
     └──── (1) STUDENT_DETAILS
                  │
                  │ studentId
```

- **REGISTRATION ↔ RESULTS:** One student → many result entries (one per attempt; multiple attempts per set supported via `testId`)
- **REGISTRATION ↔ STUDENT_DETAILS:** One-to-one for legacy extended profile data
- The client maintains a **best-score-per-set** view in `localStorage` while the RESULTS sheet stores the **full attempt history**

---

# 4. Registration System

## 4.1 Updated Registration Form Fields — [v2 Updated]

The registration form (`register.html`) must capture the following fields in this order:

| # | Field | UI Element | Validation | Notes |
|---|-------|------------|------------|-------|
| 1 | Name | Text input | Required, min 2 chars | Full name |
| 2 | Class | Dropdown | Required; values: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 | Academic class |
| 3 | School | Dropdown + "Other" | Required | Predefined school list with free-text fallback |
| 4 | Gender | Radio button | Required; values: Male / Female / Other | |
| 5 | Contact Type | Radio button | Required; values: Self / Parent | Who owns the contact number |
| 6 | Contact Number | Tel input | Required, 10-digit validation | |
| 7 | Gmail ID | Email input | Required, valid email format | Login credential |
| 8 | Password | Password input (hidden) | Required, min 6 chars | SHA-256 hashed before storage |
| 9 | Confirm Password | Password input (hidden) | Must match Password | Client-side check only |
| 10 | Submit Button | Button | Activates after all fields valid | "Register" / "Submitting…" |

**Fields set by the system (not the student):**

| Field | Set By | Value |
|-------|--------|-------|
| `studentId` | Server (auto-generated) | `STU_XXXXXXXXXXXX` |
| `accessToken` | Server (on login) | UUID |
| `registrationDate` | Server | ISO timestamp |
| `lastActiveTime` | Server (updated on each login) | ISO timestamp |
| `registrationStatus` | Server | `pending` (default) |
| `profilePhotoURL` | Student (post-approval only) | Upload URL |
| `role` | Server | `student` (default) |

## 4.2 Registration Flow — [v2 Updated]

```
Student visits register.html
        │
        ▼
Fills in: Name, Class, School, Gender, Contact Type,
          Contact Number, Gmail ID, Password, Confirm Password
        │
        ▼
Client-side validation:
  ├── All fields required
  ├── Email format (regex)
  ├── Password ≥ 6 characters
  ├── Passwords match
  └── Contact number = 10 digits
        │
        ▼
POST → Google Apps Script (action: 'register')
  Payload: { name, class, school, gender, contactType,
             contactNumber, email, password }
        │
        ├── Email already exists → Error: "Email already registered"
        │
        └── Success → New row added to REGISTRATION sheet
                       status = 'pending'
                       role = 'student'
                       passwordHash = SHA-256(salt + password)
                       registrationDate = now()
                       profilePhotoURL = '' (intentionally empty)
                       │
                       ▼
              Student sees: "Registration submitted. Await teacher approval."
```

## 4.3 Photo Upload Policy — [v2 New]

**Rule:** Profile photo upload is **strictly post-approval only.**

| Stage | Photo Upload |
|-------|-------------|
| During Registration | ❌ Not available — no upload UI shown |
| After Submission (pending) | ❌ Not available |
| After Approval (approved) | ✅ Upload enabled on Profile page |
| After Suspension/Rejection | ❌ Not available |

The backend `uploadPhoto` action must validate:
```
registrationStatus === 'approved'  →  proceed with upload
otherwise  →  reject with { success: false, code: 'NOT_APPROVED' }
```

## 4.4 Teacher Approval Flow

```
Teacher opens Google Sheet → REGISTRATION tab
        │
        ▼
Finds student with registrationStatus = 'pending'
        │
        ▼
Calls adminAction:
  POST { action: 'adminAction', studentId: 'STU_...', adminAction: 'approve', adminName: 'Mrs. Gupta' }
        │
        ▼
registrationStatus updated to 'approved'
approvedAt = now(), approvedBy = adminName
Photo upload now becomes available for the student
```

---

# 5. Result Storage System

## 5.1 Result Data Model — [v2 Updated]

When a student completes a practice set, the following result object is constructed client-side:

```javascript
const result = {
    id:          studentId,           // REGISTRATION.studentId
    name:        studentName,         // denormalized
    subject:     'tenses',            // subject identifier
    level:       'primary',           // level identifier
    set:         '3',                 // set number (string)
    score:       12,                  // correct answers
    totalMarks:  15,                  // total questions
    percentage:  80,                  // Math.round(score/totalMarks * 100)
    timeTaken:   245,                 // seconds
    date:        new Date().toISOString(),
    testId:      generateTestId()     // e.g. 'TEST_20260312_A1B2C3' [v2]
};
```

## 5.2 Dual Storage Strategy

Results are stored in **two complementary structures** in localStorage:

### 5.2.1 Best-Score Store (`grammarhub_progress_v2`)

Keyed by `subject → level → set`. Retains only the **best percentage** per set. Used for all UI rendering (dashboard stats, level view, profile analytics).

```javascript
{
  "tenses": {
    "primary": {
      "3": { score: 12, total: 15, percentage: 80, timeTaken: 245, date: "...", testId: "TEST_..." }
    }
  },
  "_meta": {
    "lastAttempted": { subject, level, set, percentage, date, timestamp }
  }
}
```

### 5.2.2 Full Attempt History (`grammarhub_results_cache`) — [v2 New]

Flat array of all result objects (most recent first). Used by the Profile page to show history and by the Refresh system to compare against cloud data.

```javascript
[
  { id, name, subject, level, set, score, totalMarks, percentage, timeTaken, date, testId },
  ...
]
```

## 5.3 Best Score vs. Attempt History

| Store | Key | Purpose | Updated When |
|-------|-----|---------|--------------|
| `grammarhub_progress_v2` | subject/level/set | UI rendering, stats, level progress | New attempt has higher percentage |
| `grammarhub_results_cache` | flat array | Profile history, refresh comparison | Every attempt (unconditionally) |
| Google Sheets RESULTS | flat rows | Cloud record, admin visibility | Every attempt via background sync |

---

# 6. Performance Optimization Strategy

## 6.1 Design Principle — [v2 Updated]

> **Core Rule:** Google Sheets is queried **once per login**. All subsequent data reads come from localStorage.

This ensures:
- **Sub-millisecond** page render times after initial login
- **Reduced Google Apps Script execution quota** consumption
- **Resilience** to network intermittency after login

## 6.2 Fetch-Once Strategy

| Event | Action |
|-------|--------|
| Login success | Fetch REGISTRATION row + all RESULTS rows for that `studentId` from Google Sheets |
| Data received | Store in `grammarhub_student_data` and `grammarhub_results_cache` / `grammarhub_progress_v2` |
| Dashboard load | Read directly from `grammarhub_progress_v2` (0 backend calls) |
| Subject/Level page | Read directly from `grammarhub_progress_v2` (0 backend calls) |
| Profile page load | Read from `grammarhub_student_data` + `grammarhub_results_cache` (0 backend calls) |
| Profile Refresh button | Single targeted fetch from Google Sheets, update localStorage |
| Result submission | Write to localStorage immediately, then async background sync to Google Sheets |

## 6.3 Backend Query Optimization — [v2 Updated]

All Google Apps Script queries that look up a student use **TextFinder** for indexed searching:

```javascript
// TextFinder-based row lookup — avoids full sheet scan
function _findRowByColumn(sheet, colIndex, value) {
    const finder = sheet.createTextFinder(String(value)).matchEntireCell(true);
    const cell = finder.findNext();
    if (!cell) return null;
    const row = cell.getRow();
    return {
        rowIndex: row,
        values: sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0]
    };
}
```

This provides **O(log n)-like** lookup performance compared to full-sheet scans.

## 6.4 Session-Level Spreadsheet Cache

The Google Apps Script backend caches the Spreadsheet object at execution level:

```javascript
let _cachedSS = null;
function _getSS() {
    if (!_cachedSS) _cachedSS = SpreadsheetApp.openById(SHEET_ID);
    return _cachedSS;
}
```

This eliminates repeated `openById` calls within a single request execution.

## 6.5 Client-Side Performance Measures

| Measure | Implementation |
|---------|----------------|
| **Parallel config loading** | All subject configs loaded via `Promise.allSettled()` simultaneously |
| **In-flight deduplication** | Concurrent identical API requests share the same promise (`_inflight` Map) |
| **localStorage-first rendering** | Every page renders immediately from cache; backend sync is background-only |
| **Prefetch on login** | `Progress.prefetchDashboardData()` called with 3-second timeout during login redirect |
| **Session cache** | `sessionStorage` used for within-session deduplication of profile data |

---

# 7. Local Storage Caching Architecture

## 7.1 Storage Keys Reference — [v2 Updated]

| Key | Type | Contents | Written By | Read By |
|-----|------|----------|------------|---------|
| `grammarhub_progress_v2` | Object | Best-score map (subject→level→set) + `_meta` | `progress.js` | `app.js`, `profile.js`, `engine.js` |
| `grammarhub_results_cache` | Array | Flat list of all attempt records (with `testId`) | `progress.js` (login sync) | `profile.js` |
| `grammarhub_student_data` | Object | Registration profile (name, class, school, gender, photo URL, role) | `login.js` (login sync) | `profile.js`, `auth-guard.js` |
| `grammarhub_session` | Object | Auth session (studentId, token, loginAt, expiry) | `auth-guard.js` | `auth-guard.js`, `api.js` |
| `grammarhub_student_id` | String | Student ID shortcut for API calls | `api.js` | `api.js`, `engine.js` |
| `grammarhub_sync_queue` | Array | Offline queue of unsynced result payloads | `api.js` | `api.js` |

## 7.2 Data Lifecycle

```
LOGIN
  ├── auth-guard.js → writes grammarhub_session
  ├── login.js → calls fetchStudentData(studentId)
  │     ├── Fetches REGISTRATION row → writes grammarhub_student_data
  │     └── Fetches RESULTS rows → writes grammarhub_results_cache
  │                                  + merges into grammarhub_progress_v2
  └── redirect to index.html

PAGE LOAD (any page)
  └── auth-guard.js → reads grammarhub_session (local check only)

DASHBOARD / SUBJECT / LEVEL PAGES
  └── app.js → reads grammarhub_progress_v2 (zero backend calls)

PRACTICE ENGINE
  ├── engine.js → reads set JSON file
  ├── On submit → progress.js.saveResult() → writes grammarhub_progress_v2
  │                                         → writes grammarhub_results_cache
  └── api.js.syncResult() → POST to backend (background, non-blocking)

PROFILE PAGE
  ├── profile.js → reads grammarhub_student_data + grammarhub_results_cache
  │                (instant render, no backend)
  └── On Refresh button → fetchStudentResults(studentId)
        ├── GET results from Google Sheets
        ├── Overwrites grammarhub_results_cache
        ├── Merges into grammarhub_progress_v2
        └── Re-renders profile stats

LOGOUT
  └── auth-guard.js → clears grammarhub_session (session only — progress preserved)
```

## 7.3 Cache Invalidation Rules

| Scenario | Action |
|----------|--------|
| New login | Full refresh of `grammarhub_student_data` and `grammarhub_results_cache` |
| Profile Refresh button | Refresh `grammarhub_results_cache` and re-merge into `grammarhub_progress_v2` |
| Result submission | Immediate write to local stores; background sync to Sheets |
| Logout | Clear `grammarhub_session` only — progress data is retained for next login |
| localStorage quota exceeded | Silent skip with console warning; no crash |
| Corrupted data (parse error) | `try/catch` fallback returns empty object/array |

---

# 8. Login Data Synchronization Flow

## 8.1 Login Sequence — [v2 Updated]

```
Student enters email + password on login.html
        │
        ▼
Client-side validation (email format, min 4 chars)
        │
        ▼
POST → Backend { action: 'login', email, password }
        │
        ├── Rate limited (5+ attempts/5min) → "Too many attempts"
        ├── status = pending → "Account pending approval"
        ├── status = suspended/rejected/blocked → Appropriate message
        ├── Wrong credentials → "Invalid email or password"
        │
        └── Success:
              ├── Server generates UUID access token
              ├── Updates lastActiveTime in REGISTRATION sheet
              ├── Stores token in accessToken column
              └── Returns: { studentId, studentName, email, accessToken,
                             class, school, gender, contactType, contactNumber,
                             role, registrationDate, profilePhotoURL }
                    │
                    ▼
              createSession(studentId, token, email)
              → writes grammarhub_session to localStorage
                    │
                    ▼
              [v2] fetchStudentData(studentId):
                ├── Fetch REGISTRATION profile row (from login response — no extra call needed)
                │     └── Store in grammarhub_student_data
                └── GET → Backend { action: 'getStudentResults', id: studentId }
                      └── Returns all RESULTS rows for that studentId
                            └── Store flat list in grammarhub_results_cache
                            └── Merge into grammarhub_progress_v2 (keep best scores)
                    │
                    ▼
              loginBtn.textContent = 'Preparing dashboard…'
              (3-second timeout max — non-blocking)
                    │
                    ▼
              Redirect to index.html
```

## 8.2 Login Response Payload — [v2 Updated]

The backend login response now includes the full student profile to avoid a second HTTP call:

```json
{
  "success": true,
  "studentId": "STU_A1B2C3D4E5F6",
  "studentName": "Rahul Sharma",
  "email": "rahul@gmail.com",
  "accessToken": "550e8400-e29b-41d4-a716-446655440000",
  "class": "8",
  "school": "DPS Public School",
  "gender": "Male",
  "contactType": "Parent",
  "contactNumber": "9876543210",
  "role": "student",
  "registrationDate": "2026-03-12T10:30:00.000Z",
  "profilePhotoURL": ""
}
```

## 8.3 Student Data Stored in localStorage After Login

```javascript
// grammarhub_student_data
{
  "studentId": "STU_A1B2C3D4E5F6",
  "studentName": "Rahul Sharma",
  "email": "rahul@gmail.com",
  "class": "8",
  "school": "DPS Public School",
  "gender": "Male",
  "contactType": "Parent",
  "contactNumber": "9876543210",
  "role": "student",
  "registrationDate": "2026-03-12T10:30:00.000Z",
  "profilePhotoURL": "",
  "fetchedAt": 1773508200000
}
```

---

# 9. Result Synchronization Flow

## 9.1 Full Result Sync Pipeline — [v2 Updated]

```
Student answers all questions → Submit button clicked
        │
        ▼
engine.js calculates result:
  score, totalMarks, percentage, timeTaken
  testId = generateTestId()   [v2 — new unique attempt ID]
        │
        ▼
Result stored LOCALLY (synchronous, instant):
  ├── progress.js.saveResult() → grammarhub_progress_v2 (best score merge)
  └── progress.js.appendResultHistory() → grammarhub_results_cache (all attempts)
        │
        ▼
UI renders result immediately (score card, confetti, PDF unlock)
        │
        ▼
api.js.syncResult(resultPayload) — BACKGROUND (non-blocking async):
        │
        ├── BACKEND_URL configured?
        │     No → skip sync (localStorage-only mode)
        │     Yes ↓
        │
        ▼
POST → Google Apps Script { action: 'saveResult', ...resultPayload }
        │
        ├── Success → Result row appended to RESULTS sheet
        │             { id, name, subject, level, set, score,
        │               totalMarks, percentage, timeTaken, date, testId }
        │
        └── Failure (network/timeout) → Payload queued in grammarhub_sync_queue
              └── Retry attempted on next page load (max 3 attempts)
```

## 9.2 Duplicate Detection — [v2 Updated]

In v2, the backend uses `testId` as the primary duplicate detection key, replacing the v1 `timestamp` approach:

```javascript
// Backend: check for existing row with same testId
const finder = resultsSheet.createTextFinder(data.testId).matchEntireCell(true);
const found = finder.findNext();
if (found) {
    return _jsonResponse({ success: true, message: 'Duplicate — already saved.' });
}
```

This is more reliable because `testId` is generated once per quiz session and persists in localStorage with the result object.

## 9.3 Offline Queue Behavior

| State | Behavior |
|-------|----------|
| Backend unreachable | Result saved locally; payload added to `grammarhub_sync_queue` |
| Queue item retry | Attempted on next `api.js` initialization (page load) |
| Max retries (3) reached | Item dropped from queue with console warning |
| Student logs in on different device | Local data may differ until next Refresh |

---

# 10. Profile Refresh System

## 10.1 Refresh Feature Overview — [v2 New]

A **Refresh Button** is added to `profile.html`. Its purpose is to allow students to pull the latest result data from Google Sheets and update their local cache and displayed statistics.

**Trigger conditions for manual refresh:**
- Student completed a test on another device
- Student suspects local data is stale
- Initial login fetch was interrupted by timeout

## 10.2 Refresh Button UI Specification

| Property | Value |
|----------|-------|
| **Location** | Profile page header, near stats summary |
| **Label** | "↻ Refresh" or "Sync Latest Data" |
| **Loading State** | Button disabled, spinner shown, label → "Refreshing…" |
| **Success State** | Button re-enabled, stats re-rendered, brief "Updated!" flash |
| **Error State** | Button re-enabled, toast: "Unable to refresh. Showing cached data." |

## 10.3 Refresh Flow

```
Student clicks Refresh button on profile.html
        │
        ▼
Button disabled → spinner shown → "Refreshing…"
        │
        ▼
GET → Backend { action: 'getStudentResults', id: studentId }
        │
        ├── Failure (network error):
        │     └── Show error toast → re-enable button
        │
        └── Success:
              Receives: array of all result rows for this student
                    │
                    ▼
              Overwrites grammarhub_results_cache with fresh data
                    │
                    ▼
              Merges fresh results into grammarhub_progress_v2
              (keep best scores — same merge logic as login sync)
                    │
                    ▼
              profile.js re-renders:
                ├── Overall stats (avg score, sets completed, best subject, total time)
                ├── Per-subject breakdown cards
                └── Recent activity timeline
                    │
                    ▼
              Button re-enabled → "Updated!" state → revert to "↻ Refresh"
```

## 10.4 Backend: getStudentResults Endpoint — [v2 New]

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `BACKEND_URL?action=getStudentResults&id=STU_...` |
| **Response** | Array of result objects for the given studentId |

```json
{
  "success": true,
  "results": [
    {
      "id": "STU_A1B2C3D4E5F6",
      "name": "Rahul Sharma",
      "subject": "tenses",
      "level": "primary",
      "set": "3",
      "score": 12,
      "totalMarks": 15,
      "percentage": 80,
      "timeTaken": 245,
      "date": "2026-03-12T14:30:00.000Z",
      "testId": "TEST_20260312_A1B2C3"
    }
  ]
}
```

---

# 11. Concurrency Handling

## 11.1 Target Load — [v2 New]

The system is designed to support **20–30 users logging in and using the platform simultaneously** without degraded performance or data corruption.

## 11.2 Concurrency Sources and Mitigation

| Source | Risk | Mitigation |
|--------|------|------------|
| Simultaneous logins (20–30) | Google Apps Script execution throttling | TextFinder-based targeted reads (not full-sheet scans); CacheService rate limiting per email |
| Concurrent result saves | Row collision / lost writes | `appendRow()` is atomic in Google Sheets; no row overwrite occurs |
| Parallel session validation | Stale token reads | Session token is written on login, read on checkSession; Apps Script execution is single-threaded per instance |
| Multiple devices (same student) | Data divergence | Single-device enforcement: new login overwrites `accessToken` and invalidates previous session |
| Client-side parallel requests | Race conditions | `_inflight` Map deduplicates identical in-flight API requests |

## 11.3 Google Apps Script Execution Model

Google Apps Script processes each incoming request in a **separate execution context**. Key facts:

- Each `doGet()` / `doPost()` invocation runs independently
- No shared mutable state between executions
- `CacheService` is shared across executions (used for rate limiting)
- `SpreadsheetApp.openById()` is execution-scoped; the `_cachedSS` cache applies within a single request only

For 20–30 concurrent users, the primary bottleneck is Google Apps Script's **quota limit** (not a threading issue). The following strategies minimize per-request execution time:

1. **TextFinder lookups** instead of `getValues()` full scans on login
2. **Login response includes full profile** — eliminates the second API call per login
3. **localStorage-first architecture** — only login and explicit refresh hit the backend
4. **Result sync is async and non-blocking** — does not affect the student UI

## 11.4 Quota Awareness

| Quota | Limit | Current Usage Pattern |
|-------|-------|-----------------------|
| Apps Script executions/day | 20,000 | ~3 calls per student session (login, result save, optional refresh) |
| Execution duration | 6 min max | All handlers complete in < 5 seconds |
| UrlFetch calls/day | 20,000 | N/A (not used) |
| Spreadsheet read/write | Unlimited | Minimized via TextFinder + login-time fetch strategy |

---

# 12. Backend API Reference

## 12.1 Architecture Notes

All API communication uses a single Google Apps Script Web App endpoint. The `action` field in the request body (POST) or URL parameter (GET) determines the operation.

**Base URL:** Defined in `backend/api.js` as `BACKEND_URL`
**Protocol:** HTTPS (enforced by Google)
**Format:** JSON request body (POST) / query parameters (GET)
**CORS:** Handled automatically by Google Apps Script

---

## 12.2 POST Endpoints

### 12.2.1 Login — [v2 Updated]

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `login` |
| **Request Body** | `{ "action": "login", "email": "student@gmail.com", "password": "pass123" }` |

**Success Response (v2):**
```json
{
  "success": true,
  "studentId": "STU_A1B2C3D4E5F6",
  "studentName": "Rahul Sharma",
  "email": "rahul@gmail.com",
  "accessToken": "550e8400-e29b-41d4-a716-446655440000",
  "class": "8",
  "school": "DPS Public School",
  "gender": "Male",
  "contactType": "Parent",
  "contactNumber": "9876543210",
  "role": "student",
  "registrationDate": "2026-03-12T10:30:00.000Z",
  "profilePhotoURL": ""
}
```

**Error Codes:**

| Code | Scenario |
|------|----------|
| `MISSING_FIELDS` | Email or password not provided |
| `RATE_LIMITED` | 5+ failed attempts in 5 minutes |
| `INVALID_CREDENTIALS` | Wrong email or password |
| `ACCOUNT_PENDING` | Account awaiting approval |
| `ACCOUNT_SUSPENDED` | Account suspended |
| `ACCOUNT_REJECTED` | Account rejected |
| `ACCOUNT_BLOCKED` | Account blocked |

---

### 12.2.2 Register — [v2 Updated]

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `register` |
| **Request Body** | `{ "action": "register", "name": "Rahul Sharma", "class": "8", "school": "DPS Public School", "gender": "Male", "contactType": "Parent", "contactNumber": "9876543210", "email": "rahul@gmail.com", "password": "pass123" }` |

**Success Response:**
```json
{
  "success": true,
  "message": "Registration submitted. Await teacher approval."
}
```

**Error Codes:** `MISSING_FIELDS`, `WEAK_PASSWORD` (< 6 chars), `EMAIL_EXISTS`, `INVALID_CONTACT`

---

### 12.2.3 Save Result — [v2 Updated]

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `saveResult` |
| **Request Body** | `{ "action": "saveResult", "id": "STU_...", "name": "Rahul", "subject": "tenses", "level": "primary", "set": "3", "score": 12, "totalMarks": 15, "percentage": 80, "timeTaken": 245, "date": "2026-03-12T14:30:00Z", "testId": "TEST_20260312_A1B2C3" }` |

**Success Response:**
```json
{ "success": true, "message": "Result saved." }
```

**Duplicate Response:**
```json
{ "success": true, "message": "Duplicate — already saved." }
```

**Error Codes:** `MISSING_FIELDS`, `STUDENT_NOT_FOUND`, `NOT_VERIFIED`, `SHEET_NOT_FOUND`

---

### 12.2.4 Check Session

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `checkSession` |
| **Request Body** | `{ "action": "checkSession", "studentId": "STU_...", "accessToken": "uuid-token" }` |

**Success Response:**
```json
{ "success": true }
```

**Failure Response (another device logged in):**
```json
{ "success": false, "reason": "session_invalid" }
```

---

### 12.2.5 Logout

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `logout` |
| **Request Body** | `{ "action": "logout", "studentId": "STU_..." }` |

**Response:**
```json
{ "success": true }
```

---

### 12.2.6 Validate Session

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `validateSession` |
| **Request Body** | `{ "action": "validateSession", "studentId": "STU_...", "token": "...", "loginAt": 1773508200000 }` |

**Response:**
```json
{ "success": true, "verified": true }
```

---

### 12.2.7 Upload Photo — [v2 New]

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `uploadPhoto` |
| **Request Body** | `{ "action": "uploadPhoto", "studentId": "STU_...", "accessToken": "...", "photoURL": "https://..." }` |

**Precondition:** `registrationStatus === 'approved'`

**Success Response:**
```json
{ "success": true, "profilePhotoURL": "https://..." }
```

**Error Codes:** `NOT_APPROVED`, `INVALID_TOKEN`, `MISSING_FIELDS`

---

### 12.2.8 List Students (Admin)

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `listStudents` |
| **Request Body** | `{ "action": "listStudents", "statusFilter": "pending" }` |

**Valid filters:** `pending`, `approved`, `suspended`, `rejected`, `all`

---

### 12.2.9 Admin Action

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **Action** | `adminAction` |
| **Request Body** | `{ "action": "adminAction", "studentId": "STU_...", "adminAction": "approve", "adminName": "Mrs. Gupta" }` |

**Valid actions:** `approve`, `reject`, `suspend`, `delete`

**Response:**
```json
{
  "success": true,
  "message": "Student approved successfully.",
  "studentId": "STU_...",
  "newStatus": "approved"
}
```

---

## 12.3 GET Endpoints

### 12.3.1 Get Student Results — [v2 New]

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `BACKEND_URL?action=getStudentResults&id=STU_...` |

Returns all result records for the specified student (used at login and by Profile Refresh).

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "STU_A1B2C3D4E5F6",
      "name": "Rahul Sharma",
      "subject": "tenses",
      "level": "primary",
      "set": "3",
      "score": 12,
      "totalMarks": 15,
      "percentage": 80,
      "timeTaken": 245,
      "date": "2026-03-12T14:30:00.000Z",
      "testId": "TEST_20260312_A1B2C3"
    }
  ]
}
```

---

### 12.3.2 Get Progress (Legacy)

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `BACKEND_URL?action=getProgress&id=STU_...` |

Returns progress in the structured `subject → level → set` format (retained for backward compatibility).

---

### 12.3.3 Get Profile (Legacy)

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `BACKEND_URL?action=getProfile&id=STU_...` |

Returns extended profile from STUDENT_DETAILS (retained for backward compatibility).

---

### 12.3.4 Health Check

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `BACKEND_URL` (no action parameter) |

**Response:**
```json
{
  "status": "ok",
  "message": "EnglishJibi Backend Active",
  "timestamp": "2026-03-12T10:00:00.000Z",
  "version": "2.0"
}
```

---

# 13. Data Flow Diagrams

## 13.1 System-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         STUDENT (Browser)                       │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌───────────┐  │
│  │ login.html│  │ index.html│  │practice.html│  │profile.html│ │
│  └────┬─────┘  └─────┬─────┘  └──────┬──────┘  └─────┬─────┘  │
│       │               │               │                │        │
│       ▼               ▼               ▼                ▼        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    localStorage                         │    │
│  │  grammarhub_session | grammarhub_student_data           │    │
│  │  grammarhub_progress_v2 | grammarhub_results_cache      │    │
│  │  grammarhub_sync_queue                                  │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                                │ (on login / refresh / sync)    │
└────────────────────────────────┼────────────────────────────────┘
                                 │ HTTPS POST/GET
                                 ▼
                    ┌────────────────────────┐
                    │   Google Apps Script   │
                    │   doPost() / doGet()   │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │      Google Sheets     │
                    │                        │
                    │  REGISTRATION          │
                    │  RESULTS               │
                    │  STUDENT_DETAILS       │
                    └────────────────────────┘
```

## 13.2 Login Data Flow — [v2]

```
[login.html]
    │ email + password
    ▼
[api.js] POST /login
    │
    ▼
[Google Apps Script: _handleLogin]
    │ TextFinder lookup in REGISTRATION by email
    │ Verify password hash
    │ Generate new accessToken
    │ Update lastActiveTime + accessToken in sheet
    │
    ▼
Response: { studentId, name, email, accessToken,
            class, school, gender, role, photo... }
    │
    ▼
[login.js] createSession() → grammarhub_session
    │
    ▼
[login.js] Store profile → grammarhub_student_data
    │
    ▼
[login.js] GET /getStudentResults → grammarhub_results_cache
    │        + merge into grammarhub_progress_v2
    │
    ▼
Redirect → index.html (renders from localStorage instantly)
```

## 13.3 Result Submission Flow — [v2]

```
[practice.html: engine.js]
    │ Quiz complete → calculate score + generate testId
    ▼
[progress.js] saveResult() → grammarhub_progress_v2 (best score)
[progress.js] appendHistory() → grammarhub_results_cache (all attempts)
    │ (synchronous — instant)
    ▼
UI renders result immediately
    │
    ▼ (async, background)
[api.js] POST /saveResult { ...result, testId }
    │
    ├── Success → row in RESULTS sheet
    └── Failure → push to grammarhub_sync_queue
                    └── retry on next page load (max 3 attempts)
```

## 13.4 Profile Refresh Flow — [v2]

```
[profile.html]
    │ Page loads
    ▼
[profile.js] reads grammarhub_student_data → render profile card
[profile.js] reads grammarhub_results_cache → render stats + history
    │ (instant, no backend)
    ▼
Student clicks [↻ Refresh] button
    │
    ▼
[api.js] GET /getStudentResults?id=STU_...
    │
    ├── Error → toast "Unable to refresh. Showing cached data."
    │
    └── Success → overwrite grammarhub_results_cache
                  → merge into grammarhub_progress_v2
                  → profile.js re-renders all stats
```

---

# 14. Security Model

## 14.1 Authentication — [v2 Updated]

| Measure | Implementation |
|---------|----------------|
| **Password Hashing** | SHA-256 with unique random 16-character salt per user |
| **No Plain-Text Storage** | Passwords never stored in plain text — only hash + salt |
| **Session Tokens** | UUID-based access tokens (`Utilities.getUuid()`) issued on login |
| **Single-Device Enforcement** | Each login overwrites `accessToken` — only the latest device is valid |
| **Session Expiry** | Client-side sessions expire after 24 hours |
| **Server-Side Validation** | Token verified against `accessToken` in REGISTRATION sheet every 2 minutes |
| **Field Name: accessToken** | Renamed from `activeSessionToken` (v1) → `accessToken` (v2) for consistency with expanded field set |

## 14.2 Authorization

| Measure | Implementation |
|---------|----------------|
| **Auth Guard** | Every protected page imports `auth-guard.js` — immediate redirect if no valid session |
| **Status Checking** | Login verifies `registrationStatus === 'approved'` before granting access |
| **Result Verification** | `saveResult` verifies student exists and is approved before persisting |
| **Photo Upload Guard** | `uploadPhoto` verifies `registrationStatus === 'approved'` before accepting any photo |

## 14.3 Rate Limiting

| Measure | Implementation |
|---------|----------------|
| **Login Rate Limit** | Maximum 5 login attempts per email per 5-minute window (server-side via `CacheService`) |
| **Re-submission Guard** | Practice engine locks after first submission — no double-submit within a session |
| **testId Deduplication** | Backend rejects duplicate result submissions via `testId` TextFinder check |

## 14.4 Input Validation

| Measure | Implementation |
|---------|----------------|
| **URL Parameter Validation** | `getParams()` validates subject (alphanumeric), level (whitelist), set (positive integer) |
| **XSS Prevention** | `escapeHTML()` sanitizes all user-provided strings before DOM injection |
| **Email Validation** | Client-side regex + server-side normalization (trim + lowercase) |
| **Password Minimum** | 6-character minimum enforced on both client and server |
| **Contact Number Validation** | 10-digit numeric check on client and server (v2 new field) |
| **School/Class Validation** | Enforced as dropdown selections on client; server validates non-empty |
| **Question Validation** | `validateQuestions()` filters malformed entries from JSON files |

## 14.5 Data Protection

| Measure | Implementation |
|---------|----------------|
| **HTTPS** | Google Apps Script Web Apps are always served over HTTPS |
| **No Credential Exposure** | Session tokens are UUIDs — not the password hash |
| **LocalStorage Isolation** | Browser same-origin policy protects all localStorage data |
| **Generic Error Messages** | Invalid credentials do not reveal whether the email exists |
| **Photo Upload Validation** | Photo URL validated before being written to REGISTRATION sheet |

## 14.6 Backup Strategy

| Measure | Implementation |
|---------|----------------|
| **Google Sheets Version History** | All sheet edits are versioned automatically by Google Drive |
| **Dual Storage** | Progress exists in both localStorage and Google Sheets — either can recover the other |
| **Offline Queue** | Results that fail to sync are queued and retried (up to 3 attempts) |
| **Full Attempt History** | RESULTS sheet stores every attempt (not just best) — full audit trail |

---

# 15. Version 2 Technical Summary

## 15.1 System Specifications

| Attribute | Value |
|-----------|-------|
| **Project Name** | EnglishJibi Student Panel Pro |
| **Version** | 2.0 |
| **Type** | Web-based Grammar Practice Platform |
| **Frontend** | HTML5, Tailwind CSS (CDN), Vanilla JavaScript (ES6 Modules) |
| **Backend** | Google Apps Script (serverless) |
| **Database** | Google Sheets (3 sheets: REGISTRATION, RESULTS, STUDENT_DETAILS) |
| **Authentication** | Email/password with SHA-256 hashing, UUID access tokens, single-device enforcement |
| **Quiz Engines** | MCQ (Multiple Choice) and Fill-in-the-Blank |
| **Live Subjects** | Tenses (MCQ engine), SVA (Fill engine) — expandable to 12+ subjects |
| **Academic Levels** | Pre-Primary, Primary, Middle, High |
| **Student Classes** | 1–10 (captured at registration) |
| **Progress Storage** | Dual — localStorage (offline-first, primary) + Google Sheets (cloud sync, secondary) |
| **Session Management** | 24-hour expiry, server-authoritative token validation every 2 minutes |
| **Offline Support** | Offline result queue with automatic retry (max 3 attempts) |
| **Security** | Rate limiting, input validation, XSS prevention, HTTPS, password hashing, photo upload guard |
| **Concurrent Users** | Designed for 20–30 simultaneous users |
| **Result Tracking** | Per-attempt `testId` enabling full attempt history + best-score UI view |
| **Profile Photo** | Post-approval upload only; stored as URL in REGISTRATION sheet |
| **Profile Refresh** | Manual Refresh button syncs latest results from Google Sheets to localStorage |
| **Login Data Fetch** | Full profile + all results fetched once at login; cached in localStorage |
| **Responsive Design** | Mobile-first, works on phones, tablets, and desktops |
| **Hosting Cost** | Zero (static hosting + Google Apps Script free tier) |
| **Total HTML Pages** | 8 (index, subject, level, practice, profile, login, register, setup-guide) |
| **Total JS Modules** | 7 (app, engine, progress, auth-guard, login, register, profile) + 2 backend files |
| **Dependencies** | Zero npm dependencies — all libraries loaded via CDN |
| **Developer** | Subham Kumar Mallick |
| **Year** | 2026 |

## 15.2 Version 2 Changes Summary

| # | Category | Change |
|---|----------|--------|
| 1 | Registration | Added 6 new fields: Class, School, Gender, Contact Type, Contact Number, Role |
| 2 | Registration | Photo upload deferred to post-approval stage |
| 3 | REGISTRATION Sheet | Expanded from 12 to 18 columns; column indices updated |
| 4 | RESULTS Sheet | Added `testId` column (col 11); renamed fields to `id`, `totalMarks` for clarity |
| 5 | Login Response | Now returns full profile data (eliminates second API call per login) |
| 6 | Login Sync | On login, fetches and caches both profile data and all results for the student |
| 7 | localStorage | Added `grammarhub_student_data` and `grammarhub_results_cache` stores |
| 8 | Profile Page | Renders from localStorage (no backend call on page load) |
| 9 | Profile Page | Added Refresh button with `getStudentResults` API call |
| 10 | Result Submission | `testId` generated per attempt; used for duplicate detection (replaces timestamp) |
| 11 | Backend GET | New `getStudentResults` endpoint returns flat results array for a student |
| 12 | Backend POST | New `uploadPhoto` endpoint (post-approval only) |
| 13 | Backend POST | `register` action now accepts class, school, gender, contactType, contactNumber |
| 14 | Backend POST | `login` action now returns full profile fields in response |
| 15 | Concurrency | Documented design for 20–30 concurrent users; TextFinder + caching strategy |
| 16 | Health Check | Version field added to health check response |

## 15.3 Backward Compatibility Notes

- **v1 students** (registered without new fields) will have empty values for `class`, `school`, `gender`, `contactType`, `contactNumber` — the UI must handle empty strings gracefully
- **v1 RESULTS rows** (without `testId`) will have an empty column 11 — the backend and client must treat empty `testId` as valid (no duplicate check for legacy rows)
- **`activeSessionToken`** (v1 column name) has been renamed to `accessToken` in v2 — the backend script must be updated to use the new column index map; the old `REG_COL.SESSION_TOKEN` reference must be replaced with `REG_COL.ACCESS_TOKEN`
- **`getProgress`** and **`getProfile`** GET endpoints are retained as legacy endpoints; new code should use `getStudentResults` which returns the richer v2 data shape

---

> *This document represents the complete technical specification for EnglishJibi Student Panel Pro Version 2.0. For deployment instructions, refer to the `setup-guide.html` page included in the project. For Version 1.0 reference, see `PROJECT-DOCUMENTATION.md`.*
>
> *Document maintained by: Subham Kumar Mallick — EnglishJibi Classes — 2026*
