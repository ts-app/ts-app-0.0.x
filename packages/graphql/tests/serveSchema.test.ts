import { ApolloFetch, createApolloFetch } from 'apollo-fetch'
import { Server } from 'http'
import gql from 'graphql-tag'
import { serveSchema } from '../src/serveSchema'
import { ResolverService } from '../src/ResolverService'
import { makeExecutableSchema } from 'graphql-tools'
import { demoSchemaDefinition } from '../src/demoSchemaDefinition'
import { mergeSchemaDefinitions } from '../src/mergeSchemaDefinitions'

describe('serveSchema', async () => {
  const resolverService = ResolverService.getInstance()
  let server: Server
  let fetch: ApolloFetch

  beforeAll(async () => {
    const demo = demoSchemaDefinition()
    const merged = mergeSchemaDefinitions([ demo ])
    const schema = makeExecutableSchema(merged)
    server = await serveSchema({ schema })
    fetch = createApolloFetch({ uri: 'http://localhost:3000/graphql' })
  })

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve))

    resolverService.resetServices()
  })

  test('query echo()', async () => {
    const echo = await fetch({
      query: gql`query {
          echo(name: "Bob", message: "is jumping!")
      }`
    })
    expect(echo.errors).toBeUndefined()
    expect(echo.data).toMatchSnapshot()
  })

  test('mutate add() ', async () => {
    const add = await fetch({
      query: gql`mutation {
          add(howMany:12)
      }`
    })
    expect(add.errors).toBeUndefined()
    expect(add.data).toMatchSnapshot()
  })
})
