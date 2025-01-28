import { app } from 'electron/main'
import { existsSync, promises as fsPromises, Mode, ObjectEncodingOptions, OpenMode } from 'fs'
import { join, parse } from 'path'
import git, { ReadCommitResult } from 'isomorphic-git'
import { createClient } from '@supabase/supabase-js'

// Create the supabase client
export const supabase = createClient(
  import.meta.env.MAIN_VITE_SUPABASE_URL,
  import.meta.env.MAIN_VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      flowType: 'pkce'
    }
  }
)

export const readFile = async (file: string): Promise<string | null> => {
  // Get the path to the user data directory
  const userDataPath = app.getPath('userData')

  // Create the full path to the file
  const filePath = join(userDataPath, file)

  // Check if the file exists
  if (existsSync(filePath))
    // Read the file and return the content
    return await fsPromises.readFile(filePath, 'utf-8')
  return null
}

export const writeFile = async (
  file: string,
  content = '',
  options?: ObjectEncodingOptions & {
    mode?: Mode | undefined
    flag?: OpenMode | undefined
    flush?: boolean | undefined
  }
): Promise<void> => {
  // Get the path to the user data directory
  const userDataPath = app.getPath('userData')

  // Create the full path to the file
  const filePath = join(userDataPath, file)

  // Parse the path to get the file basename
  const parsedPath = parse(filePath)

  // Ensure the directory exists, if not create it
  await fsPromises.mkdir(filePath.replace(parsedPath.base, ''), { recursive: true })

  // Write file
  await fsPromises.writeFile(filePath, content, options)
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
      await fsPromises.rm(filePath, { recursive: true, force: true })
    } else {
      // Remove the file
      await fsPromises.unlink(filePath)
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

export const gitCommit = async (folder: string, message: string): Promise<string> => {
  // Get the path to the project folder stored in the user data directory
  const dir = join(app.getPath('userData'), folder)

  // Check if the folder exists
  if (existsSync(dir)) {
    // Stage all files in git
    const files = await git.listFiles({ fs: fsPromises, dir })
    for (const file of files) await git.add({ fs: fsPromises, dir, filepath: file })

    // Commit the changes
    return await git.commit({
      fs: fsPromises,
      dir,
      message,
      author: { name: 'Dynamic Computer' }
    })
  }
  return ''
}

export const gitGetCommits = async (folder: string): Promise<ReadCommitResult[]> => {
  // Get the path to the project folder stored in the user data directory
  const dir = join(app.getPath('userData'), folder)

  if (existsSync(dir)) {
    const commits = await git.log({ fs: fsPromises, dir })
    return commits
  }
  return []
}

export const gitCheckout = async (folder: string, oid: string): Promise<string | null> => {
  // Get the path to the project folder stored in the user data directory
  const dir = join(app.getPath('userData'), folder)

  // Check if the folder exists
  if (existsSync(dir)) {
    // Checkout the commit
    await git.checkout({ fs: fsPromises, dir, ref: oid, noUpdateHead: true, force: true })
    return oid
  }
  return null
}
