-- ==============================================================================
-- Physique 57 · People Desk
-- Seed Data
-- ==============================================================================

-- 1. Seed Employees (12 realistic employees across studios & headquarters)
INSERT INTO employees (id, name, email, employee_code, department, role) VALUES
('11111111-1111-1111-1111-111111110001', 'Ananya Sharma', 'ananya.sharma@physique57.in', 'P57-EMP-014', 'Instruction', 'Master Barre Instructor'),
('11111111-1111-1111-1111-111111110002', 'Rohan Mehta', 'rohan.mehta@physique57.in', 'P57-EMP-022', 'Operations', 'Studio Manager (Bandra)'),
('11111111-1111-1111-1111-111111110003', 'Pooja Iyer', 'pooja.iyer@physique57.in', 'P57-EMP-031', 'Instruction', 'Senior Barre Instructor'),
('11111111-1111-1111-1111-111111110004', 'Vikramaditya Roy', 'vikram.roy@physique57.in', 'P57-EMP-009', 'Marketing', 'Brand & Community Lead'),
('11111111-1111-1111-1111-111111110005', 'Sneha Kapoor', 'sneha.kapoor@physique57.in', 'P57-EMP-045', 'Operations', 'Front Desk Specialist (Khar)'),
('11111111-1111-1111-1111-111111110006', 'Kabir Verma', 'kabir.verma@physique57.in', 'P57-EMP-058', 'Finance', 'Accounts Executive'),
('11111111-1111-1111-1111-111111110007', 'Tara Alvares', 'tara.alvares@physique57.in', 'P57-EMP-019', 'Instruction', 'Barre Instructor'),
('11111111-1111-1111-1111-111111110008', 'Dev Patel', 'dev.patel@physique57.in', 'P57-EMP-063', 'Operations', 'Studio Operations Coordinator'),
('11111111-1111-1111-1111-111111110009', 'Meera Singhania', 'meera.s@physique57.in', 'P57-EMP-012', 'People', 'Talent Acquisition Partner'),
('11111111-1111-1111-1111-111111110010', 'Arjun Nambiar', 'arjun.n@physique57.in', 'P57-EMP-077', 'Instruction', 'Apprentice Trainer'),
('11111111-1111-1111-1111-111111110011', 'Natasha Sen', 'natasha.sen@physique57.in', 'P57-EMP-081', 'Marketing', 'Digital Content Producer'),
('11111111-1111-1111-1111-111111110012', 'Zayn Merchant', 'zayn.m@physique57.in', 'P57-EMP-090', 'Operations', 'Facility Maintenance Tech');

-- 2. Seed Team Members (Support queues with leads, heads, and OOO states)
INSERT INTO team_members (id, name, email, department, is_team_lead, is_dept_head, out_of_office) VALUES
-- HR Team
('22222222-2222-2222-2222-222222220001', 'Kavita Chawla', 'kavita.c@physique57.in', 'HR', false, true, false),
('22222222-2222-2222-2222-222222220002', 'Aditya Joshi', 'aditya.j@physique57.in', 'HR', true, false, false),
('22222222-2222-2222-2222-222222220003', 'Simran Bedi', 'simran.b@physique57.in', 'HR', false, false, true), -- OUT OF OFFICE
-- IT Team
('22222222-2222-2222-2222-222222220004', 'Farhan Qureshi', 'farhan.q@physique57.in', 'IT', false, true, false),
('22222222-2222-2222-2222-222222220005', 'Nisha Merchant', 'nisha.m@physique57.in', 'IT', true, false, false),
('22222222-2222-2222-2222-222222220006', 'Karan Saxena', 'karan.s@physique57.in', 'IT', false, false, false),
-- Payroll Team
('22222222-2222-2222-2222-222222220007', 'Sunita Rao', 'sunita.r@physique57.in', 'Payroll', false, true, false),
('22222222-2222-2222-2222-222222220008', 'Manish Agarwal', 'manish.a@physique57.in', 'Payroll', true, false, false),
('22222222-2222-2222-2222-222222220009', 'Gayatri Nair', 'gayatri.n@physique57.in', 'Payroll', false, false, false),
-- Operations Support
('22222222-2222-2222-2222-222222220010', 'Deepak Kulkarni', 'deepak.k@physique57.in', 'Operations', true, true, false),
('22222222-2222-2222-2222-222222220011', 'Leila Fernandes', 'leila.f@physique57.in', 'Operations', false, false, false);

