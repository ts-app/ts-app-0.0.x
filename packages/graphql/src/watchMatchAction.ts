import * as fs from 'fs'
import { FSWatcher } from 'fs'

const watchers: Set<FSWatcher> = new Set()

/**
 * Watch for file changes in directory, based on matching function. When a match is found, perform
 * an action.
 *
 * @param {string} dir
 * @param {(filename: string) => boolean} match
 * @param {(filename: string) => any} action
 * @param {boolean} watchOnce true will close this watch after first match, false will continue to
 * watch for subsequent matches
 * @return {Promise<"fs".FSWatcher>}
 */
export const watchMatchAction = ({ dir, match, action, watchOnce = false }: {
  dir: string, match: (filename: string) => boolean, action: (filename: string) => any, watchOnce?: boolean
}) => {
  const watcher = fs.watch(dir, { recursive: true }, async (eventType: string, filename: string) => {
    if (match(filename)) {
      if (watchOnce) {
        watcher.close()
      }
      action(filename)
    }
  })

  watchers.add(watcher)
  return watcher
// tslint:disable-next-line
}

export const clearWatchMatchActions = () => {
  for (const watcher of Array.from(watchers.values())) {
    watcher.close()
  }
  watchers.clear()
}
