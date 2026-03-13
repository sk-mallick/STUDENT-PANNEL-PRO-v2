// ================================================================
// student-panel/js/register.js  —  V2 Multi-Step Wizard
// Floating label UI, pill toggles, school overlay, 3 steps.
// ================================================================

import { isAuthenticated } from './auth-guard.js';
import { API } from '../backend/api.js';

if (isAuthenticated()) { window.location.href = 'index.html'; }

// ── DOM: Form & global ────────────────────────────────────────────
const form = document.getElementById('register-form');
const errorDiv = document.getElementById('register-error');
const successDiv = document.getElementById('register-success');
const registerBtn = document.getElementById('register-btn');

// ── DOM: Step panels & progress ───────────────────────────────────
const stepPanels = [
    document.getElementById('form-step-1'),
    document.getElementById('form-step-2'),
    document.getElementById('form-step-3'),
];
const stepNodes = document.querySelectorAll('#step-progress .step-node');
const fillLines = [document.getElementById('fill-1'), document.getElementById('fill-2')];

// ── DOM: Step 1 ───────────────────────────────────────────────────
const nameInput = document.getElementById('reg-name');
const classInput = document.getElementById('reg-class');
const schoolInput = document.getElementById('reg-school');
const schoolOtherInput = document.getElementById('reg-school-other');
const schoolGroup = schoolInput?.closest('.school-fl-group');
const btnSchoolChange = document.getElementById('btn-school-change');
const errName = document.getElementById('err-name');
const errClass = document.getElementById('err-class');
const errSchool = document.getElementById('err-school');
const errGender = document.getElementById('err-gender');

// ── DOM: Step 2 ───────────────────────────────────────────────────
const contactNumberInput = document.getElementById('reg-contact-number');
const emailInput = document.getElementById('reg-email');
const passwordInput = document.getElementById('reg-password');
const confirmInput = document.getElementById('reg-confirm');
const pwStrengthFill = document.getElementById('pw-strength-fill');
const togglePasswordBtn = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');
const errContactType = document.getElementById('err-contact-type');
const errContactNumber = document.getElementById('err-contact-number');
const errEmail = document.getElementById('err-email');
const errPassword = document.getElementById('err-password');
const errConfirm = document.getElementById('err-confirm');

// ── DOM: Nav buttons ──────────────────────────────────────────────
const btnNext1 = document.getElementById('btn-next-1');
const btnBack2 = document.getElementById('btn-back-2');
const btnNext2 = document.getElementById('btn-next-2');
const btnBack3 = document.getElementById('btn-back-3');

// ── Pill state ────────────────────────────────────────────────────
let _gender = '';
let _contactType = '';
let currentStep = 1;

// ── Pill click handler ────────────────────────────────────────────
document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        const val = btn.dataset.value;
        // Deactivate siblings in same group
        document.querySelectorAll(`.pill-btn[data-group="${group}"]`).forEach(b => {
            b.classList.remove('active', 'has-error');
        });
        btn.classList.add('active');
        if (group === 'gender') { _gender = val; if (errGender) { errGender.textContent = ''; errGender.classList.remove('show'); } }
        if (group === 'contactType') { _contactType = val; if (errContactType) { errContactType.textContent = ''; errContactType.classList.remove('show'); } }
    });
});

// ── Select: has-value class ───────────────────────────────────────
function _syncSelectClass(sel) {
    if (!sel) return;
    sel.classList.toggle('has-value', !!sel.value);
}

classInput?.addEventListener('change', () => _syncSelectClass(classInput));
schoolInput?.addEventListener('change', () => {
    _syncSelectClass(schoolInput);
    if (schoolInput.value === 'Other') {
        schoolGroup?.classList.add('show-other');
        schoolOtherInput?.focus();
    }
});

// School "Other" change-back button
btnSchoolChange?.addEventListener('click', () => {
    schoolGroup?.classList.remove('show-other');
    if (schoolOtherInput) schoolOtherInput.value = '';
    if (schoolInput) { schoolInput.value = ''; _syncSelectClass(schoolInput); }
});

// ── Password toggle ───────────────────────────────────────────────
togglePasswordBtn?.addEventListener('click', () => {
    const isPw = passwordInput.type === 'password';
    passwordInput.type = isPw ? 'text' : 'password';
    eyeIcon?.classList.toggle('hidden', !isPw);
    eyeOffIcon?.classList.toggle('hidden', isPw);
});

