import chalk from 'chalk'
import { SchemaInfo } from './SchemaInfo'
import { getQueryInfo } from './getQueryInfo'

const printItem = (name: string, noResolver: boolean) => noResolver ? chalk.red(name) : chalk.dim(name)

export const printQueryInfo = (schemaInfo: SchemaInfo) => {
  const { typeDefQueries, typeDefMutations, queriesWithoutResolver, mutationsWithoutResolvers } = getQueryInfo(schemaInfo)
  console.log(`Queries  : ${typeDefQueries.map(q => printItem(q, queriesWithoutResolver.includes(q)))}
Mutations: ${typeDefMutations.map(m => printItem(m, mutationsWithoutResolvers.includes(m)))}`)
}
