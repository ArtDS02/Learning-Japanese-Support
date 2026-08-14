import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Các file data được phép đọc/ghi qua admin (whitelist chống path traversal)
const DATA_FILES = [
  'kana',
  'kanji',
  'vocabulary',
  'grammar',
  'numbers',
  'tips-exercises',
  'jlpt-sets',
]

/**
 * Endpoint dev-only cho dashboard admin:
 *   GET  /api/admin?file=<name>  -> đọc src/data/<name>.json
 *   POST /api/admin?file=<name>  -> ghi đè src/data/<name>.json
 * Chỉ chạy khi `vite` (dev). Bản build production KHÔNG có endpoint này.
 */
function adminDataApi(): Plugin {
  return {
    name: 'admin-data-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/admin', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const file = url.searchParams.get('file') ?? ''

        const send = (code: number, body: unknown) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(typeof body === 'string' ? body : JSON.stringify(body))
        }

        if (!DATA_FILES.includes(file)) {
          return send(400, { error: `File không hợp lệ: ${file}` })
        }
        const filePath = path.resolve(process.cwd(), 'src/data', `${file}.json`)

        if (req.method === 'GET') {
          try {
            return send(200, fs.readFileSync(filePath, 'utf8'))
          } catch (e) {
            return send(500, { error: String(e) })
          }
        }

        if (req.method === 'POST') {
          let raw = ''
          req.on('data', (c) => (raw += c))
          req.on('end', () => {
            try {
              const parsed = JSON.parse(raw) // validate JSON trước khi ghi
              fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + '\n', 'utf8')
              return send(200, { ok: true })
            } catch (e) {
              return send(400, { error: `JSON không hợp lệ: ${String(e)}` })
            }
          })
          return
        }

        return send(405, { error: 'Method không hỗ trợ' })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), adminDataApi()],
})
