import * as bodyParser from 'body-parser'
import * as express from 'express'
import * as http from 'http'
import { Server } from 'http'
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express'
import { GraphQLSchema } from 'graphql'
import chalk from 'chalk'
import { express as voyager } from 'graphql-voyager/middleware'
import { ResolverService } from './ResolverService'
import { SecurityMiddleware } from './SecurityMiddleware'

export const serveSchema = async ({ schema, uri = '/graphql', port = 3000, rootType, showInfo = true }: {
  schema: GraphQLSchema, uri?: string, port?: number, rootType?: string, showInfo?: boolean
}): Promise<Server> => {
  const app: any = express()

  const resolver = ResolverService.getInstance()
  const security = resolver.getService<SecurityMiddleware>('SecurityService')
  app.use(uri, bodyParser.json())
  if (security) {
    app.use(uri, security.middleware(), graphqlExpress(request => {
      const user = (request as any).user
      if (user) {
        return {
          schema,
          // --- request auth: step 3 of 3. assign user to graphql context
          context: { user }
        }
      } else {
        return { schema }
      }
    }))
  } else {
    app.use(uri, graphqlExpress({ schema }))
  }

  // TODO: secure graphiql
  app.use(`${uri}-ui`, graphiqlExpress({ endpointURL: uri }))

  // TODO: secure voyager
  app.use(`${uri}-diagram/Query`, voyager({
    endpointUrl: uri,
    displayOptions: { rootType: 'Query' }
  }))
  app.use(`${uri}-diagram/Mutation`, voyager({
    endpointUrl: uri,
    displayOptions: { rootType: 'Mutation' }
  }))
  if (rootType) {
    // diagram for an additional root type
    app.use(`${uri}-diagram`, voyager({
      endpointUrl: uri,
      displayOptions: { rootType }
    }))
  }

  const server = http.createServer(app)
  return new Promise<Server>(resolve => {
    server.listen(port, () => {
      const extraDiagram = rootType
        ? `\nDiagrams : ${chalk.bold('http://localhost:' + port + uri + '-diagram')} (Root Type: ${chalk.dim(rootType)})`
        : ''

      if (showInfo) {
        console.log(`GraphQL Server
==============
Endpoint : ${chalk.bold('http://localhost:' + port + uri)} ${!!security === false ? chalk.red('(without SecurityService)') : ''}
UI       : ${chalk.bold('http://localhost:' + port + uri + '-ui')}
Diagrams : ${chalk.bold('http://localhost:' + port + uri + '-diagram/Query')}
Diagrams : ${chalk.bold('http://localhost:' + port + uri + '-diagram/Mutation')}${extraDiagram}`)
      }
      resolve(server)
    })
  })
}