-- Adjust sequence to 15 for new incoming tickets
ALTER SEQUENCE ticket_seq RESTART WITH 15;

-- 3. Seed 14 Realistic Tickets spread across past 10 days
INSERT INTO tickets (
    id, ticket_number, requester_name, requester_email, requester_employee_id,
    channel, subject, description, category, category_source, category_confidence,
    matched_keywords, priority, status, assignee_id, urgent_flag,
    response_due_at, resolve_due_at, first_response_at, resolved_at, resolution_note,
    escalation_level, possible_duplicate_of, archived, created_at, updated_at
) VALUES
-- 1. Breached P1: Salary not credited (Payroll, WhatsApp)
(
    '33333333-3333-3333-3333-333333330001', 'REQ-2026-0001', 'Ananya Sharma', 'ananya.sharma@physique57.in', 'P57-EMP-014',
    'WhatsApp', 'Salary not credited for September payroll batch', 'My bank account has not received the monthly salary credit yet. All other instructors confirmed receiving theirs yesterday. Please check urgently.',
    'Payroll', 'rule', 0.95, ARRAY['salary', 'payroll', 'not credited'], 'P1', 'open',
    '22222222-2222-2222-2222-222222220008', true,
    NOW() - INTERVAL '6 hours', NOW() - INTERVAL '2 hours', NULL, NULL, NULL,
    'L2', NULL, false, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '1 hour'
),

-- 2. Breached P2: Laptop won''t connect to studio wifi (IT, Email)
(
    '33333333-3333-3333-3333-333333330002', 'REQ-2026-0002', 'Rohan Mehta', 'rohan.mehta@physique57.in', 'P57-EMP-022',
    'Email', 'Front desk laptop disconnected from studio wifi Bandra', 'The front desk POS laptop is unable to authenticate with the internal staff Wi-Fi network. Guests cannot check-in via tablets.',
    'IT', 'rule', 0.88, ARRAY['laptop', 'wifi', 'access'], 'P2', 'active',
    '22222222-2222-2222-2222-222222220006', false,
    NOW() - INTERVAL '26 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '24 hours', NULL, NULL,
    'L2', NULL, false, NOW() - INTERVAL '28 hours', NOW() - INTERVAL '2 hours'
),

-- 3. Breaching Soon P3: Apply for 3 days leave next week (HR, Web Form)
(
    '33333333-3333-3333-3333-333333330003', 'REQ-2026-0003', 'Pooja Iyer', 'pooja.iyer@physique57.in', 'P57-EMP-031',
    'Web Form', 'Apply for 3 days annual leave next week', 'Need approval for planned annual leave from Tuesday to Thursday. Class covers have already been coordinated with Tara.',
    'HR', 'rule', 0.92, ARRAY['leave', 'holiday'], 'P3', 'open',
    '22222222-2222-2222-2222-222222220002', false,
    NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', NULL, NULL, NULL,
    'L1', NULL, false, NOW() - INTERVAL '18 hours', NOW() - INTERVAL '1 hour'
),

