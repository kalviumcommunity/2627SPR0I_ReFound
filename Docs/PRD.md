# Refound — Campus Lost & Found Register

**Product Requirements Document (PRD)**  
**Team Members:** Danushri Prakash & Jeevan HD

---

## 1. Problem and Context

Students currently visit the help desk or ask in group chats to locate lost items. Staff use paper registers or spreadsheets that are difficult to search and may expose private details.

**Refound** provides a searchable public list of found items, private ownership verification, and a record of completed handovers.

## 2. Users and Stakeholders

- **Students:** Search for and claim found items.
- **Desk Volunteers:** Register found items, review claims, and record handovers.
- **Supervisors:** Oversee records and audit history.
- **Campus Administration:** Approve the application and privacy rules.

## 3. Objectives and Success Measures

| Objective | Measurable Success |
|---|---|
| Easy item search | Students can find a known item within 30 seconds during usability tests. |
| Quick registration | Staff can register a found item through a simple form. |
| Privacy and secure handover | No private fields appear in public APIs. Every handover has an approved claim and identity check. |
| Reliable storage | All records remain unchanged after application restart and redeployment. |

## 4. Project Scope

### In This Sprint

- Public item listing and search filters.
- Staff item registration.
- Unique reference codes for found items.
- Private item details for ownership verification.
- Signed-in student claims.
- Staff approval and rejection of claims.
- Identity-checked handover.
- PostgreSQL database storage, backups, and basic audit history.

### Out of Scope

- Photo matching.
- Chat functionality.
- Native mobile application.
- External campus integrations.
- Student-created lost-item reports.

### Application Workflow

1. Staff registers a found item.
2. Student searches for the item.
3. Student submits a private ownership claim.
4. Staff verifies ownership and student identity.
5. Staff records the handover.

Unclaimed records remain stored in the system.

## 5. User Stories and Acceptance Criteria

| User Story | Acceptance Criteria |
|---|---|
| Student searches for an item | Keyword, category, and location filters return matching public records. Empty results display a suitable message. |
| Student views and claims an item | Only safe item details appear publicly. Signed-in students can submit non-empty private claims. |
| Volunteer registers an item | A valid form saves the item with a unique reference code and immediately displays it publicly. |
| Staff verifies and hands over an item | Only staff can approve or reject claims. Handover requires an approved claim and a recorded identity check. All actions are logged. |
| Administrator preserves records | Item, claim, and audit records survive application restarts and redeployment. |

## 6. Feasibility and Dependencies

### Proposed Technology Stack

- **Frontend:** React.js
- **Backend:** Node.js with Express.js
- **Database:** MongoDB
- **DevOps:** Docker and GitHub Actions
- **Deployment:** Render
- **Version Control:** Git and GitHub

### Dependencies

- Hosting and database access.
- Campus sign-in approval or an approved authentication alternative.
- Approximately 50 sample found-item records.
- Campus approval of privacy rules.

### Limitations

- Only staff-entered found items are tracked.
- Student identity is checked in person.
- Photo matching and student-created lost-item reports are not included in this sprint.

### Security Measures

- HTTPS for secure communication.
- Server-side role-based access checks.
- Separate storage of private and public information.
- Restricted public API responses.
- Audit logs for important actions.
- Regular database backups.

## 7. Delivery and Validation Plan

### Team Responsibilities

| Team Member | Frontend Responsibilities | Backend Responsibilities |
|---|---|---|
| **Danushri Prakash** | Student listing, search and filters, item details, and claim form screens. | Public listing and search APIs, privacy rules, and claim submission API. |
| **Jeevan HD** | Staff dashboard, item registration, claim review, and handover screens. | Registration, verification, and handover APIs, database, and authentication. |

**Shared Responsibilities:** API integration, testing, debugging, documentation, deployment, and final demonstration.

Workload will be reviewed weekly to ensure balanced contributions.

### Four-Week Timeline

| Week | Planned Activities |
|---|---|
| **Week 1** | UI design, database schema, and API planning. |
| **Week 2** | Build assigned frontend screens and backend APIs. |
| **Week 3** | Integrate and test privacy, search, claims, and handover features. |
| **Week 4** | Fix issues, test data persistence, deploy, and prepare the final demonstration. |

### Testing and Validation

- Unit tests and role-access tests.
- Public API privacy checks.
- End-to-end claim and handover testing.
- Timed usability tests for item searching.
- Database persistence checks after restart and redeployment.

### Final Demonstration

The final demonstration will cover:

1. Staff registers a found item.
2. Student searches for the item.
3. Student submits an ownership claim.
4. Staff verifies the claim and identity.
5. Staff records the item handover.
6. Demonstrate privacy protection and persistent records.

---

**Project Name:** Refound  
**Document:** Product Requirements Document (PRD)  
**Team Members:** Danushri Prakash & Jeevan HD