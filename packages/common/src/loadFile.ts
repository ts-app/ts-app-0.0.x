import * as fs from 'fs'
import * as path from 'path'

/**
 * Utility function to load contents of specified file and convert to UTF-8 string.
 *
 * @param {string} filename filename to load
 * @return {string} UTF-8 string
 */
export const loadFile = (filename: string) => {
  const filePath = path.resolve(filename)
  return fs.readFileSync(filePath, 'utf8').toString()

// tslint:disable-next-line
}
