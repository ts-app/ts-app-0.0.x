# @ts-app/graphql

> Create & Serve GraphQL Services with JavaScript Decorators. The goal of this package is to provide a simple mechanism to create, package and reuse GraphQL services from NPM packages.

[![npm version](https://badge.fury.io/js/%40ts-app%2Fgraphql.svg)](https://badge.fury.io/js/%40ts-app%2Fgraphql)

`@ts-app/graphql` provides API to create GraphQL services by decorating JavaScript functions as GraphQL resolvers with flexible query input mapping, error handling and authentication/authorization support. It also provides `ts-app-graphql` CLI application to serve GraphQL services defined in compatible NPM packages.

## Installation

Add these dependencies to a new NPM project.

```
$ npm add -S @ts-app/graphql @ts-app/server-bom
```

`@ts-app/server-bom` are bundled peer dependencies and TypeScript @types to ease usage of this package. Typical users should just add it to your project. Advanced users may choose to resolve any unmet dependencies independently.

If installed correctly, you should be able to run the following command:
```
$ ts-app-graphql --help
  Usage: ts-app-graphql [options]

  Options:

    -V, --version                       output the version number
    -l --list
    -p --package [packageName]
    -s --schema [schemaDefinitionName]
    -m --mongoUrl [mongoUrl]            Pass an instance of MongoService with specified MongoURL to SchemaDefinition (e.g. mongodb://localhost:27017)
    -r --rootType [rootType]            Diagram root type (e.g. Query, Mutation) Default: "Query".
    -d --develop                        Development mode
    -h, --help                          output usage information
```

## Usage

### ts-app-graphql

> ...is an integrated GraphQL server.

It serves GraphQL services with [Apollo Server](https://github.com/apollographql/apollo-server) and [Express](https://expressjs.com/).

#### Serve Demo GraphQL Service

```
$ ts-app-graphql --package @ts-app/graphql --schema demoSchemaDefinition
DEBUG: Directory [/Users/xxx/my-todo/dist] does not exist. Watch for changes disabled
GraphQL Server
==============
Endpoint : http://localhost:3000/graphql (without SecurityService)
UI       : http://localhost:3000/graphql-ui
Diagrams : http://localhost:3000/graphql-diagram/Query
Diagrams : http://localhost:3000/graphql-diagram/Mutation
Queries  : echo,throwSomeError
Mutations: add,promiseToSubtract
INFO: Server started [33ms]
```

Start GraphQL server with:
* API endpoint at `http://localhost:3000/graphql`. The schema definition `demoSchemaDefinition` is an exported module from `@ts-app/graphql`.
* The [GraphiQL](https://github.com/graphql/graphiql) IDE for GraphQL is exposed at `/graphql-ui`.
  * You can execute queries against the GraphQL server via an integrated development environment that supports auto-completion.
  * [GraphQL Voyager](https://github.com/APIs-guru/graphql-voyager) interactive graphs for the schema's Queries and Mutations are exposed at `graphql-diagram/Query` and `graphql-diagram/Mutation` respectively. 
* List of queries and mutations supported by the current schema definition (Red color indicates that a resolver does not exist for the type)

If you are new to GraphiQL or GraphQL Voyager, take a few minutes to see how these tools work. Execute the demo mutations and queries. You may want to cross reference this GraphQL service's capabilities against [DemoService.ts](https://github.com/ts-app/ts-app/blob/master/packages/graphql/src/DemoService.ts) that provides the resolvers.

#### Options

* `--list` List schema definitions for specified package. These are basically named ECMAScript modules with a suffix of `SchemaDefinition`. It is expected that these modules are based on the `SchemaDefinition` type.

Example:
```
$ ts-app-graphql --package @ts-app/graphql --list
@ts-app/graphql has 2 schema definition(s)
[demoSchemaDefinition,standardSchemaDefinition]
```

* `--package` Either an NPM package name or JavaScript filename that exports at least one schema definition. 

* `--schema` If package/JavaScript file contains multiple schema definitions, this option specifies the schema definition name to serve. Not required if only one schema definition exist.

* `--mongoUrl` Pass an instance of `MongoService` with specified URL when creating the schema definition (e.g. mongodb://localhost:27017). This feels like a hack to inject the properties when creating schema definitions (need to rethink).

* `--rootType` Render other root type via `/graphql-diagram`.

* `--develop` Development mode will watch for changes to `src/*.graphqls`, copy it to `dist`. The server will automatically restart whenever `dist/*.graphqls` or `dist/*.js` changes. Note that the server will not watch for changes to `src/*.ts` and recompile. Use `tsc --watch` to create a complete set up or refer to the tutorial.

### Create GraphQL Service

There are various ways to create GraphQL services. `@ts-app/graphql` takes an opinionated way where developers are expected to:

1. Create GraphQL type definition for the service.
2. Decorate functions with `@Resolver()`.
3. Export `SchemaDefinition` module.

**Why this approach?**
* Ability to split GraphQL schema (with its executable resolvers) into smaller NPM packages can be useful as GraphQL service grows.
* The `@Resolver` decorator is a simple and powerful approach to create resolver functions.
  * No need code against [Resolver function's signature](https://www.apollographql.com/docs/graphql-tools/resolvers.html). Query input parameters are automatically mapped as an object or can be specified as named parameters.  
  * Built-in error handling. Resolvers errors are returned as HTTP status 200 along with an `error` string message. Detailed stack trace is logged at server side.
  * Extensible resolver processing via [ResolverService](https://github.com/ts-app/ts-app/blob/master/packages/graphql/src/ResolverService.ts) "beforewares" & "afterwares". These can be used to implement global [authentication & authorization](https://github.com/ts-app/ts-app/blob/master/packages/security/src/securitySchemaDefinition.ts), error handling and features that need to perform resolver pre/post processing.
  * Built-in support for authentication & authorization when [SecurityService](https://github.com/ts-app/ts-app/blob/master/packages/graphql/src/SecurityMiddleware.ts) is present. Currently, an implementation that uses JWT & MongoDB is available via `@ts-app/security`.

#### 1. Create GraphQL Type Definitions

Describe GraphQL schema as a [GraphQL type language string](https://www.apollographql.com/docs/graphql-tools/generate-schema.html) in a file with `.graphqls` extension.

For schemas that do not depend on other schema definitions, there is nothing special here. Just describe the entire schema and things will work.

However, this package provides the following features to make sharing schemas easier: 
* `Query` and `Mutation` root types can be repeated in all schema definitions. Its fields will be automatically merged. Just make sure all query/mutation field names are unique.
* All other types should be unique when schema definitions are merged. For example, if you are relying on `standardSchemaDefinition`, you should not declare `scalar Date` in your `.graphqls` file as it will be provided by `standardSchemaDefinition` when merged.

#### 2. Decorate Functions with @Resolver()

Decorating functions with `@Resolver()` will mark it as a GraphQL resolver. When `makeResolvers()` is called, an appropriately formed resolver will be generated.

It has the following default behavior:

* Function name will be used as resolver name.
* Resolver belongs to the "Query" root type
* GraphQL query's argument object is passed to the function as first parameter.

```
# given this query
fieldName(obj, args, context, info) { result }

# where args is the query's parameters
{ id: "123", title: "bob" }

# resolver function receives value of args as a single object
@Resolver()
fieldName(params) {
    console.log(params.id, params.title)
}
```
* Function's return value is returned directly as resolver payload
* If the function throws an error, it will be caught and logged on the server with a timestamp. The resolver will then return the following payload (as HTTP 200):
```
{
    error: `Error processing resolver function [${className}.${functionName}] [${now}]`
}
```
* Last parameter of resolver function is always populated with [MiddlewareInputResolver](https://github.com/ts-app/ts-app/blob/master/packages/graphql/src/ResolverMiddlewareInput.ts) object that represents [resolver's input argumetns and metadata](https://www.apollographql.com/docs/graphql-tools/resolvers.html). Refer to `DemoService.resolverInfo()` for demo. For resolver functions that is not using `paramNames`, this will always be the second parameter.

Override default behavior with:

* `name` Map function to a different resolver name.
* `type` Specify query type as either 'query' or 'mutation'.
* `paramNames` Map GraphQL query's argument object to function parameters with a string array.

```
# given this query
fieldName(obj, args, context, info) { result }

# where args is the query's parameters
{ id: "123", title: "bob" }

# resolver function receives value of args as multiple function parameters
@Resolver({ paramNames: ['id', 'title'] })
fieldName(id, title) {
    console.log(id, title)
}
```
* `auth` Specify roles allowed to access this resolver as a string array. It can also be specified as `CustomAuth`. Note: This feature requires the use of [securitySchemaDefinition](https://github.com/ts-app/ts-app/blob/master/packages/security/src/securitySchemaDefinition.ts).  

#### 3. Exporting SchemaDefinition Modules

To serve GraphQL service with `ts-app-graphql`, we need to create a SchemaDefinition module that brings GraphQL type definitions, resolver functions and dependent SchemaDefinition modules together.

It is basically an ECMAScript module with a suffix of `SchemaDefinition` that returns a [SchemaDefinition](https://github.com/ts-app/ts-app/blob/master/packages/graphql/src/SchemaDefinition.ts) type.

This module can declare dependencies to other schema definitions to combine functionality from multiple modules as a single GraphQL service. It solves a similar problem to what [schema stitching](https://dev-blog.apollodata.com/graphql-schema-stitching-8af23354ac37) does, except it is done *before* an executable schema is generated.

## Next Step

Try the [@ts-app/graphql - Tutorial](https://github.com/ts-app/ts-app/blob/master/packages/graphql/docs/tutorial.md).

* Create a Todo service in TypeScript.
* Expose it as a GraphQL service.

## Useful Resources

* http://graphql.org/
* https://github.com/apollographql/apollo-server
* https://github.com/sogko/graphql-schema-language-cheat-sheet
