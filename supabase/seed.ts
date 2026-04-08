/**
 * AI CFO Dashboard — Data Seed Script
 *
 * Generates 24 months of realistic operational data including:
 * - 2 organizations (7-Eleven, Home Depot)
 * - 4 technicians
 * - 4 project locations
 * - Revenue from monthly surveys
 * - Expenses (flights, hotels, meals, equipment)
 * - Intentional anomalies for fraud detection testing:
 *   - Marcus Thorne: $7,500 unauthorized hardware purchase
 *   - Aisha Patel: Duplicate flight billings
 *
 * Usage: npx ts-node --esm supabase/seed.ts
 */

import { createClient } from '@supabase/supabase-js';

// ---------- Configuration ----------
// Replace these with your own Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------- Types ----------
interface Organization {
  id: string;
  name: string;
}
interface User {
  id: string;
  org_id: string;
  full_name: string;
  role: string;
  email: string;
}
interface Project {
  id: string;
  org_id: string;
  name: string;
  budget: number;
}

function getRandomDate(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date.toISOString();
}

async function seed() {
  console.log('Starting 24-month data seed...\n');

  // 1. Create Organizations
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .insert([{ name: '7-Eleven Global' }, { name: 'Home Depot Field Ops' }])
    .select();

  if (orgErr || !orgs) throw new Error(`Org Error: ${orgErr?.message}`);

  const org711 = orgs.find((o: Organization) => o.name === '7-Eleven Global')!;
  const orgHD = orgs.find((o: Organization) => o.name === 'Home Depot Field Ops')!;

  // 2. Create Technicians
  const { data: techs, error: techErr } = await supabase
    .from('users')
    .insert([
      { org_id: org711.id, full_name: 'Marcus Thorne', email: 'm.thorne@field.com', role: 'technician' },
      { org_id: org711.id, full_name: 'Sarah Miller', email: 's.miller@field.com', role: 'technician' },
      { org_id: orgHD.id, full_name: 'David Chen', email: 'd.chen@field.com', role: 'technician' },
      { org_id: orgHD.id, full_name: 'Aisha Patel', email: 'a.patel@field.com', role: 'technician' },
    ])
    .select();

  if (techErr || !techs) throw new Error(`Tech Error: ${techErr?.message}`);

  // 3. Create Projects (Store Locations)
  const { data: locations, error: locErr } = await supabase
    .from('projects')
    .insert([
      { org_id: org711.id, name: 'Store #24051 - Austin, TX', budget: 150000 },
      { org_id: org711.id, name: 'Store #39201 - Denver, CO', budget: 135000 },
      { org_id: orgHD.id, name: 'HD #1102 - Seattle, WA', budget: 220000 },
      { org_id: orgHD.id, name: 'HD #0899 - Miami, FL', budget: 210000 },
    ])
    .select();

  if (locErr || !locations) throw new Error(`Location Error: ${locErr?.message}`);

  console.log('Generating 24 months of survey data...\n');

  // 4. Generate 24 months of data
  for (let monthOffset = 23; monthOffset >= 0; monthOffset--) {
    const inflationMultiplier = monthOffset < 12 ? 1.15 : 1.0;

    for (const store of locations) {
      const storeOrgId = store.org_id;
      const validTechs = techs.filter((t: User) => t.org_id === storeOrgId);
      const activeTech = validTechs[Math.floor(Math.random() * validTechs.length)];

      const surveyDate = getRandomDate(monthOffset);
      const baseFee = storeOrgId === orgHD.id ? 12500 : 8500;

      // Revenue entry
      await supabase.from('revenue').insert({
        project_id: store.id,
        amount: baseFee + Math.floor(Math.random() * 1000),
        description: 'Monthly Lidar & Imaging Survey',
        date: surveyDate,
      });

      // Trip expenses
      const tripExpenses = [
        { cat: 'Flight', amt: (350 + Math.random() * 250) * inflationMultiplier },
        { cat: 'Hotel', amt: (400 + Math.random() * 300) * inflationMultiplier },
        { cat: 'Meals', amt: (150 + Math.random() * 100) * inflationMultiplier },
        { cat: 'Equipment', amt: 200 },
      ];

      for (const item of tripExpenses) {
        let finalAmount = item.amt;
        let finalCategory = item.cat;

        // ANOMALY 1: Marcus Thorne unauthorized hardware purchase (~8 months ago)
        if (activeTech.full_name === 'Marcus Thorne' && monthOffset === 8 && item.cat === 'Equipment') {
          finalAmount = 7500;
          finalCategory = 'Unauthorized Hardware Purchase';
        }

        // ANOMALY 2: Aisha Patel duplicate flight billing (~3 months ago)
        if (activeTech.full_name === 'Aisha Patel' && monthOffset === 3 && item.cat === 'Flight') {
          await supabase.from('expenses').insert({
            project_id: store.id,
            user_id: activeTech.id,
            amount: finalAmount,
            category: 'Flight',
            date: surveyDate,
          });
        }

        await supabase.from('expenses').insert({
          project_id: store.id,
          user_id: activeTech.id,
          amount: Number(finalAmount.toFixed(2)),
          category: finalCategory,
          date: surveyDate,
        });
      }
    }
  }

  console.log('Seed complete! 24 months of financial history generated.\n');
}

seed().catch(console.error);
