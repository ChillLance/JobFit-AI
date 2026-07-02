// Seed jobs_temp.json with fictional demo jobs (data/demo-jobs.json) so a
// fresh clone shows the dashboard without the Chrome extension.
//
//   npm run demo            -> seeds only when jobs_temp.json is missing/empty
//   npm run demo -- --force -> overwrites existing data
//
// Safety: --force NEVER discards real data silently. Whatever is currently in
// jobs_temp.json is copied to a timestamped jobs_temp.backup-<ISO>.json first,
// so an accidental --force is always recoverable.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const target = path.join(root, 'jobs_temp.json')
const source = path.join(root, 'data', 'demo-jobs.json')
const force = process.argv.includes('--force')

const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').trim() : ''
const hasData = existing && existing !== '[]'

if (hasData && !force) {
  console.log('jobs_temp.json already has data — not touching it.')
  console.log('Use `npm run demo -- --force` to overwrite with demo jobs.')
  process.exit(0)
}

if (hasData && force) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(root, `jobs_temp.backup-${stamp}.json`)
  fs.writeFileSync(backupPath, existing, 'utf8')
  console.log(`Backed up existing jobs_temp.json to ${path.basename(backupPath)} before overwriting.`)
}

fs.copyFileSync(source, target)
const count = JSON.parse(fs.readFileSync(target, 'utf8')).length
console.log(`Seeded ${count} demo jobs into jobs_temp.json.`)
console.log('Start the app (npm run dev) and run 本地分析 on any job — no API keys needed.')
