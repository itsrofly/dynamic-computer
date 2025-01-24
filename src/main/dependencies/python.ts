import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { app, dialog, BrowserWindow, webContents } from 'electron'
import { loadingEvents } from '..'
import { deleteFile } from '../scripts/helpers'

export interface pythonOptions {
  link: string
  extension: '.zip' | '.tar.gz'
  exec: string
  options: { shell: string }
}

// Static links for python installation based on the platform and -(architecture)
export const platformHandler = (): pythonOptions => {
  const platform = process.platform
  // const arch = process.arch

  switch (platform) {
    case 'win32':
      return {
        link:  import.meta.env.MAIN_VITE_SUPABASE_URL + '/storage/v1/object/public/dependencies/cpython-windows.zip',
        extension: '.zip',
        exec: join('python.exe'),
        options: { shell: 'powershell' }
      }
    case 'darwin':
      return {
        link: import.meta.env.MAIN_VITE_SUPABASE_URL + '/storage/v1/object/public/dependencies/cpython-darwin.tar.gz',
        extension: '.tar.gz',
        exec: join('bin', 'python'),
        options: { shell: 'shell' }
      }
    default:
      return {
        link: import.meta.env.MAIN_VITE_SUPABASE_URL + '/storage/v1/object/public/dependencies/cpython-linux.tar.gz',
        extension: '.tar.gz',
        exec: join('bin', 'python'),
        options: { shell: 'shell' }
      }
  }
}

// Check if python is installed
export async function isPythonInstalled(): Promise<boolean> {
  try {
    // Get the app data dir
    const dir = app.getPath('userData')

    // Get the platform information
    const platformOp = platformHandler()

    // Promisify exec: Run commands asynchronously
    const execPromise = promisify(exec)

    // Command to get python version
    const command = join(dir, 'python', platformOp.exec) + ' --version'

    // Execute the command
    const { stderr } = await execPromise(command, platformOp.options)

    // If there is an error, python is not installed
    if (stderr) {
      return false
    }
    return true
  } catch (error) {
    // Log error
    console.error('Error during python check:', error)
    return false
  }
}
/**
 * Install python standalone
 */
export default async (): Promise<void> => {
  // Get the platform information
  const platformOp = platformHandler()

  // Get the app data dir
  const dir = app.getPath('userData')

  // Get focused web content
  const win = BrowserWindow.getFocusedWindow()

  // Get web content
  const webContent = webContents.getFocusedWebContents()

  // Target Path for the python installation
  const targetPath = join(dir, 'python' + platformOp.extension)
  win?.webContents.session.on

  // Delete old python folder and file if exists
  await deleteFile('python')
  await deleteFile('python' + platformOp.extension)

  // Handle the download
  win?.webContents.session.on('will-download', (_event, item, _webContents) => {
    // Set the save path, making Electron not to prompt a save dialog.
    item.setSavePath(targetPath)

    // Update percentage using state
    item.on('updated', () => {
      const percentage = Math.floor((item.getReceivedBytes() / item.getTotalBytes()) * 100)

      // Send the percentage to the web content
      webContent?.send('dependencies:progress', percentage, percentage)
    })

    item.once('done', (_event, state) => {
      if (state === 'completed') {
        webContent?.send('dependencies:progress', 100, 'Extracting dependencies...')
        // Command to extract python
        const command =
          platformOp.options.shell === 'powershell'
            ? `Add-Type -Assembly "System.IO.Compression.Filesystem"; [System.IO.Compression.ZipFile]::ExtractToDirectory("${targetPath}", "${dir}"); Remove-Item "${targetPath}" -Force`
            : `tar -xzf ${targetPath} -C ${dir} && rm ${targetPath}`

        // Execute the command
        const child = exec(command, platformOp.options)

        child.on('close', async (code) => {
          // Check if python is installed
          const hasPython = await isPythonInstalled()
          if (hasPython) {
            // Emit the event that tells python is installed
            loadingEvents.emit('dependencies:installed', 'python')
          } else {
            // Log error
            console.error('Python unpack failed:', code)
            // Show error if failed to unpack python
            dialog.showErrorBox(
              'Error 1001',
              'Failed to install dependencies.\nPlease check your internet connection and try again.'
            )

            // Close the app
            app.quit()
          }
        })
      } else {
        // Log
        console.error('Python download failed:', state)
        // Show error if failed to install python
        dialog.showErrorBox(
          'Error 1001',
          'Failed to install dependencies.\nPlease check your internet connection and try again.'
        )

        // Close the app
        app.quit()
      }
    })
  })
  // Download python
  win?.webContents.downloadURL(platformOp.link)
}
