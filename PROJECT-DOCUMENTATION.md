# Project Documentation — EnglishJibi Student Panel Pro

> **Version:** 1.0 (patched March 2026)  
> **Last Updated:** March 2026  
> **Author:** Subham Kumar Mallick  
> **Organization:** EnglishJibi Classes

---

# 1. Project Overview

## 1.1 Project Purpose

**EnglishJibi Student Panel Pro** is an interactive, web-based English grammar practice platform designed for students across multiple academic levels. It provides structured practice sets covering essential grammar topics such as Tenses, Subject-Verb Agreement (SVA), Narration, Voice, Articles, Prepositions, and more.

## 1.2 Problem It Solves

Traditional English grammar education often lacks:

- **Structured, level-wise practice** tailored to student ability
- **Instant feedback** on grammar exercises with answer validation
- **Progress tracking** so students and teachers can monitor improvement over time
- **Accessibility** — students need a platform they can access from any device, anytime

This platform addresses all of the above by providing a self-paced, mobile-responsive practice environment with built-in progress tracking and backend synchronization.

## 1.3 Target Users

| User Type | Description |
|-----------|-------------|
| **Students** | Primary, Middle, and High school students learning English grammar |
| **Teachers / Administrators** | Educators at EnglishJibi Classes who manage student accounts and monitor progress |
| **Guardians** | Parents or guardians who may review their child's progress |

## 1.4 Real-World Use Case

A teacher at EnglishJibi Classes assigns grammar practice sets to students. Students log in from their phones or computers, select a subject (e.g., Tenses), choose their level (e.g., Primary), and work through MCQ or fill-in-the-blank practice sets. Upon completion, scores are recorded both locally and on the cloud. The teacher can view all student scores via a Google Sheet, track who needs extra help, and approve new registrations.

## 1.5 Expected Benefits

- **For Students:** Self-paced grammar practice with immediate feedback, score tracking, and achievement unlocking
- **For Teachers:** Centralized view of all student results, account management, and curriculum control
- **For the Institution:** Scalable, low-cost digital practice platform with no server hosting fees (uses Google Apps Script)
- **Offline Resilience:** Students can continue practicing even with intermittent connectivity; results sync when online

---

# 2. Project Objectives

1. **Provide structured grammar practice** organized by subject, level (Pre-Primary, Primary, Middle, High), and numbered sets
2. **Support dual quiz engines** — Multiple Choice (MCQ) and Fill-in-the-Blank — configurable per subject
3. **Implement secure student authentication** with email/password login, session tokens, and single-device enforcement
4. **Track and persist student progress** using both localStorage (offline-first) and Google Sheets (cloud sync)
5. **Enable teacher-controlled registration** with an approval workflow (pending → approved → suspended/rejected)
6. **Deliver a responsive, modern UI** that works seamlessly on mobile phones, tablets, and desktops
7. **Achieve zero-cost hosting** by using static file hosting and Google Apps Script as a serverless backend
8. **Support offline-first functionality** with an offline queue that retries failed result submissions automatically

---

# 3. System Architecture

## 3.1 Architecture Overview

The system follows a **static frontend + serverless backend** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
│                                                             │
│  HTML Pages ──► JS Modules (ES6) ──► localStorage           │
│     │               │                     │                 │
│     │               ▼                     │                 │
│     │          backend/api.js             │                 │
│     │               │                     │                 │
│     ▼               ▼                     ▼                 │
│  Tailwind CSS   Google Apps Script    Offline Queue         │
│  (CDN)          (HTTPS REST API)     (localStorage)         │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
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

## 3.2 Frontend Technologies

| Technology | Purpose |
|------------|---------|
| **HTML5** | Page structure and semantic markup |
| **Tailwind CSS (CDN)** | Utility-first CSS framework for responsive design |
| **Custom CSS** (`styles.css`) | Design tokens, glassmorphism effects, custom animations |
| **Vanilla JavaScript (ES6 Modules)** | Application logic — no frameworks, pure modular JS |
| **Inter (Google Fonts)** | Typography |
| **Canvas Confetti** | Celebratory animation on successful quiz completion |

## 3.3 Backend Technologies

| Technology | Purpose |
|------------|---------|
| **Google Apps Script** | Serverless backend deployed as a Web App |
| **Google Sheets** | Database — structured spreadsheet acting as a relational store |
| **CacheService** | Server-side rate limiting for login attempts |
| **ContentService** | JSON API response generation with CORS support |

## 3.4 Database

**Google Sheets** serves as the database layer with three sheet tabs:

- `REGISTRATION` — Student accounts, credentials, and session tokens
- `RESULTS` — All practice set scores and timestamps
- `STUDENT_DETAILS` — Extended student profile data (school, class, guardian)

## 3.5 APIs

The backend exposes a single REST endpoint via Google Apps Script:

- **POST requests** → `doPost()` — Handles login, registration, result saving, session validation, admin actions
- **GET requests** → `doGet()` — Handles progress retrieval and profile fetching

## 3.6 Third-Party Integrations

| Integration | Usage |
|-------------|-------|
| **Google Apps Script** | Backend logic and hosting |
| **Google Sheets** | Data persistence |
| **Tailwind CSS CDN** | Styling framework |
| **Google Fonts (Inter)** | Typography |
| **Canvas Confetti CDN** | Animated confetti on quiz completion |

## 3.7 Hosting Environment

