-- ReFound backend schema (PostgreSQL).
-- Run with: npm run db:init   (safe to run more than once)

-- Reference codes are sequential and human-readable: RF-0149, RF-0150, ...
-- Starts at 149 because the mock records in the frontend end at RF-0148.
CREATE SEQUENCE IF NOT EXISTS item_ref_seq START WITH 149;

CREATE TABLE IF NOT EXISTS users (
  id            bigserial PRIMARY KEY,
  name          text        NOT NULL,
  student_id    text,
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  role          text        NOT NULL DEFAULT 'student'
                            CHECK (role IN ('student', 'staff', 'supervisor')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id            bigserial   PRIMARY KEY,
  ref           text        NOT NULL UNIQUE,
  title         text        NOT NULL,
  description   text        NOT NULL,
  category      text        NOT NULL,
  location      text        NOT NULL,
  found_on      date        NOT NULL DEFAULT CURRENT_DATE,
  status        text        NOT NULL DEFAULT 'available'
                            CHECK (status IN ('available', 'claimed', 'handed_over')),
  -- Staff-only ownership detail (serial number, contents, marks).
  -- This column must never appear in a public response.
  private_note  text,
  registered_by bigint      NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claims (
  id          bigserial   PRIMARY KEY,
  item_id     bigint      NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id     bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Both answer columns are private: only staff may read them.
  description text        NOT NULL,
  identifying text        NOT NULL,
  lost_on     date,
  lost_where  text,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by bigint      REFERENCES users(id),
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- One claim per student per item.
  UNIQUE (item_id, user_id)
);

CREATE TABLE IF NOT EXISTS handovers (
  id               bigserial   PRIMARY KEY,
  item_id          bigint      NOT NULL REFERENCES items(id),
  claim_id         bigint      NOT NULL REFERENCES claims(id),
  handed_over_by   bigint      NOT NULL REFERENCES users(id),
  identity_checked boolean     NOT NULL CHECK (identity_checked),
  identity_note    text,
  handed_over_at   timestamptz NOT NULL DEFAULT now(),
  -- An item is handed over once, against one claim.
  UNIQUE (claim_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial   PRIMARY KEY,
  actor_id   bigint      REFERENCES users(id),
  action     text        NOT NULL,
  entity     text        NOT NULL,
  entity_id  text,
  detail     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS items_status_found_on_idx ON items (status, found_on DESC);
CREATE INDEX IF NOT EXISTS claims_item_id_idx        ON claims (item_id);
CREATE INDEX IF NOT EXISTS claims_status_idx         ON claims (status);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx      ON audit_log (entity, entity_id);
