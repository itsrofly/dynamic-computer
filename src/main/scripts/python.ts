import { exec } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'

type Architecture =
  | 'arm'
  | 'arm64'
  | 'ia32'
  | 'loong64'
  | 'mips'
  | 'mipsel'
  | 'ppc'
  | 'ppc64'
  | 'riscv64'
  | 's390'
  | 's390x'
  | 'x64'

type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd'

interface Context {
  appOutDir: string
  electronPlatformName: Platform
  arch: Architecture
}

// Promisify exec: Run commands asynchronously
const execPromise = promisify(exec)

export async function isPythonInstalled(dir: string): Promise<boolean> {
  try {
    // Command to get python version
    const command = join(dir, 'python', 'bin', 'python --version')

    // Execute the command
    const { stderr } = await execPromise(command)

    // If there is an error, python is not installed
    if (stderr) {
      console.error(`Stderr: ${stderr}`)
      return false
    }
    return true
  } catch (error) {
    return false
  }
}

function unpackPython(url: string, dir: string, terminal: 'ps' | 'sh'): void {
  // Paths for the downloaded files
  const tar = join(dir, 'python.tar.gz') // For linux and darwin
  const zip = join(dir, 'python.zip') // For windows

  const command =
    terminal === 'ps'
      ? `
  powershell -Command "
  Invoke-WebRequest -Uri '${url}' -OutFile '${zip}';
  Expand-Archive -Path '${zip}' -DestinationPath '${dir}';
  Remove-Item '${zip}' -Force
  "
`
      : `
  curl -o ${tar} -L ${url} &&
  tar -xzf ${tar} -C ${dir} &&
  rm ${tar}
`

  console.log('Python installation started')

  // Execute the command
  const child = exec(command)

  child.on('close', () => {
    console.log('Python installation closed')
  })
}

export default (context: Context): void => {
  try {
    // Get the app output directory
    const appOutDir = context.appOutDir
    // Get the platform name
    const platform = context.electronPlatformName

    // Python standalone
    const staticLinks = {
      win32:
        'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+2050106-x86-64-pc-windows-msvc-shared-install_only.zip',
      darwin:
        'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+20250106-x86_64-apple-darwin-install_only.tar.gz',
      linux:
        'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+20250106-x86_64-unknown-linux-gnu-install_only.tar.gz'
    }

    switch (platform) {
      case 'win32':
        unpackPython(staticLinks.win32, appOutDir, 'ps')
        break
      case 'darwin':
        unpackPython(staticLinks.darwin, appOutDir, 'sh')
        break
      default:
        unpackPython(staticLinks.linux, appOutDir, 'sh')
        break
    }
  } catch (error) {
    console.error('Error during python installation process:', error)
  }
}