-- 4. Breaching Soon P2: Studio mirror cracked at Bandra (Operations, WhatsApp)
(
    '33333333-3333-3333-3333-333333330004', 'REQ-2026-0004', 'Rohan Mehta', 'rohan.mehta@physique57.in', 'P57-EMP-022',
    'WhatsApp', 'Studio mirror cracked at Bandra Studio Room 2', 'Corner mirror on wall B developed a hairline crack after morning class weight rack contact. Safety hazard for clients during evening sessions.',
    'Operations', 'rule', 0.96, ARRAY['studio', 'mirror', 'equipment'], 'P2', 'active',
    '22222222-2222-2222-2222-222222220011', true,
    NOW() - INTERVAL '5 hours', NOW() + INTERVAL '1 hour', NOW() - INTERVAL '4 hours', NULL, NULL,
    'L1', NULL, false, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '1 hour'
),

-- 5. Duplicate Ticket: Another message regarding the cracked mirror (Operations, SMS)
(
    '33333333-3333-3333-3333-333333330005', 'REQ-2026-0005', 'Rohan Mehta', 'rohan.mehta@physique57.in', 'P57-EMP-022',
    'SMS', 'Urgent Bandra Room 2 mirror repair needed', 'Following up on the broken mirror in Room 2 Bandra barre room. Please send contractor immediately.',
    'Operations', 'rule', 0.85, ARRAY['studio', 'mirror'], 'P2', 'open',
    '22222222-2222-2222-2222-222222220011', true,
    NOW() + INTERVAL '2 hours', NOW() + INTERVAL '6 hours', NULL, NULL, NULL,
    'L0', 'REQ-2026-0004', false, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour'
),

-- 6. Low Confidence / Triage Ticket: General question about parking & gym access (Other, Instagram DM)
(
    '33333333-3333-3333-3333-333333330006', 'REQ-2026-0006', 'Sneha Kapoor', 'sneha.kapoor@physique57.in', 'P57-EMP-045',
    'Instagram DM', 'Question about visitor parking and building gate access', 'Do we get free parking validation for staff attending the quarterly townhall at BKC center? Security was asking for building stickers.',
    'Other', 'rule', 0.42, ARRAY['access'], 'P4', 'open',
    NULL, false,
    NOW() + INTERVAL '14 hours', NOW() + INTERVAL '40 hours', NULL, NULL, NULL,
    'L0', NULL, false, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'
),

-- 7. Finalized: Reimbursement for class equipment resistance bands (Payroll, Web Form)
(
    '33333333-3333-3333-3333-333333330007', 'REQ-2026-0007', 'Tara Alvares', 'tara.alvares@physique57.in', 'P57-EMP-019',
    'Web Form', 'Reimbursement for class equipment resistance bands', 'Purchased replacement heavy resistance bands for advanced power barre classes. Invoice and receipt attached.',
    'Payroll', 'rule', 0.91, ARRAY['reimbursement', 'equipment'], 'P3', 'finalized',
    '22222222-2222-2222-2222-222222220009', false,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days',
    'Approved reimbursement of INR 4,850. Processed in mid-month disbursement batch.',
    'L0', NULL, false, NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days'
),

-- 8. Finalized: Sound system amp distorted during class (Operations, Intercom Chat)
(
    '33333333-3333-3333-3333-333333330008', 'REQ-2026-0008', 'Dev Patel', 'dev.patel@physique57.in', 'P57-EMP-063',
    'Intercom Chat', 'Studio sound system amplifier crackling in Khar studio', 'Bluetooth mixer channel 1 is producing static and cutting out during high beat tempo tracks.',
    'Operations', 'rule', 0.94, ARRAY['studio', 'sound system'], 'P2', 'finalized',
    '22222222-2222-2222-2222-222222220010', false,
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days',
    'AV technician replaced the 3.5mm balanced input cable and reset gain stages. Tested and confirmed operational.',
    'L0', NULL, false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'
),

