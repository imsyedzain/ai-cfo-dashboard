-- ============================================================
-- AI CFO Dashboard — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Organizations (Enterprise Clients)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Technicians & Managers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'technician'
);

-- 3. Projects (Store Locations)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'completed', 'on_hold')) DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE
);

-- 4. Revenue (Survey Fees)
CREATE TABLE revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Expenses (Travel & Equipment)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Performance Indexes
-- ============================================================
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_revenue_project_id ON revenue(project_id);
CREATE INDEX idx_revenue_date ON revenue(date);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- ============================================================
-- Enable Row-Level Security (best practice)
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow full access for service_role (used by our API)
CREATE POLICY "service_role_all" ON organizations FOR ALL USING (true);
CREATE POLICY "service_role_all" ON users FOR ALL USING (true);
CREATE POLICY "service_role_all" ON projects FOR ALL USING (true);
CREATE POLICY "service_role_all" ON revenue FOR ALL USING (true);
CREATE POLICY "service_role_all" ON expenses FOR ALL USING (true);
