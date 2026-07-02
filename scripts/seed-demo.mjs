// Seed jobs_temp.json with fictional demo jobs (data/demo-jobs.json) so a
// fresh clone shows the dashboard without the Chrome extension.
//
//   npm run demo            -> seeds only when jobs_temp.json is missing/empty
//   npm run demo -- --force -> overwrites existing data (asks nothing; be sure)
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

fs.copyFileSync(source, target)
const count = JSON.parse(fs.readFileSync(target, 'utf8')).length
console.log(`Seeded ${count} demo jobs into jobs_temp.json.`)
console.log('Start the app (npm run dev) and run 本地分析 on any job — no API keys needed.')
