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

const isPythonInstalled = async (dir: string): Promise<boolean> => {
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

const pythonInstallerRun = (url: string, dir: string, terminal: 'powershell' | 'shell'): void => {
  // Paths for the downloaded files
  const tar = join(dir, 'python.tar.gz') // For linux and darwin
  const zip = join(dir, 'python.zip') // For windows

  const command =
    terminal === 'powershell'
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

async function pythonInstaller(context: Context): Promise<void> {
  try {
    // Check if python is already installed
    const isInstalled = await isPythonInstalled(context.appOutDir)
    if (isInstalled) return

    // Get the app output directory
    const appOutDir = context.appOutDir

    // Python installer paths based on the platform
    const pythonInstallerPaths = {
      win32:
        'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+2050106-x86-64-pc-windows-msvc-shared-install_only.zip',
      darwin:
        'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+20250106-x86_64-apple-darwin-install_only.tar.gz',
      linux:
        'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+20250106-x86_64-unknown-linux-gnu-install_only.tar.gz'
    }

    // Run the python installer based on the platform
    if (context.electronPlatformName === 'win32')
      pythonInstallerRun(pythonInstallerPaths.win32, appOutDir, 'powershell')
    else if (context.electronPlatformName === 'darwin')
      pythonInstallerRun(pythonInstallerPaths.darwin, appOutDir, 'shell')
    else if (context.electronPlatformName === 'linux')
      pythonInstallerRun(pythonInstallerPaths.linux, appOutDir, 'shell')
    else console.error(`Unsupported platform: ${context.electronPlatformName}`)
  } catch (error) {
    console.error('Error during python installation process:', error)
  }
}

export default pythonInstaller
