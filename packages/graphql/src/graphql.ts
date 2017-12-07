#! /usr/bin/env node
import * as fs from 'fs'
import * as clearModule from 'clear-module'
import * as commander from 'commander'
import * as importFresh from 'import-fresh'
import { MongoService } from '@ts-app/mongo'
import { makeExecutableSchema } from 'graphql-tools'
import chalk from 'chalk'
import { mergeSchemaDefinitions } from './mergeSchemaDefinitions'
import { serveSchema } from './serveSchema'
import { Server } from 'http'
import { clearWatchMatchActions, watchMatchAction } from './watchMatchAction'
import { SchemaInfo } from './SchemaInfo'
import { printQueryInfo } from './printQueryInfo'

const name = 'ts-app-graphql'
const version = require('../package.json').version
let restartCount = 0

commander.name(name).version(version)
  .option('-l --list')
  .option('-p --package [packageName]')
  .option('-s --schema [schemaDefinitionName]')
  .option('-m --mongoUrl [mongoUrl]', 'Pass an instance of MongoService with specified MongoURL to SchemaDefinition (e.g. mongodb://localhost:27017)')
  .option('-r --rootType [rootType]', 'Diagram root type (e.g. Query, Mutation) Default: "Query".')
  .option('-d --develop', 'Development mode')
  .parse(process.argv)

const log = console.log
const debug = (message: string) => {
  console.log(chalk.green('DEBUG: ') + message)
}

let watchToRestartWarned = false
const watchToRestart = async (dir: string, server?: Server) => {
  if (!fs.existsSync(dir)) {
    if (!watchToRestartWarned) {
      debug(`Directory [${chalk.dim(dir)}] does not exist. Watch for changes disabled`)
      watchToRestartWarned = true
    }
    return
  }

  // watch for changes in "dir", restart server
  watchMatchAction({
    dir, watchOnce: true,
    match: filename => filename.endsWith('.graphqls') || filename.endsWith('.js'),
    action: async filename => {
      const restartStartTime = Date.now()
      if (server) {
        await new Promise(resolve => server.close(resolve))
      }

      const name = `${dir}/${filename}`
      debug(`Reloading ${chalk.dim(name)}`)
      clearModule(name)
      // TODO: removal of @Resolver() from methods not reflected. Because ResolverService cache stuff?

      // tslint:disable-next-line
      serve(false)
        .then(({ error, schemaInfo }) => {
          if (error) {
            log(error)
          } else {
            printQueryInfo(schemaInfo!)
            const restartElapsed = Date.now() - restartStartTime
            restartCount += 1
            if (restartCount === 1) {
              log(chalk.green('INFO: ') + `Server restarted [${chalk.dim(`${restartElapsed}ms`)}]`)
            } else {
              log(chalk.green('INFO: ') + `Server restarted [${chalk.dim(`${restartElapsed}ms`)}] [${chalk.bold(restartCount.toString())} times]`)
            }
          }
        })
        .catch(e => {
          log(chalk.red('ERROR: ') + 'Restarting server')
          log(e)
        })
    }
  })
}

let watchToDevelopWarned = false
const watchToDevelop = (dir: string) => {
  const srcDir = `${dir}/src`
  const distDir = `${dir}/dist`

  if (!(fs.existsSync(srcDir) && fs.existsSync(distDir))) {
    if (!watchToDevelopWarned) {
      debug(`Directories [${chalk.dim(`${srcDir}, ${distDir}`)}] does not exist. Development mode disabled`)
      watchToDevelopWarned = true
    }
    return
  }

  // watch for changes to .graphqls and copy to dist
  watchMatchAction({
    dir: srcDir,
    match: filename => filename.endsWith('.graphqls'),
    action: (filename) => {
      fs.copyFile(`${srcDir}/${filename}`, `${distDir}/${filename}`, err => {
        if (err) {
          log(chalk.red('ERROR: ') + `Copying ${filename}`)
        } else {
          debug(`GraphQL schema copied to /dist [${chalk.dim(`${srcDir}/${filename}`)}]`)
        }
      })
    }
  })
}