| Component | Hosting |
|-----------|---------|
| **Frontend** | Any static file host (GitHub Pages, Netlify, Vercel, or local server) |
| **Backend** | Google Apps Script (deployed as Web App — Google's infrastructure) |
| **Database** | Google Sheets (Google Drive) |

## 3.8 Component Interaction Flow

1. The **browser** loads static HTML/CSS/JS files from the hosting server
2. JavaScript modules (`app.js`, `engine.js`, `login.js`, etc.) execute in the browser
3. `auth-guard.js` checks for a valid session in `localStorage` before rendering any protected page
4. `api.js` acts as the **backend connector**, sending HTTP requests to the Google Apps Script Web App URL
5. Google Apps Script processes requests, reads/writes to Google Sheets, and returns JSON responses
6. `progress.js` manages all client-side data in `localStorage` and synchronizes with the backend
7. If the backend is unreachable, results are queued in `localStorage` and retried later

---

# 4. User Roles and Permissions

## 4.1 Student

| Attribute | Detail |
|-----------|--------|
| **Role Identifier** | `student` |
| **Account Status Options** | `pending`, `approved`, `suspended`, `rejected`, `blocked` |

**Permissions:**

- Register for a new account (enters pending state)
- Log in after teacher approval
- Access the dashboard and view available subjects
- Navigate subjects, levels, and practice sets
- Attempt MCQ and fill-in-the-blank quizzes
- View scores, progress stats, and recent activity
- View personal profile (name, school, class, student ID)
- Log out (server session is cleared)

**Restrictions:**

- Cannot access any page without an approved, authenticated session
- Cannot access another student's data
- Practice results are locked after submission (no re-submission)

## 4.2 Teacher / Administrator

| Attribute | Detail |
|-----------|--------|
| **Access Method** | Google Apps Script Editor or direct API calls |
| **Functions** | Account management, result monitoring |

**Permissions:**

- **Approve** student registrations (changes status from `pending` to `approved`)
- **Reject** student registrations
- **Suspend** or **block** active student accounts
- **Delete** student records
- **View all students** (filterable by status)
- **Create students** directly via script editor functions
- **Monitor results** via the Google Sheet `RESULTS` tab
- **Add student details** (school, class, guardian info) via script editor

**Responsibilities:**

- Review and approve new registrations promptly
- Monitor student progress via the RESULTS sheet
- Manage account statuses (suspend/block as needed)
- Maintain the question set JSON files for curriculum updates

---

# 5. Complete System Workflow

## 5.1 Student Registration Flow

```
Student visits register.html
        │
        ▼
Fills in: Name, Email, Password, Confirm Password
        │
        ▼
Client-side validation (email format, password ≥ 6 chars, match)
        │
        ▼
POST → Google Apps Script (action: 'register')
        │
        ├── Email already exists → Error: "Email already registered"
        │
        └── Success → New row added to REGISTRATION sheet
                       Status = 'pending', Role = 'student'
                       Password hashed with SHA-256 + random salt
                       │
                       ▼
              Student sees: "Registration submitted. Await teacher approval."
```

## 5.2 Teacher Approval Flow

```
Teacher opens Google Sheet → REGISTRATION tab
        │
        ▼
Finds student with status = 'pending'
        │
        ▼
Uses Script Editor or API to call adminAction:
  { action: 'adminAction', studentId: 'STU_...', adminAction: 'approve' }
        │
        ▼
Status updated to 'approved', approvedAt + approvedBy recorded
```

## 5.3 Student Login Flow

```
Student visits login.html
        │
        ▼
Enters Email + Password
        │
        ▼
Client validation → POST to backend (action: 'login')
        │
        ├── Rate limited (5+ attempts in 5 min) → "Too many attempts"
        ├── Account pending → "Account pending approval"
        ├── Account suspended/rejected/blocked → Appropriate error
        ├── Wrong credentials → "Invalid email or password"
        │
        └── Success:
              ├── Server generates UUID session token
              ├── Stores token in REGISTRATION sheet
              ├── Returns: { studentId, studentName, email, accessToken,
              │            schoolName, className, contactType, contactNumber,
              │            profileImageUrl }
              │
              ▼
            Client creates local session in localStorage
              │
              ▼
            Prefetches dashboard data (progress + profile) from backend
              │
              ▼
            Redirects to index.html (Dashboard)
```

## 5.4 Dashboard & Navigation Flow

```
index.html loads → auth-guard checks session
        │
        ├── Invalid/expired → Redirect to login.html
        │
        └── Valid:
              ├── Loads local stats from localStorage (instant)
              ├── Dynamically imports subject configs from /data/*/std-config.js
              ├── Renders subject cards with progress indicators
              ├── Background: syncs from backend, refreshes stats
              │
              ▼
            Student clicks a subject card → subject.html?subject=tenses
              │
              ▼
            Shows levels (Pre-Primary, Primary, Middle, High)
            Shows video preview card (if configured)
            Shows subject mastery stats
              │
              ▼
            Student clicks a level → level.html?subject=tenses&level=primary
              │
              ▼
            Shows all available practice sets with scores
            Shows level statistics sidebar
              │
              ▼
            Student clicks a set → practice.html?subject=tenses&level=primary&set=1
```

## 5.5 Practice & Scoring Flow

```
practice.html loads → engine.js initializes
        │
        ▼
Fetches set JSON: data/tenses/primary/set1.json
        │
        ▼
Validates question structure, renders MCQ or Fill engine
Timer starts, progress bar appears
        │
        ▼
Student answers all questions → Submit button activates
        │
        ▼
On submit:
  ├── Timer stops
  ├── Answers revealed (correct = green, wrong = red)
  ├── Score calculated
  ├── If score ≥ 80% → PDF solution link unlocked + confetti
  │
  ▼
Progress.saveResult() → stores best score in localStorage
  │
  ▼
API.syncResult() → sends result to Google Sheets
  │
  ├── Success → Result saved in RESULTS sheet
  └── Failure → Queued in offline queue for retry
```

## 5.6 Session Management

```
Every protected page:
  │
  ├── isAuthenticated() → local check (session exists + not expired)
  │     └── Fails → immediate redirect to login.html
  │
  └── checkAuth() → background server check (every 2 minutes)
        │
        ├── Token matches server → session continues
        └── Token mismatch (another device logged in) → forced logout
```

---

# 6. Features and Modules

## 6.1 Authentication Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `login.html`, `register.html`, `js/login.js`, `js/register.js`, `js/auth-guard.js` |
| **Description** | Handles student registration, login, session management, and logout |
| **Key Functions** | Email/password login, SHA-256 password hashing, UUID session tokens, rate limiting, single-device enforcement, 24-hour session expiry |
| **User Interaction** | Students fill login/register forms; system validates and responds with success or descriptive error messages |

## 6.2 Dashboard Module (Home)

| Attribute | Detail |
|-----------|--------|
| **Files** | `index.html`, `js/app.js` |
| **Description** | Main landing page after login showing subjects, stats, and last practiced set |
| **Key Functions** | Subject grid rendering, global stat cards (avg score, sets completed, active subjects, top subject), resume card for last practiced set, backend sync |
| **User Interaction** | Students view their overall progress and click subject cards to navigate deeper |

## 6.3 Subject Overview Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `subject.html`, `js/app.js` |
| **Description** | Displays available levels for a selected subject with mastery statistics and optional video preview |
| **Key Functions** | Level listing with progress, subject mastery calculation, YouTube playlist integration, analytics cards |
| **User Interaction** | Students view available levels and their completion status, watch video lectures, and select a level |

## 6.4 Level & Practice Sets Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `level.html`, `js/app.js` |
| **Description** | Lists all practice sets within a specific subject-level combination with individual scores |
| **Key Functions** | Set listing, per-set score display, PDF solution unlock (≥80%), level statistics sidebar |
| **User Interaction** | Students see which sets they've completed, their scores, and click to practice |

## 6.5 Practice Engine Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `practice.html`, `js/engine.js` |
| **Description** | The core interactive quiz engine supporting MCQ and fill-in-the-blank question types |
| **Key Functions** | Question rendering, option shuffling (Fisher-Yates), answer selection, timer, progress bar, submission, answer reveal, score calculation, confetti animation, result saving and sync |
| **User Interaction** | Students answer questions, view real-time progress, submit, and receive instant visual feedback |

## 6.6 Profile Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `profile.html`, `js/profile.js` |
| **Description** | Student dashboard showing personal info, overall performance, subject breakdown, and recent activity |
| **Key Functions** | Profile photo display, member-since date, overall score/sets/time stats, per-subject breakdown cards with accuracy bars, recent activity timeline, logout |
| **User Interaction** | Students review their learning journey and sign out |

## 6.7 Progress Tracking Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `js/progress.js` |
| **Description** | Single source of truth for all student progress data management |
| **Key Functions** | `saveResult()` (stores best score), `getGlobalStats()`, `getSubjectStats()`, `getLevelStats()`, `getSetResult()`, `getTimeTotals()`, session cache management, backend sync with merge (keeps best score), cache invalidation |
| **User Interaction** | Operates transparently — students see their stats rendered by other modules |

## 6.8 Backend API Connector Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `backend/api.js` |
| **Description** | Client-side API layer that handles all communication with the Google Apps Script backend |
| **Key Functions** | `login()`, `register()`, `syncResult()`, `fetchProgress()`, `getStudentDetails()`, `checkSession()`, `logoutSession()`, `validateSession()`, offline queue with retry (max 3 attempts), in-flight request deduplication |
| **User Interaction** | Operates transparently behind the scenes |

## 6.9 Backend Server Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `backend/google-apps-script.js` |
| **Description** | Google Apps Script serverless backend handling all data operations |
| **Key Functions** | Login with rate limiting, registration with duplicate detection, result saving with duplicate checking, session token management, admin actions (approve/reject/suspend/delete), student progress retrieval, profile retrieval, password hashing (SHA-256 + salt) |
| **User Interaction** | Processes all API requests from the frontend |

## 6.10 Curriculum Data Module

| Attribute | Detail |
|-----------|--------|
| **Files** | `data/*/std-config.js`, `data/*/*/config.js`, `data/*/*/setN.json` |
| **Description** | Static JSON/JS files containing subject configurations and question sets |
| **Key Functions** | Subject identity (title, icon, engine type, status), set counts per level, question data (question text, options array, correct answer index) |
| **User Interaction** | Students interact with this data through the practice engine |

---

# 7. Database Design

The database is implemented as a **Google Sheets** spreadsheet with three sheets (tabs).

## 7.1 REGISTRATION Sheet

Stores student accounts, credentials, and session information.

| Column Name | Data Type | Description | Example |
|-------------|-----------|-------------|---------|
| studentId | String | Unique student identifier (UUID-based) | `STU_A1B2C3D4E5F6` |
| studentName | String | Full name of the student | `Rahul Sharma` |
| email | String | Student email address (lowercase) | `rahul@school.com` |
| passwordHash | String | SHA-256 hash of salt + password | `a3f2b8c1d4...` |
| salt | String | Random 16-character salt for hashing | `e4f5a6b7c8d9e0f1` |
| status | String | Account status | `pending` / `approved` / `suspended` / `rejected` / `blocked` |
| role | String | User role | `student` |
| createdAt | String (ISO) | Account creation timestamp | `2026-03-12T10:30:00.000Z` |
| lastLogin | String (ISO) | Last successful login timestamp | `2026-03-12T14:00:00.000Z` |
| activeSessionToken | String (UUID) | Current active session token | `550e8400-e29b-41d4-a716-446655440000` |
| approvedAt | String (ISO) | Teacher approval timestamp | `2026-03-12T11:00:00.000Z` |
| approvedBy | String | Name of the approving admin | `Mrs. Gupta` |

**Primary Key:** `studentId`  
**Unique Constraint:** `email` (enforced by application logic)

## 7.2 RESULTS Sheet

Stores all practice set attempt results.

| Column Name | Data Type | Description | Example |
|-------------|-----------|-------------|---------|
| studentId | String | Foreign key → REGISTRATION.studentId | `STU_A1B2C3D4E5F6` |
| studentName | String | Student name (denormalized for easy reading) | `Rahul Sharma` |
| subject | String | Grammar subject identifier | `tenses` |
| level | String | Academic level | `primary` |
| set | String | Practice set number | `3` |
| score | Number | Number of correct answers | `12` |
| total | Number | Total questions in the set | `15` |
| percentage | Number | Score percentage (rounded) | `80` |
| timeTaken | Number | Time spent in seconds | `245` |
| date | String (ISO) | Attempt date | `2026-03-12T14:30:00.000Z` |
| timestamp | Number | Unix timestamp (milliseconds) | `1773508200000` |

**Foreign Key:** `studentId` → `REGISTRATION.studentId`

## 7.3 STUDENT_DETAILS Sheet

Stores extended student profile information.

| Column Name | Data Type | Description | Example |
|-------------|-----------|-------------|---------|
| studentId | String | Foreign key → REGISTRATION.studentId | `STU_A1B2C3D4E5F6` |
| studentName | String | Student name | `Rahul Sharma` |
| schoolName | String | Name of the student's school | `DPS Public School` |
| className | String | Class/grade of the student | `8th` |
| profileImageURL | String | URL to profile photo | `https://example.com/photo.jpg` |
| guardianName | String | Parent/guardian name | `Mr. Suresh Sharma` |
| contactNumber | String | Guardian contact number | `9876543210` |
| address | String | Student address | `Kolkata, West Bengal` |
| createdAt | String (ISO) | Record creation timestamp | `2026-03-12T10:30:00.000Z` |

**Foreign Key:** `studentId` → `REGISTRATION.studentId`

## 7.4 Table Relationships

```
REGISTRATION (1) ──────── (N) RESULTS
     │                           │
     │ studentId                 │ studentId
     │                           │
     └──────── (1) STUDENT_DETAILS
                    │
                    │ studentId
```

- **REGISTRATION ↔ RESULTS:** One student can have many result entries (one per set attempt)
- **REGISTRATION ↔ STUDENT_DETAILS:** One-to-one relationship for extended profile data
- Results keep the **best score** per subject/level/set combination (enforced at client and server)

---

# 8. API Structure

All API communication goes through a single Google Apps Script Web App endpoint. The method (GET/POST) and the `action` parameter determine the operation.

## 8.1 POST Endpoints

### 8.1.1 Login

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` |
| **Method** | POST |
| **Request Body** | `{ "action": "login", "email": "student@email.com", "password": "pass123" }` |

**Success Response:**
```json
{
  "success": true,
  "studentId": "STU_A1B2C3D4E5F6",
  "studentName": "Rahul Sharma",
  "email": "rahul@school.com",
  "accessToken": "550e8400-e29b-41d4-a716-446655440000",
  "schoolName": "DPS Public School",
  "className": "8",
  "contactType": "parents",
  "contactNumber": "9876543210",
  "profileImageUrl": ""
}
```

> **Note:** The token field is `accessToken` (not `activeSessionToken`). Frontend code reads `result.accessToken` with fallback to `result.activeSessionToken` for backward compatibility.

**Error Responses:**

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

### 8.1.2 Register

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` |
| **Method** | POST |
| **Request Body** | `{ "action": "register", "name": "Rahul Sharma", "email": "rahul@school.com", "password": "pass123" }` |

**Success Response:**
```json
{
  "success": true,
  "message": "Registration submitted. Await teacher approval."
}
```

**Error Codes:** `MISSING_FIELDS`, `WEAK_PASSWORD` (< 6 chars), `EMAIL_EXISTS`

---

### 8.1.3 Save Result

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` |
| **Method** | POST |
| **Request Body** | `{ "action": "saveResult", "studentId": "STU_...", "studentName": "Rahul", "subject": "tenses", "level": "primary", "set": "3", "score": 12, "total": 15, "percentage": 80, "timeTaken": 245, "date": "2026-03-12T14:30:00Z", "timestamp": 1773508200000 }` |

**Success Response:**
```json
{ "success": true, "message": "Result saved." }
```

**Duplicate Detection:** If a result with the same `timestamp + studentId + subject + level + set` already exists, returns success with `"Duplicate — already saved."`

---

### 8.1.4 Check Session

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` |
| **Method** | POST |
| **Request Body** | `{ "action": "checkSession", "studentId": "STU_...", "activeSessionToken": "uuid-token" }` |

**Success Response:**
```json
{ "success": true }
```

**Failure Response (another device logged in):**
```json
{ "success": false, "reason": "session_invalid" }
```

---

### 8.1.5 Logout

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` |
| **Method** | POST |
| **Request Body** | `{ "action": "logout", "studentId": "STU_..." }` |

**Response:**
```json
{ "success": true }
```

---

### 8.1.6 Validate Session

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` |
| **Method** | POST |
| **Request Body** | `{ "action": "validateSession", "studentId": "STU_...", "token": "...", "loginAt": 1773508200000 }` |

**Response:**
```json
{ "success": true, "verified": true }
```

---

### 8.1.7 List Students (Admin)

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` |
| **Method** | POST |
| **Request Body** | `{ "action": "listStudents", "statusFilter": "pending" }` |

**Response:**
```json
{
  "success": true,
  "students": [
    {
      "studentId": "STU_...",
      "studentName": "...",
      "email": "...",
      "status": "pending",
      "role": "student",
      "createdAt": "...",
      "lastLogin": "",
      "schoolName": "",
      "className": ""
    }
  ]
}
```

---

### 8.1.8 Admin Action

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` |
| **Method** | POST |
| **Request Body** | `{ "action": "adminAction", "studentId": "STU_...", "adminAction": "approve", "adminName": "Mrs. Gupta" }` |

**Valid Actions:** `approve`, `reject`, `suspend`, `delete`

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

## 8.2 GET Endpoints

### 8.2.1 Get Progress

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL?action=getProgress&id=STU_...` |
| **Method** | GET |

**Response:** Structured progress object mirroring localStorage format:
```json
{
  "tenses": {
    "primary": {
      "1": { "score": 12, "total": 15, "percentage": 80, "timeTaken": 245, "date": "...", "timestamp": 1773508200000 }
    }
  }
}
```

---

### 8.2.2 Get Profile

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL?action=getProfile&id=STU_...` |
| **Method** | GET |

**Response:**
```json
{
  "success": true,
  "studentId": "STU_...",
  "studentName": "Rahul Sharma",
  "schoolName": "DPS Public School",
  "className": "8th",
  "profileImageURL": "",
  "guardianName": "Mr. Suresh Sharma",
  "contactNumber": "9876543210",
  "address": "Kolkata"
}
```

---

### 8.2.3 Health Check

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `BACKEND_URL` (GET with no action) |
| **Method** | GET |

**Response:**
```json
{
  "status": "ok",
  "message": "EnglishJibi Backend Active",
  "timestamp": "2026-03-12T10:00:00.000Z"
}
```

---

# 9. UI / Interface Description

## 9.1 Login Page (`login.html`)

- **Purpose:** Authenticate students and create a session
- **Layout:** Split-screen design — branding panel (desktop) + auth form
- **Elements:** Email input, password input (with show/hide toggle), login button with loading spinner, error/status messages, link to registration page
- **Behavior:** Shows specific error messages for pending/suspended/rejected/blocked accounts and rate limiting

## 9.2 Registration Page (`register.html`)

- **Purpose:** Allow new students to create accounts
- **Layout:** Split-screen design matching login page aesthetics
- **Elements:** Name, email, password, confirm password inputs; password strength meter (color-coded bar); field-level error hints; success panel with green checkmark animation
- **Behavior:** Client-side validation with real-time password strength feedback; on success, shows "await teacher approval" message

## 9.3 Dashboard / Home Page (`index.html`)

- **Purpose:** Main landing page — overview of all subjects and student stats
- **Layout:** Full-width responsive layout with stat cards at top, curriculum grid below
- **Key Sections:**
  - **Stat Cards:** Average Score, Sets Completed, Active Subjects, Top Subject
  - **Resume Card:** Quick-access to the last practiced set with score and "Practice Again" button
  - **Subject Grid:** Cards for each subject (Tenses, SVA, etc.) showing title, description, sets done, active/offline status
- **Behavior:** Loads local data instantly, syncs with backend in the background, animates cards with staggered entry

## 9.4 Subject Page (`subject.html`)

- **Purpose:** Show available levels for a selected subject
- **Layout:** Two-column (level list + video preview), desktop sticky header with breadcrumb
- **Key Sections:**
  - **Analytics Row:** Subject mastery, sets done, average accuracy
  - **Level List:** Pre-Primary, Primary, Middle, High — each showing progress
  - **Video Preview Card:** YouTube playlist thumbnail (opens in new tab)
- **Behavior:** Dynamic breadcrumb navigation, mastery progress bar

## 9.5 Level / Practice Sets Page (`level.html`)

- **Purpose:** Display all practice sets within a specific level
- **Layout:** Two-column (practice set list + level stats sidebar)
- **Key Sections:**
  - **Practice Sets List:** Numbered set cards with score badges, PDF solution unlock indicators
  - **Level Stats Sidebar:** Completion count, average score, time spent
- **Behavior:** Each set card links to the practice engine; scored sets show percentage

## 9.6 Practice Page (`practice.html`)

- **Purpose:** Interactive quiz engine — the core learning experience
- **Layout:** Full-width, scrollable question cards with fixed bottom submit bar
- **Key Sections:**
  - **Header:** Subject/level/set identity, timer, date display, compact mode on scroll
  - **Question Cards:** Numbered cards with question text and option buttons (MCQ) or pill options (Fill)
  - **Bottom Bar:** Submit button (disabled until all questions answered)
  - **Results View:** Color-coded answer reveal, score summary, PDF link, practice-again/next-set buttons
- **Behavior:** Skeleton loading, option shuffling, progress bar, shake animation on unanswered questions, confetti on high scores

## 9.7 Profile Page (`profile.html`)

- **Purpose:** Personal dashboard showing student identity and performance analytics
- **Layout:** Two-column (profile card + stats panels)
- **Key Sections:**
  - **Profile Card:** Photo/initial avatar, name, school, class, student ID, member-since date
  - **Overall Performance:** Score, sets completed, best subject, total time
  - **Subject Breakdown:** Per-subject cards with accuracy percentage and time spent
  - **Recent Activity:** Scrollable timeline of last 8 practice attempts
- **Behavior:** Logout button, data loads from localStorage then refreshes from backend

## 9.8 Setup Guide Page (`setup-guide.html`)

- **Purpose:** Step-by-step guide for deploying the backend
- **Layout:** Interactive checklist with progress bar
- **Content:** Instructions for Google Sheet creation, Apps Script deployment, URL configuration

---

# 10. Security Measures

## 10.1 Authentication

| Measure | Implementation |
|---------|----------------|
| **Password Hashing** | SHA-256 with unique random 16-character salt per user |
| **No Plain-Text Storage** | Passwords are never stored in plain text; only the hash and salt are saved |
| **Session Tokens** | UUID-based tokens (`Utilities.getUuid()`) issued on login |
| **Single-Device Enforcement** | Each login overwrites the session token — only the latest device is valid |
| **Session Expiry** | Client-side sessions expire after 24 hours |
| **Server-Side Validation** | Token is verified against the stored token every 2 minutes |

## 10.2 Authorization

| Measure | Implementation |
|---------|----------------|
| **Auth Guard** | Every protected page imports `auth-guard.js` — immediate redirect if no valid session |
| **Status Checking** | Login verifies account status before granting access (must be `approved`) |
| **Result Verification** | `saveResult` verifies the student exists and is approved before persisting |

## 10.3 Rate Limiting

| Measure | Implementation |
|---------|----------------|
| **Login Rate Limit** | Maximum 5 login attempts per email per 5-minute window (server-side via `CacheService`) |
| **Re-submission Guard** | Practice engine locks after first submission — no double-submit |

## 10.4 Input Validation

| Measure | Implementation |
|---------|----------------|
| **URL Parameter Validation** | `getParams()` validates subject (alphanumeric), level (whitelist), set (positive integer) using regex |
| **XSS Prevention** | `escapeHTML()` function sanitizes all user-provided strings before DOM injection |
| **URL Sanitization** | `injectHeader()` validates back-URLs against a safe pattern before rendering |
| **Email Validation** | Client-side regex + server-side normalization (trim + lowercase) |
| **Password Minimum** | 6-character minimum enforced on both client and server |
| **Question Validation** | `validateQuestions()` filters out malformed entries from JSON files |

## 10.5 Data Protection

| Measure | Implementation |
|---------|----------------|
| **HTTPS** | Google Apps Script Web Apps are always served over HTTPS |
| **No Credential Exposure** | Session tokens are UUIDs — not the password hash |
| **LocalStorage Isolation** | Browser same-origin policy protects localStorage data |
| **Error Information** | Generic error messages for invalid credentials (does not reveal whether email exists) |

## 10.6 Backup Strategy

| Measure | Implementation |
|---------|----------------|
| **Google Sheets** | Data is stored in Google Sheets which has built-in version history |
| **Dual Storage** | Student progress exists in both localStorage and Google Sheets — either can recover the other |
| **Offline Queue** | Results that fail to sync are queued and retried (up to 3 attempts) |

---

# 11. Error Handling

## 11.1 Invalid Inputs

| Scenario | Handling |
|----------|----------|
| Empty form fields | Field-level error messages displayed inline |
| Invalid email format | "Please enter a valid email address" |
| Password too short | "Password must be at least 6 characters" |
| Password mismatch (register) | "Passwords do not match" |
| Invalid URL parameters | Silently defaulted to safe values (e.g., subject defaults to `tenses`) |
| Malformed question JSON | Filtered out by `validateQuestions()` — only valid questions are rendered |

## 11.2 Server/Network Failures

| Scenario | Handling |
|----------|----------|
| Backend unreachable during login | "Unable to connect to the server. Please check your internet connection." |
| Backend unreachable during practice | Results queued in localStorage offline queue; retried on next page load |
| Session check fails (network) | Allows offline usage — does not block the student |
| Backend sync fails | Silently continues with local data; logs warning to console |
| HTTP error responses | Appropriate error messages based on status codes |

## 11.3 Database Errors

| Scenario | Handling |
|----------|----------|
| Missing Google Sheet tab | Returns `{ success: false, error: "Sheet not found", code: "SHEET_NOT_FOUND" }` |
| Student not found | Returns coded error `STUDENT_NOT_FOUND` |
| Duplicate result submission | Detected by timestamp matching — returns success with "Duplicate — already saved" |
| localStorage quota exceeded | Caught silently — save operation skipped with no crash |
| Corrupted localStorage data | `try/catch` blocks return empty objects as fallback |

## 11.4 Application Errors

| Scenario | Handling |
|----------|----------|
| Practice set not found | User-friendly error card with "Go Back" button |
| No valid questions in set | Descriptive error message shown in the quiz container |
| Auth module import failure | Module-level throw halts rendering, preventing unauthorized page access |

---

# 12. Scalability Considerations

## 12.1 Current Capacity

- **Google Sheets** supports up to 10 million cells per spreadsheet
- **Google Apps Script** has execution quotas: 90 minutes/day for triggers, 6-minute max per execution
- **Static frontend** has no server-side scaling concerns

## 12.2 Scaling Strategies

| Strategy | Description |
|----------|-------------|
| **Subject Expansion** | New subjects can be added by creating a folder in `/data/` with a `std-config.js` and set JSON files — no code changes required |
| **Level Expansion** | New levels can be added to existing subjects by updating `setCounts` in the config |
| **Multiple Sheets** | If row limits are reached, results can be split across multiple sheets with archive logic |
| **Backend Migration** | The `api.js` connector module is designed with a single `BACKEND_URL` — it can point to any REST API (Node.js, Python, PHP, etc.) without changing frontend code |
| **CDN Hosting** | Static assets can be deployed to CDN (Cloudflare, AWS CloudFront) for global performance |
| **Database Migration** | Google Sheets can be replaced with Firebase, Supabase, PostgreSQL, or MongoDB by updating the backend script |
| **Caching** | Session-level caching (`sessionStorage`) already reduces redundant backend calls; this can be extended with service workers |

## 12.3 Performance Optimizations Already In Place

- **Parallel config loading:** All subject configs are loaded simultaneously via `Promise.allSettled()`
- **In-flight deduplication:** Concurrent identical API requests return the same promise
- **Session cache:** Dashboard data is prefetched at login and cached in `sessionStorage`
- **Config-based set counts:** Avoids network scanning — set counts are defined in config files
- **Targeted row lookup:** Google Sheets `TextFinder` for O(1)-like lookups instead of full-sheet scans

---

# 13. Deployment Plan

## 13.1 Backend Deployment (Google Apps Script)

1. **Create a Google Sheet** with ID or a new spreadsheet
2. **Create three tabs:** `REGISTRATION`, `RESULTS`, `STUDENT_DETAILS` with the column headers documented in Section 7
3. **Open Google Apps Script** at `script.google.com`, create a new project
4. **Copy** the entire contents of `backend/google-apps-script.js` into the script editor
5. **Update** the `SHEET_ID` constant with your Google Sheet ID
6. **Deploy** as a Web App:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. **Copy the Web App URL** — this is your `BACKEND_URL`

## 13.2 Frontend Deployment

1. **Update** `BACKEND_URL` in `backend/api.js` with the Web App URL from Step 13.1
2. **Deploy** the static files to any hosting platform:

| Platform | Steps |
|----------|-------|
| **GitHub Pages** | Push to a repo, enable Pages in Settings |
| **Netlify** | Drag-and-drop the project folder, or connect a Git repo |
| **Vercel** | Import repo, deploy |
| **Local/LAN** | Serve with any HTTP server (e.g., `npx serve`, VS Code Live Server) |

## 13.3 Domain Configuration

- Point a custom domain (e.g., `student.englishjibi.com`) to the hosting platform
- Configure SSL/TLS (most platforms provide free SSL)
- Ensure HTTPS is enforced

## 13.4 Environment Configuration

| Variable | Location | Description |
|----------|----------|-------------|
| `BACKEND_URL` | `backend/api.js` | Google Apps Script Web App URL |
| `SHEET_ID` | `backend/google-apps-script.js` | Google Sheets spreadsheet ID |
| Subject configs | `data/*/std-config.js` | Subject titles, engine types, set counts |

## 13.5 Initial Data Setup

1. **Create test student** by running `createStudent()` in the Apps Script editor
2. **Add student details** by running `createStudentDetails()` in the Apps Script editor
3. **Verify** by logging in from the frontend

---

# 14. Maintenance Guide

## 14.1 Adding New Subjects

1. Create a new folder under `data/` (e.g., `data/articles/`)
2. Add `std-config.js` with subject metadata:
   ```js
   export default {
     id: 'articles',
     order: 5,
     title: 'Articles',
     description: 'Practice A, An, The usage.',
     icon: 'book',
     status: 'online',
     engine: 'mcq',
     unlockAt: 80,
     setCounts: { preprimary: 0, primary: 3, middle: 5, high: 4 }
   };
   ```
3. Create level subfolders (`primary/`, `middle/`, `high/`)
4. Add `setN.json` files with question arrays
5. Add the subject ID to the `SUBJECTS` array in `js/app.js`

## 14.2 Adding New Practice Sets

1. Create a new `setN.json` file in the appropriate `data/subject/level/` folder
2. Follow the question format:
   ```json
   [
     { "q": "Question text with ______ blank.", "options": ["option1", "option2", "option3", "option4"], "answer": 2 }
   ]
   ```
3. Update `setCounts` in `data/subject/std-config.js` to reflect the new total

## 14.3 Managing Student Accounts

- **View all students:** Open the `REGISTRATION` tab in Google Sheets
- **Approve pending students:** Run `_handleAdminAction` with `adminAction: 'approve'` or edit the status column directly
- **Suspend a student:** Change the `status` column to `suspended`
- **Reset a password:** Generate a new hash/salt using the `createStudent` function parameters

## 14.4 Monitoring System Performance

- **Google Sheets Dashboard:** Review the `RESULTS` sheet for student activity
- **Apps Script Logs:** View → Executions in the Apps Script editor to see request logs
- **Browser Console:** Client-side logs use `console.log`/`console.warn` with `[Module]` prefixes
- **Offline Queue:** Check `localStorage` key `grammarhub_sync_queue` for pending sync items

## 14.5 Updating the Backend

1. Make changes in `backend/google-apps-script.js`
2. Copy the updated code to the Apps Script editor
3. Deploy → **Manage deployments** → Create a **new version**
4. Update `BACKEND_URL` in `backend/api.js` with the new Web App URL

## 14.6 Bug Fixing Workflow

1. **Identify** the issue from user reports or console logs
2. **Locate** the relevant module using the file structure (see Section 6)
3. **Test locally** using a live server (e.g., VS Code Live Server)
4. **Validate** with browser DevTools (Network tab for API calls, Console for JS errors)
5. **Deploy** the fix to the hosting platform

## 14.7 Known Bug Fixes & Patch Log

| Date | File | Bug | Root Cause | Fix Applied |
|------|------|-----|------------|-------------|
| March 2026 | `js/login.js` | **Instant logout after login** — user appeared logged in for a fraction of a second then was redirected back to `login.html` | `login.js` read `result.activeSessionToken` but the backend returns the token as `accessToken`. The field was `undefined`, so `createSession()` saved `activeSessionToken: undefined`. On the next page, `auth-guard.js`'s `getSession()` guard rejected the session (falsy token check) and immediately redirected to login. | Changed token read to `result.activeSessionToken \|\| result.accessToken` in `createSession()` call. |
| March 2026 | `js/login.js` | **Empty school/class/photo in profile** — student profile always showed blank school, class, and photo after login | Backend returns `schoolName`, `className`, `profileImageUrl` but `login.js` was reading `result.school`, `result.class`, `result.profilePhotoURL` (v2 idealized names that don't exist in the actual response). | Added field-name fallbacks: `result.class \|\| result.className`, `result.school \|\| result.schoolName`, `result.profilePhotoURL \|\| result.profileImageUrl`. |
| March 2026 | `backend/api.js` | **Backend URL update** — redeployed Google Apps Script requires new Web App URL | New deployment generates a new URL. | Updated `BACKEND_URL` constant to new deployment URL. |

---

# 15. Future Improvements

| Priority | Improvement | Description |
|----------|-------------|-------------|
| **High** | Admin Dashboard Web UI | A dedicated admin panel (web page) for managing students, viewing results, and approving registrations — replacing manual Google Sheet access |
| **High** | Leaderboard | Ranked student leaderboard by subject/level/overall to encourage competition |
| **High** | PDF Solution Generation | Auto-generate or serve PDF solutions for completed sets (currently placeholder) |
| **Medium** | Detailed Analytics | Charts and graphs for student performance trends over time (weekly/monthly) |
| **Medium** | Push Notifications | Notify students of new practice sets or teacher messages |
| **Medium** | Timed Quiz Mode | Strict timer mode where the quiz auto-submits after a set duration |
| **Medium** | Service Worker / PWA | Full offline support with service worker caching, installable as a Progressive Web App |
| **Medium** | Multi-Language Support | Interface translations for regional languages |
| **Low** | Audio Pronunciation | Audio playback for grammar examples and questions |
| **Low** | Gamification | Badges, streaks, and XP system for increased engagement |
| **Low** | Firebase Migration | Move from Google Sheets to Firebase Realtime Database for better scalability |
| **Low** | Teacher Mobile App | Companion app for teachers to manage students on mobile |

---

# 16. Technical Summary

| Attribute | Value |
|-----------|-------|
| **Project Name** | EnglishJibi Student Panel Pro |
| **Type** | Web-based Grammar Practice Platform |
| **Frontend** | HTML5, Tailwind CSS (CDN), Vanilla JavaScript (ES6 Modules) |
| **Backend** | Google Apps Script (serverless) |
| **Database** | Google Sheets (3 sheets: REGISTRATION, RESULTS, STUDENT_DETAILS) |
| **Authentication** | Email/password with SHA-256 hashing, UUID session tokens, single-device enforcement |
| **Quiz Engines** | MCQ (Multiple Choice) and Fill-in-the-Blank |
| **Live Subjects** | Tenses (MCQ engine), SVA (Fill engine) — expandable to 12+ subjects |
| **Academic Levels** | Pre-Primary, Primary, Middle, High |
| **Progress Storage** | Dual — localStorage (offline-first) + Google Sheets (cloud sync) |
| **Session Management** | 24-hour expiry, server-authoritative token validation every 2 minutes |
| **Offline Support** | Offline result queue with automatic retry (max 3 attempts) |
| **Security** | Rate limiting, input validation, XSS prevention, HTTPS, password hashing |
| **Responsive Design** | Mobile-first, works on phones, tablets, and desktops |
| **Hosting Cost** | Zero (static hosting + Google Apps Script free tier) |
| **Total HTML Pages** | 8 (index, subject, level, practice, profile, login, register, setup-guide) |
| **Total JS Modules** | 7 (app, engine, progress, auth-guard, login, register, profile) + 2 backend files |
| **Dependencies** | Zero npm dependencies — all libraries loaded via CDN |
| **Developer** | Subham Kumar Mallick |
| **Year** | 2026 |

---

> *This documentation is intended for client understanding, developer handover, and future project maintenance. For deployment-specific instructions, refer to Section 13 and the `setup-guide.html` page included in the project.*
