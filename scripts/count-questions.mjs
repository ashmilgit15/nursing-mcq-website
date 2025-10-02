import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const questionsPath = path.resolve(__dirname, '..', 'src', 'questions.json')

try {
	const raw = fs.readFileSync(questionsPath, 'utf-8')
	const data = JSON.parse(raw)
	const subjects = Object.keys(data)
	let totalAll = 0
	for (const s of subjects) {
		const arr = Array.isArray(data[s]) ? data[s] : []
		console.log(`${s}: ${arr.length}`)
		totalAll += arr.length
	}
	console.log(`Total questions across all subjects: ${totalAll}`)
} catch (e) {
	console.error('Failed to read or parse questions.json:', e.message)
	process.exit(1)
}








