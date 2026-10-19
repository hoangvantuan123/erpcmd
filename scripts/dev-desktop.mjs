import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const viteCli = resolve(projectRoot, 'node_modules/vite/bin/vite.js')
const devURL = 'http://127.0.0.1:5183'
const children = []
let shuttingDown = false

function start(command, args, env = process.env) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    windowsHide: false
  })
  children.push(child)
  child.on('error', (error) => {
    console.error(`Không chạy được ${command}:`, error.message)
    shutdown(1)
  })
  child.on('exit', (code) => {
    if (!shuttingDown) shutdown(code ?? 1)
  })
  return child
}

function stop(child) {
  if (!child.pid || child.exitCode !== null) return
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    killer.unref()
  } else {
    child.kill('SIGTERM')
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) stop(child)
  process.exitCode = exitCode
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start(process.execPath, [viteCli, '--config', 'vite.config.js'])
start('go', ['run', './cmd/desktop'], {
  ...process.env,
  ERPSYN_DEV_URL: devURL
})

console.log('Đang khởi động ERPSYN Desktop ở chế độ dev…')
