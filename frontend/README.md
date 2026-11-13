# Refound — Frontend

React (Vite) frontend for Refound. Currently: landing page, student sign up, and log in (student / staff).

## Run locally

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Pages

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/signup` | Student sign up |
| `/login` | Log in as Student or Staff / Volunteer |
| `/items` | The register: public list with keyword, category and location filters |
| `/items/:ref` | Item details (public-safe fields only) |
| `/items/:ref/claim` | Private ownership claim (signed-in students only) |
| `/claims` | My claims with status (signed-in students only) |
| `/welcome` | Landing spot after login (protected) |
| `/staff` | Staff desk: counts, claims waiting, recently logged items (staff only) |
| `/staff/items/new` | Log a found item, with a staff-only ownership note (staff only) |
| `/staff/claims` | Review claims against the private record, approve/reject, record handover (staff only) |

Staff screens use [`src/services/staffService.js`](src/services/staffService.js), a mock that
mirrors the backend staff API (`POST /api/items`, `GET /api/items/:ref/claims`,
`PATCH /api/claims/:id`, `POST /api/claims/:id/handover`). Student and staff mocks share
browser storage, so a claim filed as a student appears on the staff desk in the same browser.

Item data is mocked in [`src/data/items.js`](src/data/items.js) and served through
[`src/services/itemsService.js`](src/services/itemsService.js) — swap those for API calls later.

## Auth is mocked for now

There is no backend yet. All auth calls go through
[`src/auth/authService.js`](src/auth/authService.js), which simulates the API.
Replace the bodies of `signup()` and `login()` with `fetch()` calls to the
Express API when it exists — the pages do not need to change.

- Student: sign up first, then log in with the same email.
- Staff demo: `staff@campus.edu` with any password.

The mock does not store passwords. Role checks must be done on the server.