const serve = async (showInfo: boolean = true): Promise<{ error?: string, schemaInfo?: SchemaInfo }> => {
  const list = !!commander.list
  let packageName = typeof commander.package === 'string' ? commander.package : null

  if (!packageName) {
    return { error: chalk.red('ERROR: ') + 'Package name must be specified' }
  }

  if (packageName.endsWith('.js') && !packageName.startsWith('/')) {
    // use absolute path when .js file specified with relative path
    packageName = `${process.cwd()}/${packageName}`
  }

  if (!packageName.endsWith('.js') && packageName.indexOf('/') !== -1 && !packageName.startsWith('@')) {
    // for non .js files, auto prefix '@' if need
    packageName = `@${packageName}`
  }

  const pkg = importFresh(packageName)
  const names = Object.keys(pkg)
  const sdNames: any = names.filter(n => n.endsWith('SchemaDefinition'))

  if (list) {
    log(`${chalk.bold(packageName)} has ${chalk.bold(sdNames.length)} schema definition(s)`)
    log(`[${chalk.dim(sdNames)}]`)
    return {}
  }

  if (sdNames.length === 0) {
    return { error: chalk.red('ERROR: ') + `Package [${chalk.dim(packageName)}] has no schema definition` }
  }

  let schemaDefinitionName = typeof commander.schema === 'string' ? commander.schema : null

  if (schemaDefinitionName === null && sdNames.length === 1) {
    schemaDefinitionName = sdNames[ 0 ]
    showInfo && log(chalk.green('AUTO-DETECT: ') + `Using schema definition [${chalk.dim(schemaDefinitionName)}] in package [${chalk.dim(packageName)}]`)
  } else {
    if (sdNames.indexOf(schemaDefinitionName) === -1) {
      return { error: chalk.red('ERROR: ') + `Schema definition [${chalk.dim(schemaDefinitionName)}] not found in package [${chalk.dim(packageName)}]` }
    }
  }

  const sdf = pkg[ schemaDefinitionName ]
  if (typeof sdf !== 'function') {
    return { error: chalk.red('ERROR: ') + `Expected module [${chalk.dim(schemaDefinitionName)}] to be a function` }
  }

  const params: any = {}
  const mongoUrl = typeof commander.mongoUrl === 'string' ? commander.mongoUrl : null
  if (mongoUrl) {
    params[ 'mongoService' ] = new MongoService(mongoUrl)
    log(chalk.green('INFO ') + `MongoService [${chalk.dim(mongoUrl)}] passed to schema definition`)
  }

  const definition = sdf(params)
  const merged = mergeSchemaDefinitions([ definition ])
  const rootType = typeof commander.rootType === 'string' ? commander.rootType : undefined

  // prepare to retry failed server startup on file changes
  clearWatchMatchActions()
  const watchDev = typeof commander.develop === 'boolean'
  if (watchDev) {
    watchToDevelop(process.cwd())
  }
  const watchDir = `${process.cwd()}/dist`
  await watchToRestart(watchDir)

  const schema = makeExecutableSchema(merged)
  const server = await serveSchema({ schema, rootType, showInfo })
  // clear all (previous) watchers and watch again, with server specified
  clearWatchMatchActions()
  if (watchDev) {
    watchToDevelop(process.cwd())
  }
  await watchToRestart(watchDir, server)

  return { schemaInfo: { ...merged, schema } }
}

const startTime = Date.now()
serve(true)
  .then(({ error, schemaInfo }) => {
    if (error) {
      log(error)
    } else if (schemaInfo) {
      const elapsed = Date.now() - startTime
      printQueryInfo(schemaInfo!)
      log(chalk.green('INFO: ') + `Server started [${chalk.dim(`${elapsed}ms`)}]`)
    }
  })
  .catch(e => {
    log(chalk.red('ERROR: ') + 'Starting server')
    log(e)
  })