// ── Password strength ─────────────────────────────────────────────
passwordInput?.addEventListener('input', () => {
    const v = passwordInput.value;
    let s = 0;
    if (v.length >= 4) s++;
    if (v.length >= 6) s++;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    if (pwStrengthFill) {
        pwStrengthFill.style.width = Math.min((s / 6) * 100, 100) + '%';
        pwStrengthFill.style.background = s <= 2 ? '#ef4444' : s <= 4 ? '#f59e0b' : '#10b981';
    }
});

// ── Step navigation ───────────────────────────────────────────────
function _goToStep(target, dir = 'forward') {
    const from = currentStep - 1;
    const to = target - 1;

    stepPanels[from].classList.add('hidden');
    stepPanels[from].classList.remove('slide-in', 'slide-in-back');

    stepPanels[to].classList.remove('hidden');
    void stepPanels[to].offsetWidth;
    stepPanels[to].classList.add(dir === 'back' ? 'slide-in-back' : 'slide-in');

    stepNodes.forEach((n, i) => {
        n.classList.remove('active', 'done');
        if (i + 1 < target) n.classList.add('done');
        if (i + 1 === target) n.classList.add('active');
    });

    if (fillLines[0]) fillLines[0].style.width = target > 1 ? '100%' : '0%';
    if (fillLines[1]) fillLines[1].style.width = target > 2 ? '100%' : '0%';

    currentStep = target;
    _hideError();
}

// ── Field error helpers ───────────────────────────────────────────
function _fe(el, inp, msg) {
    if (el) { el.textContent = msg; el.classList.add('show'); }
    if (inp) inp.classList.add('has-error');
}
function _ce(el, inp) {
    if (el) { el.textContent = ''; el.classList.remove('show'); }
    if (inp) inp.classList.remove('has-error');
}

// ── Step 1 validation ─────────────────────────────────────────────
function _v1() {
    _ce(errName, nameInput); _ce(errClass, classInput); _ce(errSchool, schoolInput);
    if (errGender) { errGender.textContent = ''; errGender.classList.remove('show'); }
    document.querySelectorAll('.pill-btn[data-group="gender"]').forEach(b => b.classList.remove('has-error'));

    if ((nameInput?.value.trim() || '').length < 2) {
        _fe(errName, nameInput, 'Please enter your full name.');
        nameInput?.focus(); return false;
    }
    const _nameWords = nameInput.value.trim().split(/\s+/).filter(w => w.length > 0);
    if (_nameWords.length > 5) {
        _fe(errName, nameInput, 'Name cannot exceed 5 words.');
        nameInput?.focus(); return false;
    }
    if (!classInput?.value) {
        _fe(errClass, classInput, 'Please select your class.');
        classInput?.focus(); return false;
    }
    const school = schoolGroup?.classList.contains('show-other')
        ? (schoolOtherInput?.value.trim() || '')
        : (schoolInput?.value || '');
    if (!school) {
        _fe(errSchool, schoolInput, 'Please select or enter your school.');
        schoolInput?.focus(); return false;
    }
    if (!_gender) {
        if (errGender) { errGender.textContent = 'Please select your gender.'; errGender.classList.add('show'); }
        document.querySelectorAll('.pill-btn[data-group="gender"]').forEach(b => b.classList.add('has-error'));
        return false;
    }
    return true;
}