-- 9. Active P3: Request for Form 16 and Tax deduction breakdown (Payroll, Email)
(
    '33333333-3333-3333-3333-333333330009', 'REQ-2026-0009', 'Kabir Verma', 'kabir.verma@physique57.in', 'P57-EMP-058',
    'Email', 'Form 16 Part B query and TDS deduction clarification', 'Need revised Form 16 copy reflecting Section 80C medical insurance deduction submitted in January declarations.',
    'Payroll', 'rule', 0.93, ARRAY['form 16', 'tax', 'tds', 'deduction'], 'P3', 'active',
    '22222222-2222-2222-2222-222222220008', false,
    NOW() + INTERVAL '6 hours', NOW() + INTERVAL '24 hours', NOW() - INTERVAL '2 hours', NULL, NULL,
    'L0', NULL, false, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '2 hours'
),

-- 10. Open P3: New instructor email password reset (IT, Web Form)
(
    '33333333-3333-3333-3333-333333330010', 'REQ-2026-0010', 'Arjun Nambiar', 'arjun.n@physique57.in', 'P57-EMP-077',
    'Web Form', 'GSuite password reset and 2FA recovery for new email', 'Locked out of Google Workspace account after changing mobile phone. Need admin 2FA bypass code.',
    'IT', 'rule', 0.90, ARRAY['password', 'login', 'email not working'], 'P3', 'open',
    '22222222-2222-2222-2222-222222220006', false,
    NOW() + INTERVAL '5 hours', NOW() + INTERVAL '22 hours', NULL, NULL, NULL,
    'L0', NULL, false, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'
),

-- 11. Finalized: Maternity and health benefits insurance card (HR, Email)
(
    '33333333-3333-3333-3333-333333330011', 'REQ-2026-0011', 'Meera Singhania', 'meera.s@physique57.in', 'P57-EMP-012',
    'Email', 'Updated medical insurance e-card with dependent addition', 'Added spouse to group health policy during annual window. Looking for e-card download link from TPA portal.',
    'HR', 'rule', 0.89, ARRAY['benefits', 'insurance', 'policy'], 'P3', 'finalized',
    '22222222-2222-2222-2222-222222220002', false,
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days',
    'Sent updated MediBuddy cashless e-cards and policy booklet via email.',
    'L0', NULL, false, NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days'
),

-- 12. Active P2: Studio iPad POS app crash during rush hour (IT, WhatsApp)
(
    '33333333-3333-3333-3333-333333330012', 'REQ-2026-0012', 'Sneha Kapoor', 'sneha.kapoor@physique57.in', 'P57-EMP-045',
    'WhatsApp', 'Studio iPad POS app crashing on member check-in', 'Mindbody check-in app crashes immediately upon opening barcode scanner. Attempted device restart without success.',
    'IT', 'rule', 0.92, ARRAY['app crash', 'software', 'studio'], 'P2', 'active',
    '22222222-2222-2222-2222-222222220005', true,
    NOW() - INTERVAL '1 hour', NOW() + INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NULL, NULL,
    'L1', NULL, false, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '2 hours'
),

-- 13. Open P3: Barre barre bracket loose in Studio A (Operations, Web Form)
(
    '33333333-3333-3333-3333-333333330013', 'REQ-2026-0013', 'Ananya Sharma', 'ananya.sharma@physique57.in', 'P57-EMP-014',
    'Web Form', 'Wall bracket loose on main barre rail Room 1', 'During 6pm sculpt class, client noticed slight wobbling on the wall support bracket near center station.',
    'Operations', 'rule', 0.95, ARRAY['studio', 'barre', 'equipment'], 'P3', 'open',
    '22222222-2222-2222-2222-222222220011', false,
    NOW() + INTERVAL '4 hours', NOW() + INTERVAL '20 hours', NULL, NULL, NULL,
    'L0', NULL, false, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'
),

-- 14. Finalized Archived: Attendance regularisation for biometric glitch (HR, Web Form - >7 days ago)
(
    '33333333-3333-3333-3333-333333330014', 'REQ-2026-0014', 'Vikramaditya Roy', 'vikram.roy@physique57.in', 'P57-EMP-009',
    'Web Form', 'Biometric punch missing on 25th September', 'Was present conducting workshop at Bandra studio but punch machine showed network error.',
    'HR', 'rule', 0.88, ARRAY['attendance regularisation', 'policy'], 'P3', 'finalized',
    '22222222-2222-2222-2222-222222220002', false,
    NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days',
    'Regularised in Darwinbox HRMS. Full day attendance approved.',
    'L0', NULL, true, -- ARCHIVED
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'
);

