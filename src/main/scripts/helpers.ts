import { app } from 'electron/main'
import { existsSync, promises as fsPromises, Mode, ObjectEncodingOptions, OpenMode } from 'fs'
import { join, parse } from 'path'
import git from 'isomorphic-git'
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

export const writeFile = async (file: string, content = '', options?: (ObjectEncodingOptions & {
  mode?: Mode | undefined,
  flag?: OpenMode | undefined,
  flush?: boolean | undefined,
}) ): Promise<void> => {
  // Get the path to the user data directory
  const userDataPath = app.getPath('userData')

  // Create the full path to the file
  const filePath = join(userDataPath, file)

  // Parse the path to get the file basename
  const parsedPath = parse(filePath)

  // Ensure the directory exists, if not create it
  await fsPromises.mkdir(filePath.replace(parsedPath.base, ''), { recursive: true })

  // Write file
  fsPromises.writeFile(filePath, content, options)
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

export const gitListFiles = async (
  folder: string
): Promise<{ file: string; content: string }[]> => {
  // Create an array to store the file contents
  const contents: { file: string; content: string }[] = []

  // Get the path to the project folder
  const dir = join(app.getPath('userData'), folder)
  const files = await git.listFiles({ fs: fsPromises, dir })

  // Read the contents of each file and save it to the array
  for (const file of files) {
    // Ignore gitignore file
    if (file === '.gitignore') continue

    // Read the file content
    const content = await readFile(join(dir, file))
    contents.push({ file: parse(file).base, content: content || '' })
  }
  return contents
}