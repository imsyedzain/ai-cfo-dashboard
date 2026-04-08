/**
 * AI CFO Dashboard — Standalone Seed Script
 * Requires: Node.js 18+ (uses built-in fetch, no npm install needed)
 *
 * Run: node supabase/seed-standalone.mjs
 */

const SUPABASE_URL = "https://ujwkqgzvvfbyleuiqbcf.supabase.co";
const SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqd2txZ3p2dmZieWxldWlxYmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTUwNjg0NywiZXhwIjoyMDkxMDgyODQ3fQ.dNjN5QcEB-EEK06LP0NrWZLyN1lcJspMeW2snBGL4qI";

const HEADERS = {
  "apikey":       SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  "Prefer":       "return=representation",
};

// ── REST helpers ─────────────────────────────────────────────────────────
async function insert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT ${table} failed [${res.status}]: ${text}`);
  }
  return res.json();
}

async function deleteAll(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: { ...HEADERS, Prefer: "" },
  });
  if (!res.ok && res.status !== 404) {
    console.warn(`  WARN: Could not clear ${table} (${res.status})`);
  }
}

async function checkSchema() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/organizations?limit=1`, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(
      `❌ Tables not found (${res.status}). Please run supabase/schema.sql in your Supabase SQL Editor first!`
    );
  }
  console.log("  ✅ Schema verified — tables exist\n");
}

// ── Date helper ───────────────────────────────────────────────────────────
function randomDate(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.floor(Math.random() * 28) + 1);
  d.setHours(Math.floor(Math.random() * 10) + 8);
  return d.toISOString();
}

// ── Batch insert (50 rows at a time to stay within API limits) ────────────
async function batchInsert(table, rows, label) {
  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insert(table, rows.slice(i, i + chunkSize));
    inserted += Math.min(chunkSize, rows.length - i);
    process.stdout.write(`\r  ${label}: ${inserted}/${rows.length}`);
  }
  console.log(`\r  ✅ ${label}: ${inserted} rows inserted`);
}

// ── Main ─────────────────────────────────────────────────────────────────
async function seed() {
  console.log("\n🚀 AI CFO Dashboard — Database Seed");
  console.log("=" .repeat(50));

  await checkSchema();

  // Clear existing data
  console.log("🧹 Clearing existing seed data…");
  await deleteAll("expenses");
  await deleteAll("revenue");
  await deleteAll("projects");
  await deleteAll("users");
  await deleteAll("organizations");
  console.log("  ✅ Cleared\n");

  // 1. Organizations
  console.log("🏢 Creating organizations…");
  const orgs = await insert("organizations", [
    { name: "7-Eleven Global" },
    { name: "Home Depot Field Ops" },
  ]);
  const org711 = orgs.find(o => o.name === "7-Eleven Global");
  const orgHD  = orgs.find(o => o.name === "Home Depot Field Ops");
  console.log(`  ✅ ${org711.name}  |  ${orgHD.name}\n`);

  // 2. Technicians
  console.log("👷 Creating technicians…");
  const techs = await insert("users", [
    { org_id: org711.id, full_name: "Marcus Thorne", email: "m.thorne@field.com", role: "technician" },
    { org_id: org711.id, full_name: "Sarah Miller",  email: "s.miller@field.com", role: "technician" },
    { org_id: orgHD.id,  full_name: "David Chen",    email: "d.chen@field.com",   role: "technician" },
    { org_id: orgHD.id,  full_name: "Aisha Patel",   email: "a.patel@field.com",  role: "technician" },
  ]);
  techs.forEach(t => console.log(`  ${t.full_name}`));
  console.log();

  // 3. Projects
  console.log("📍 Creating project locations…");
  const locations = await insert("projects", [
    { org_id: org711.id, name: "Store #24051 - Austin, TX", budget: 150000, status: "active" },
    { org_id: org711.id, name: "Store #39201 - Denver, CO", budget: 135000, status: "active" },
    { org_id: orgHD.id,  name: "HD #1102 - Seattle, WA",    budget: 220000, status: "active" },
    { org_id: orgHD.id,  name: "HD #0899 - Miami, FL",      budget: 210000, status: "active" },
  ]);
  locations.forEach(p => console.log(`  ${p.name}`));
  console.log();

  // 4. Generate 24 months of survey data
  console.log("📊 Building 24 months of survey data…");
  const revenueRows = [];
  const expenseRows = [];

  for (let monthOffset = 23; monthOffset >= 0; monthOffset--) {
    const inflation = monthOffset < 12 ? 1.15 : 1.0;

    for (const store of locations) {
      const validTechs = techs.filter(t => t.org_id === store.org_id);
      const tech = validTechs[Math.floor(Math.random() * validTechs.length)];
      const surveyDate = randomDate(monthOffset);
      const baseFee = store.org_id === orgHD.id ? 12500 : 8500;

      // Revenue
      revenueRows.push({
        project_id:  store.id,
        amount:      Math.round((baseFee + Math.random() * 1000) * 100) / 100,
        description: "Monthly Lidar & Imaging Survey",
        date:        surveyDate,
      });

      // Standard trip expenses
      const trip = [
        ["Flight",    Math.round((350 + Math.random() * 250) * inflation * 100) / 100],
        ["Hotel",     Math.round((400 + Math.random() * 300) * inflation * 100) / 100],
        ["Meals",     Math.round((150 + Math.random() * 100) * inflation * 100) / 100],
        ["Equipment", 200.00],
      ];

      for (const [cat, amt] of trip) {
        let finalAmt = amt;
        let finalCat = cat;

        // ANOMALY 1 — Marcus Thorne: $7,500 unauthorized hardware (8 months ago)
        if (tech.full_name === "Marcus Thorne" && monthOffset === 8 && cat === "Equipment") {
          finalAmt = 7500.00;
          finalCat = "Unauthorized Hardware Purchase";
        }

        // ANOMALY 2 — Aisha Patel: duplicate flight billing (3 months ago)
        if (tech.full_name === "Aisha Patel" && monthOffset === 3 && cat === "Flight") {
          expenseRows.push({          // the duplicate
            project_id: store.id, user_id: tech.id,
            amount: finalAmt, category: "Flight", date: surveyDate,
          });
        }

        expenseRows.push({
          project_id: store.id, user_id: tech.id,
          amount: finalAmt, category: finalCat, date: surveyDate,
        });
      }
    }
  }
  console.log(`  Built ${revenueRows.length} revenue + ${expenseRows.length} expense rows\n`);

  // Insert data
  console.log("💾 Inserting revenue records…");
  await batchInsert("revenue", revenueRows, "Revenue");
  console.log();

  console.log("💾 Inserting expense records…");
  await batchInsert("expenses", expenseRows, "Expenses");

  console.log("\n" + "=".repeat(50));
  console.log("✅  SEED COMPLETE!");
  console.log(`    Revenue rows  : ${revenueRows.length}`);
  console.log(`    Expense rows  : ${expenseRows.length}`);
  console.log("    Anomalies     : Marcus Thorne ($7,500 hardware)");
  console.log("                    Aisha Patel (duplicate flight)");
  console.log("=".repeat(50) + "\n");
}

seed().catch(err => { console.error("\n" + err.message); process.exit(1); });