// ── Step 2 validation ─────────────────────────────────────────────
function _v2() {
    _ce(errContactNumber, contactNumberInput); _ce(errEmail, emailInput);
    _ce(errPassword, passwordInput); _ce(errConfirm, confirmInput);
    if (errContactType) { errContactType.textContent = ''; errContactType.classList.remove('show'); }
    document.querySelectorAll('.pill-btn[data-group="contactType"]').forEach(b => b.classList.remove('has-error'));

    if (!_contactType) {
        if (errContactType) { errContactType.textContent = 'Please select contact type.'; errContactType.classList.add('show'); }
        document.querySelectorAll('.pill-btn[data-group="contactType"]').forEach(b => b.classList.add('has-error'));
        return false;
    }
    const ph = contactNumberInput?.value.trim() || '';
    if (!ph) { _fe(errContactNumber, contactNumberInput, 'Please enter a contact number.'); contactNumberInput?.focus(); return false; }
    if (!/^[0-9]{10}$/.test(ph)) { _fe(errContactNumber, contactNumberInput, 'Must be exactly 10 digits.'); contactNumberInput?.focus(); return false; }

    const em = emailInput?.value.trim() || '';
    if (!em) { _fe(errEmail, emailInput, 'Please enter your email address.'); emailInput?.focus(); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { _fe(errEmail, emailInput, 'Please enter a valid email.'); emailInput?.focus(); return false; }

    const pw = passwordInput?.value || '';
    if (!pw) { _fe(errPassword, passwordInput, 'Please enter a password.'); passwordInput?.focus(); return false; }
    if (pw.length < 6) { _fe(errPassword, passwordInput, 'Password must be at least 6 characters.'); passwordInput?.focus(); return false; }

    const cf = confirmInput?.value || '';
    if (!cf) { _fe(errConfirm, confirmInput, 'Please confirm your password.'); confirmInput?.focus(); return false; }
    if (pw && pw !== cf) { _fe(errConfirm, confirmInput, 'Passwords do not match.'); confirmInput?.focus(); return false; }

    return true;
}

// ── Populate review (Step 3) ──────────────────────────────────────
function _review() {
    const school = schoolGroup?.classList.contains('show-other')
        ? (schoolOtherInput?.value.trim() || '—')
        : (schoolInput?.value || '—');
    const pw = passwordInput?.value || '';

    const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '\u2014'; };

    s('rv-name', nameInput?.value.trim() || '\u2014');
    s('rv-class', classInput?.value ? `Class ${classInput.value}` : '\u2014');
    s('rv-school', school);
    s('rv-phone', contactNumberInput?.value.trim() || '\u2014');
    s('rv-email', emailInput?.value.trim());
    const rvPw = document.getElementById('rv-password');
    if (rvPw) rvPw.textContent = pw ? '•'.repeat(Math.min(pw.length, 12)) : '—';
}

// ── Nav buttons ───────────────────────────────────────────────────
btnNext1?.addEventListener('click', () => { if (_v1()) _goToStep(2); });
btnBack2?.addEventListener('click', () => _goToStep(1, 'back'));
btnNext2?.addEventListener('click', () => { if (_v2()) { _review(); _goToStep(3); } });
btnBack3?.addEventListener('click', () => _goToStep(2, 'back'));

// ── Form submit ───────────────────────────────────────────────────
form?.addEventListener('submit', async e => {
    e.preventDefault();
    _hideError();
    if (!_v1() || !_v2()) { _showError('Please fix the errors before submitting.'); return; }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const selectedClass = classInput.value;
    const selectedSchool = schoolGroup?.classList.contains('show-other')
        ? (schoolOtherInput?.value.trim() || '')
        : schoolInput.value;

    _setLoading(true);
    try {
        const result = await API.register(name, email, password, {
            class: selectedClass, school: selectedSchool,
            gender: _gender, contactType: _contactType,
            contactNumber: contactNumberInput.value.trim()
        });
        if (result.success) {
            form.classList.add('hidden');
            successDiv.classList.remove('hidden');
            form.parentElement?.querySelector('.border-t')?.classList.add('hidden');
        } else {
            _showError(result.error || 'Registration failed. Please try again.');
        }
    } catch (err) {
        const m = err.message || '';
        _showError(m.includes('fetch') || m.includes('Network')
            ? 'Cannot connect to server. Check your internet connection.'
            : m || 'Registration failed. Please try again.');
    } finally {
        _setLoading(false);
    }
});

// ── UI helpers ────────────────────────────────────────────────────
function _showError(msg) { if (errorDiv) { errorDiv.textContent = msg; errorDiv.classList.remove('hidden'); } }
function _hideError() { if (errorDiv) { errorDiv.classList.add('hidden'); errorDiv.textContent = ''; } }
function _setLoading(on) {
    if (!registerBtn) return;
    registerBtn.classList.toggle('btn-loading', on);
    registerBtn.disabled = on;
}

// ── Autofill / pre-filled label detection ─────────────────────────
// Ensures floating labels float when browser autofills or pre-fills inputs
setTimeout(() => {
    document.querySelectorAll('.fl-input').forEach(inp => {
        if (inp.value && inp.value.length > 0) inp.classList.add('has-value');
        inp.addEventListener('input', () => inp.classList.toggle('has-value', !!inp.value));
        inp.addEventListener('change', () => inp.classList.toggle('has-value', !!inp.value));
    });
}, 250);


