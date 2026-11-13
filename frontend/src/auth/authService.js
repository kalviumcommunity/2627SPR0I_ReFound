// Auth service — FRONTEND MOCK.
//
// There is no backend yet. These functions simulate the API so the screens can
// be built and tested. When the Express auth API exists, replace the bodies of
// signup() and login() with real fetch() calls — the screens do not need to change.
//
// Passwords are never stored by this mock. Only the signed-in user's public
// profile (name, email, role) is kept for the session.

const SESSION_KEY = "refound.session";
const MOCK_USERS_KEY = "refound.mockUsers";
const FAKE_DELAY_MS = 600;

// Demo staff accounts so the Staff tab can be tried before the backend exists.
const DEMO_STAFF = [
  { name: "Help Desk", email: "staff@campus.edu", role: "staff" },
  { name: "Desk Supervisor", email: "supervisor@campus.edu", role: "supervisor" },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readMockUsers() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeMockUsers(users) {
  try {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  } catch {
    // Storage unavailable (private mode) — the mock still works for this page load.
  }
}

/** Register a student. Resolves with the new user's public profile. */
export async function signup({ name, studentId, email }) {
  // TODO(backend): POST /api/auth/signup { name, studentId, email, password }
  await wait(FAKE_DELAY_MS);
  const users = readMockUsers();
  const normalized = email.trim().toLowerCase();
  if (users.some((u) => u.email === normalized)) {
    throw new Error("An account with this email already exists. Try logging in.");
  }
  const user = { name: name.trim(), studentId: studentId.trim(), email: normalized, role: "student" };
  writeMockUsers([...users, user]);
  return user;
}

/** Log in as a student or staff member. Resolves with the user's public profile. */
export async function login({ email, role }) {
  // TODO(backend): POST /api/auth/login { email, password, role }
  // The real API must check the role on the server, not trust the client.
  await wait(FAKE_DELAY_MS);
  const normalized = email.trim().toLowerCase();

  if (role === "staff") {
    const staff = DEMO_STAFF.find((s) => s.email === normalized);
    if (!staff) {
      throw new Error("Staff accounts are created by the help desk. Check your email or contact your supervisor.");
    }
    return staff;
  }

  const user = readMockUsers().find((u) => u.email === normalized);
  if (!user) {
    throw new Error("We couldn't find a student account with that email. Sign up first.");
  }
  return user;
}

export function saveSession(user) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
