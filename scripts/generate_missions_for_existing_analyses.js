/*
  Script to generate missions for existing analysis_runs that don't have missions yet.
  Usage: from backend folder:
    node scripts/generate_missions_for_existing_analyses.js
  Options:
    --dry   : do not insert, only report what would be created
    --limit N : limit number of analyses to process

  It reads DB config from backend/.env
*/

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

function determineSeverity(tool, finding) {
  try {
    switch ((tool || '').toLowerCase()) {
      case 'spotbugs':
        const priority = finding?.$?.priority || finding?.priority;
        if (priority === '1' || priority === 1) return 'high';
        if (priority === '2' || priority === 2) return 'medium';
        return 'low';
      case 'pmd':
        const pmdPriority = finding?.priority;
        if (pmdPriority === '1' || pmdPriority === '2' || pmdPriority === 1 || pmdPriority === 2) return 'high';
        if (pmdPriority === '3' || pmdPriority === 3) return 'medium';
        return 'low';
      case 'semgrep':
        const sev = (finding?.severity || finding?.extra?.severity || '').toString().toLowerCase();
        if (sev === 'error') return 'high';
        if (sev === 'warning') return 'medium';
        return 'low';
      case 'eslint':
        const es = finding?.severity;
        if (es === 2 || es === '2') return 'high';
        if (es === 1 || es === '1') return 'medium';
        return 'low';
      default:
        return 'medium';
    }
  } catch (err) {
    return 'medium';
  }
}

function extractFindingsObject(findings) {
  // findings might be stored as the processed object with .results or as a raw array
  if (!findings) return {};
  if (findings.results && typeof findings.results === 'object') return findings.results;
  return findings;
}

async function main() {
  const dry = process.argv.includes('--dry');
  const limitArgIndex = process.argv.indexOf('--limit');
  const limit = limitArgIndex >= 0 && process.argv[limitArgIndex + 1] ? parseInt(process.argv[limitArgIndex + 1]) : null;

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'analysis_user',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || 'analysis_db',
  });

  await client.connect();
  console.log('Connected to DB');

  try {
    // Get analyses that don't have missions
    let q = `SELECT ar.id, ar.findings FROM analysis_runs ar WHERE NOT EXISTS (SELECT 1 FROM missions m WHERE m.analysis_run_id = ar.id)`;
    if (limit) q += ` LIMIT ${limit}`;

    const res = await client.query(q);
    console.log(`Found ${res.rows.length} analyses without missions`);

    let totalCreated = 0;
    for (const row of res.rows) {
      const analysisId = row.id;
      const findings = row.findings;
      const results = extractFindingsObject(findings);

      const missionsToInsert = [];

      // results might be an object where keys are tools
      if (results && typeof results === 'object') {
        for (const toolKey of Object.keys(results)) {
          try {
            const toolEntry = results[toolKey];
            // toolEntry may contain .findings or be an array
            const arr = Array.isArray(toolEntry.findings) ? toolEntry.findings : (Array.isArray(toolEntry) ? toolEntry : (toolEntry.findings || []));
            if (!Array.isArray(arr)) continue;

            for (const f of arr) {
              const filePath = f.path || f.file || f.sourcefile || f.fileName || f.filename || (f['$'] && f['$'].sourcefile) || null;
              const start = f.line || (f.start && f.start.line) || f.sourceLine?.beginline || f.startLine || null;
              const end = f.end?.line || f.sourceLine?.endline || f.endLine || null;
              const severity = determineSeverity(toolKey, f);
              const title = `${severity.toUpperCase()} - ${toolKey} - ${ (f.message || f.rule || f.type || f.check_id || '').toString().slice(0,120)}`;
              const description = (f.message || f.description || JSON.stringify(f)).toString().slice(0,1000);

              missionsToInsert.push({ analysisId, title, description, filePath, start: start ? Number(start) : null, end: end ? Number(end) : null, severity, metadata: { tool: toolKey, raw: f } });
            }
          } catch (err) {
            console.warn('Error processing tool', toolKey, err.message || err);
          }
        }
      } else if (Array.isArray(results)) {
        for (const f of results) {
          const filePath = f.path || f.file || f.sourcefile || f.fileName || f.filename || (f['$'] && f['$'].sourcefile) || null;
          const start = f.line || (f.start && f.start.line) || f.sourceLine?.beginline || f.startLine || null;
          const severity = 'medium';
          const title = `${severity.toUpperCase()} - ${ (f.tool || 'tool') } - ${ (f.message || f.rule || '').toString().slice(0,120)}`;
          const description = (f.message || f.description || JSON.stringify(f)).toString().slice(0,1000);
          missionsToInsert.push({ analysisId, title, description, filePath, start: start ? Number(start) : null, end: null, severity, metadata: { raw: f } });
        }
      }

      if (missionsToInsert.length === 0) {
        console.log(`Analysis ${analysisId}: no missions generated`);
        continue;
      }

      console.log(`Analysis ${analysisId}: will create ${missionsToInsert.length} missions`);
      if (dry) {
        totalCreated += missionsToInsert.length;
        continue;
      }

      for (const m of missionsToInsert) {
        const insertQ = `INSERT INTO missions (analysis_run_id, title, description, file_path, line_start, line_end, severity, status, metadata, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,now(),now()) RETURNING id`;
        const vals = [m.analysisId, m.title, m.description, m.filePath, m.start, m.end, m.severity, JSON.stringify(m.metadata)];
        try {
          const r = await client.query(insertQ, vals);
          totalCreated += 1;
        } catch (err) {
          console.error('Error inserting mission for analysis', analysisId, err.message || err);
        }
      }
    }

    console.log('Completed. Total missions created:', totalCreated);
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