-- 4. Seed Audit Events (ticket_events)
INSERT INTO ticket_events (ticket_id, actor, action, from_value, to_value, note, created_at) VALUES
('33333333-3333-3333-3333-333333330001', 'OmniChannel Webhook (WhatsApp)', 'created', NULL, 'open', 'Ingested message from Ananya Sharma (+91 98200 12345). Auto-categorised as Payroll (95% confidence).', NOW() - INTERVAL '7 hours'),
('33333333-3333-3333-3333-333333330001', 'Smart Routing Engine', 'assigned', NULL, 'Manish Agarwal', 'Assigned based on least open tickets in Payroll department.', NOW() - INTERVAL '7 hours'),
('33333333-3333-3333-3333-333333330001', 'SLA Watchdog', 'escalated', 'L0', 'L1', 'First response SLA breached (>1h without first response on P1).', NOW() - INTERVAL '6 hours'),
('33333333-3333-3333-3333-333333330001', 'SLA Watchdog', 'escalated', 'L1', 'L2', 'Resolution SLA breached (>4h without resolution). Alerted Team Lead & Dept Head.', NOW() - INTERVAL '2 hours'),

('33333333-3333-3333-3333-333333330002', 'System Engine', 'created', NULL, 'open', 'Ingested email from rohan.mehta@physique57.in', NOW() - INTERVAL '28 hours'),
('33333333-3333-3333-3333-333333330002', 'Karan Saxena', 'status_change', 'open', 'active', 'Started troubleshooting remote access point controller.', NOW() - INTERVAL '24 hours'),
('33333333-3333-3333-3333-333333330002', 'SLA Watchdog', 'escalated', 'L0', 'L2', 'Resolution SLA breached (1 business day exceeded).', NOW() - INTERVAL '2 hours'),

('33333333-3333-3333-3333-333333330007', 'System Engine', 'created', NULL, 'open', 'Submitted via Web Form', NOW() - INTERVAL '6 days'),
('33333333-3333-3333-3333-333333330007', 'Gayatri Nair', 'status_change', 'open', 'active', 'Reviewing equipment purchase invoices.', NOW() - INTERVAL '5 days'),
('33333333-3333-3333-3333-333333330007', 'Gayatri Nair', 'status_change', 'active', 'finalized', 'Approved and reimbursed.', NOW() - INTERVAL '3 days');

-- 5. Seed Simulated Alerts / Notifications
INSERT INTO notifications (ticket_id, recipient_role, recipient_name, channel, level, message, is_read, created_at) VALUES
('33333333-3333-3333-3333-333333330001', 'team_lead', 'Manish Agarwal', 'In-App Alert', 'L1', 'P1 ticket REQ-2026-0001 has passed 80% SLA window with no first response.', false, NOW() - INTERVAL '6 hours'),
('33333333-3333-3333-3333-333333330001', 'dept_head', 'Sunita Rao', 'Slack (Simulated)', 'L2', 'CRITICAL BREACH: REQ-2026-0001 (Salary not credited) has breached resolution SLA!', false, NOW() - INTERVAL '2 hours'),
('33333333-3333-3333-3333-333333330002', 'team_lead', 'Nisha Merchant', 'In-App Alert', 'L2', 'SLA BREACH: REQ-2026-0002 (Studio wifi disconnected) has exceeded 1 business day resolution.', false, NOW() - INTERVAL '2 hours'),
('33333333-3333-3333-3333-333333330004', 'owner', 'Leila Fernandes', 'In-App Alert', 'L1', 'Warning: REQ-2026-0004 (Cracked mirror) has elapsed 80% of resolution SLA.', false, NOW() - INTERVAL '1 hour');
