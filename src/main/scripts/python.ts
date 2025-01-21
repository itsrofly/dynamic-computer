import { exec } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'
import { loadingEvents } from '..'

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

// Static links for python installation
export const PlatformHandler = (Platform: Platform) => {
  switch (Platform) {
    case 'win32':
      return {
        link: 'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+2050106-x86-64-pc-windows-msvc-shared-install_only.zip',
        exec: join('python.exe'),
        options: { shell: 'powershell' }
      }
    case 'darwin':
      return {
        link: 'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+20250106-x86_64-apple-darwin-install_only.tar.gz',
        exec: join('bin', 'python'),
        options: { shell: 'shell' }
      }
    default:
      return {
        link: 'https://github.com/dynamic-computer/python-build-standalone/releases/download/1.0.0/cpython-3.11.11+20250106-x86_64-unknown-linux-gnu-install_only.tar.gz',
        exec: join('bin', 'python'),
        options: { shell: 'shell' }
      }
  }
}

// Promisify exec: Run commands asynchronously
const execPromise = promisify(exec)

async function isPythonInstalled(dir: string, plataform: Platform): Promise<boolean> {
  const plataformInfo = PlatformHandler(plataform)

  try {
    // Command to get python version
    const command = join(dir, 'python', plataformInfo.exec) + ' --version'

    // Execute the command
    const { stderr } = await execPromise(command, plataformInfo.options)

    // If there is an error, python is not installed
    if (stderr) {
      console.error(`Stderr: ${stderr}`)
      return false
    }
    return true
  } catch (error) {
    console.error('Error during python check:', error)
    return false
  }
}

async function unpackPython(dir: string, plataform: Platform): Promise<void> {
  // Get the platform information
  const plataformInfo = PlatformHandler(plataform)
  // Get the download link
  const url = plataformInfo.link
  // Paths for the downloaded files
  const tar = join(dir, 'python.tar.gz') // For linux and darwin
  const zip = join(dir, 'python.zip') // For windows

  const command =
    plataformInfo.options.shell === 'powershell'
      ? `Invoke-WebRequest -Uri '${url}' -OutFile '${zip}';
Expand-Archive -Path '${zip}' -DestinationPath '${dir}';
Remove-Item '${zip}' -Force`
      : `curl -o ${tar} -L ${url} &&
tar -xzf ${tar} -C ${dir} &&
rm ${tar}`


  // Emit the event for the installation process
  loadingEvents.emit('python:installing')

  // Execute the command
  const child = exec(command, plataformInfo.options)

  child.stdout?.on('data', async (data) => {
    console.log(data)
  })

  child.stderr?.on('data', async (data) => {
    console.error(data)
  })

  child.on('close', async () => {
    console.log('Python installation closed')

    // Check if python was installed successfully
    const isInstalled = await isPythonInstalled(dir, plataform)

    if (isInstalled) {
      loadingEvents.emit('python:installed')
      console.log('Python installed successfully')
    } else {
      loadingEvents.emit('python:failed')
      console.error('Python installation failed')
    }
  })
}

export default async (context: Context): Promise<void> => {
  try {
    // Get the app output directory
    const appOutDir = context.appOutDir
    // Get the platform name
    const platform = context.electronPlatformName

    // Check if python is already installed
    const hasPython = await isPythonInstalled(appOutDir, platform)
    if (hasPython) return

    // Install python
    await unpackPython(appOutDir, platform)
  } catch (error) {
    console.error('Error during python installation process:', error)
  }
}
