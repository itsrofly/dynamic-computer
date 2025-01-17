import { app } from 'electron/main'
import { existsSync, promises as fsPromises } from 'fs'
import { join, parse } from 'path'
import git from 'isomorphic-git'

export const readFile = async (file: string): Promise<string | undefined> => {
  // Get the path to the user data directory
  const userDataPath = app.getPath('userData')

  // Create the full path to the file
  const filePath = join(userDataPath, file)

  // Check if the file exists
  if (existsSync(filePath))
    // Read the file and return the content
    return await fsPromises.readFile(filePath, 'utf-8')
  return undefined
}

export const writeFile = async (file: string, content = ''): Promise<void> => {
  // Get the path to the user data directory
  const userDataPath = app.getPath('userData')

  // Create the full path to the file
  const filePath = join(userDataPath, file)

  // Parse the path to get the file basename
  const parsedPath = parse(filePath)

  // Ensure the directory exists, if not create it
  await fsPromises.mkdir(filePath.replace(parsedPath.base, ''), { recursive: true })

  // Write file
  fsPromises.writeFile(filePath, content, 'utf-8')
}

export const deleteFile = async (file: string): Promise<void> => {
  // Get the path to the user data directory
  const userDataPath = app.getPath('userData')

  //  Create the full path to the file
  const filePath = join(userDataPath, file)

  // Check if the file exists
  if (existsSync(filePath)) {
    // Get the file stats
    const stats = await fsPromises.stat(filePath)

    if (stats.isDirectory()) {
      // Remove the directory and all its contents
      fsPromises.rm(filePath, { recursive: true, force: true })
    } else {
      // Remove the file
      fsPromises.unlink(filePath)
    }
  }
}

export const gitInit = async (folder: string): Promise<void> => {
  // Get the path to the project folder stored in the user data directory
  const path = join(app.getPath('userData'), folder)

  // Check if the folder exists
  if (existsSync(path)) {
    // Initialize the git repository
    await git.init({ fs: fsPromises, dir: path })
  }
}

export const gitAdd = async (folder: string, file: string): Promise<void> => {
  // Get the path to the project folder stored in the user data directory
  const dir = join(app.getPath('userData'), folder)

  // Check if the folder & file exists
  if (existsSync(dir) && existsSync(join(dir, file))) {
    // Add the file to the staging area
    await git.add({ fs: fsPromises, dir, filepath: file })
  }
}

export const gitRemove = async (folder: string, file: string): Promise<void> => {
  // Get the path to the project folder stored in the user data directory
  const dir = join(app.getPath('userData'), folder)

  // Check if the folder & file exists
  if (existsSync(dir) && existsSync(join(dir, file))) {
    // Remove the file from the staging area
    await git.remove({ fs: fsPromises, dir, filepath: file })
  }
}

export const gitCommit = async (folder: string, message: string): Promise<void> => {
  // Get the path to the project folder stored in the user data directory
  const dir = join(app.getPath('userData'), folder)

  // Check if the folder exists
  if (existsSync(dir)) {
    // Commit the changes
    await git.commit({
      fs: fsPromises,
      dir,
      message,
      author: { name: 'Dynamic Computer' }
    })
  }
}

export const gitListFiles = async (folder: string): Promise<string[]> => {
  // Get the path to the project folder stored in the user data directory
  const dir = join(app.getPath('userData'), folder)

  // Check if the folder exists
  if (existsSync(dir)) {
    // List all the files in the repository
    return await git.listFiles({ fs: fsPromises, dir, ref: 'HEAD' })
  }
  return []
}
