-- ==============================================================================
-- Physique 57 · People Desk
-- Supabase Postgres Schema
-- ==============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing objects if recreating
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ticket_events CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP SEQUENCE IF EXISTS ticket_seq CASCADE;

-- 1. Employees (Mock HRIS / CRM lookup)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    employee_code TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Team Members (Departmental agents, leads, and heads)
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    is_team_lead BOOLEAN NOT NULL DEFAULT false,
    is_dept_head BOOLEAN NOT NULL DEFAULT false,
    out_of_office BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Ticket Number Sequence and Generator Function
CREATE SEQUENCE ticket_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    next_id INT;
    cur_year TEXT;
BEGIN
    next_id := nextval('ticket_seq');
    cur_year := to_char(CURRENT_DATE, 'YYYY');
    RETURN 'REQ-' || cur_year || '-' || LPAD(next_id::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. Tickets Table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL,
    requester_name TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    requester_employee_id TEXT,
    channel TEXT NOT NULL, -- Web Form, Email, WhatsApp, SMS, Instagram DM, Intercom Chat
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- HR, IT, Payroll, Operations, Other
    category_source TEXT NOT NULL CHECK (category_source IN ('rule', 'ai', 'manual')),
    category_confidence NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    matched_keywords TEXT[] DEFAULT '{}',
    priority TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'finalized')),
    assignee_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    urgent_flag BOOLEAN NOT NULL DEFAULT false,
    response_due_at TIMESTAMPTZ NOT NULL,
    resolve_due_at TIMESTAMPTZ NOT NULL,
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    escalation_level TEXT NOT NULL DEFAULT 'L0' CHECK (escalation_level IN ('L0', 'L1', 'L2', 'L3')),
    possible_duplicate_of TEXT,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to auto-generate ticket_number if not provided
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_ticket_number
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION set_ticket_number();

-- 5. Ticket Events (Immutable Audit Log)
CREATE TABLE ticket_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    actor TEXT NOT NULL, -- e.g., 'System Engine', 'Staff Member', 'Requester'
    action TEXT NOT NULL, -- 'created', 'assigned', 'status_change', 'reassigned', 'priority_override', 'category_override', 'note_added', 'escalated', 'reopened'
    from_value TEXT,
    to_value TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Notifications (Simulated alerts for escalation and SLA breaches)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    recipient_role TEXT NOT NULL, -- 'owner', 'team_lead', 'dept_head'
    recipient_name TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'In-App Alert', -- 'In-App Alert', 'Slack (Simulated)', 'Email (Simulated)'
    level TEXT NOT NULL, -- 'L1', 'L2', 'L3', 'P1_ALERT'
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. High-Performance Query Indexes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_resolve_due ON tickets(resolve_due_at ASC);
CREATE INDEX idx_tickets_response_due ON tickets(response_due_at ASC);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_email ON tickets(requester_email);
CREATE INDEX idx_events_ticket_id ON ticket_events(ticket_id);
CREATE INDEX idx_notifications_ticket ON notifications(ticket_id);

-- 8. Row Level Security (RLS) Configuration
-- Per specifications: Enable RLS on all tables with no public policies.
-- All operations run strictly server-side using the SUPABASE_SERVICE_ROLE_KEY.
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
