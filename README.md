# Refound — Campus Lost and Found

### Lost something on campus? Find it here.

## Problem Statement

Students often lose their belongings on campus and do not know whether someone has found them. They usually have to visit the help desk or ask other students in group chats.

There is no simple way to check which items have been found. Paper registers and spreadsheets can also be difficult to manage and search.

## Solution

Campus Lost and Found is a web application that helps students find their lost belongings.

Desk volunteers can add details of found items to the application. Students can browse and search for items using keywords, categories, and locations.

Students can submit a claim if they find an item that belongs to them. Desk volunteers will verify the ownership and student identity before handing over the item.

Private details will only be visible to authorized staff and will never be displayed publicly.

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js with Express.js
- **Database:** MongoDB
- **DevOps:** Docker and GitHub Actions
- **Deployment:** Render
- **Version Control:** Git and GitHub

## What We Are Going to Build

We are going to build a simple website with two main sections:

### 1. Student Section
- View the list of found items.
- Search for items using keywords.
- Filter items by category and location.
- View item descriptions.
- Submit a claim to collect an item.

### 2. Staff Section
- Add newly found items.
- Generate a unique reference number for each item.
- View and manage student claims.
- Approve or reject claims.
- Verify student identity before handing over an item.
- Mark items as handed over.

### 3. Data Storage and Security
- Store item and claim details in PostgreSQL.
- Keep private ownership details confidential.
- Allow only authorized staff to manage claims and handovers.
- Maintain records even after application restarts or updates.

## Application Workflow

1. Staff adds a found item.
2. The item appears in the public listing.
3. Student searches for the item.
4. Student submits a claim.
5. Staff verifies the student's ownership and identity.
6. Staff hands over the item and updates its status.

## Team Details

- **Team Number:** 04

### Team Members

1. Danushri Prakash
2. Jeevan_HD