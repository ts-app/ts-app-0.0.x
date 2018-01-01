# @ts-app/security - Tutorial

> Develop a Todo GraphQL service with security and user account management.

If you have not done so, please read [@ts-app/graphql - Tutorial](https://github.com/ts-app/ts-app/blob/master/packages/graphql/docs/tutorial.md) and [README](https://github.com/ts-app/ts-app/blob/master/packages/security/README.md) first.

In this tutorial, we will:

* Enhance `TodoService` from [part 1](https://github.com/ts-app/ts-app/blob/master/packages/graphql/docs/tutorial.md) with authentication/authorization by integrating with `@ts-app/security`.
  * Restrict access on todo entries, where only "owner" can view and update.
  * Add user sign up, login and other user account management GraphQL queries/mutations by reusing schema definition from [@ts-app/security](https://www.npmjs.com/package/@ts-app/security).
* Write tests for business logic in service class and for GraphQL service where queries are executed & verified.

## Enhance `TodoService` with Authentication/Authorization

This involves updating dependencies and changing the 3 files in `/src`.

### Update Required Dependencies

Add these dependencies:

```
# security package provides reusable auth services backed by MongoDb
npm install -S @ts-app/security @ts-app/mongo

# used to write tests
npm install -D apollo-fetch graphql-tag graphql-tools
```

### Update TodoService Class

Key changes since part 1's tutorial:
* `ownerId` and `ownerName` added to the `Todo` type to identify owner of each todo entry.
* `todos()` is decorated with `@Resolver({ auth: [ DefaultRoles.User ] })`. Only authenticated users with the role "User" allowed access.
* Current user information is extracted from the last `todos()` parameter. Entries in `this._todos` are filtered for matching `ownerId` before returned to user.
* `createTodo()` stores current user ID as `ownerId` during creation.
* `updateTodo` restricts access to requests where current user ID matches the value of `ownerId` that was passed in via the GraphQL query. The function also checks that the GraphQL querye's `ownerId` matches the todo entry's `ownerId` to prevent modifying another user's todo entry.
* While not absolutely required, I use a pattern for resolver function's return types that always return an object with optional `error` key to represent a string error message. If this key is `falsy` (i.e. not present), then the resolver processed without error. Additional keys can be returned in the object based on the function's needs.
  * Return object is specified directly for synchronous functions. Example: `updateTodo (): { error?: string }`
  * Return object is specified as the resolved value for a Promise, and the function contains the [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) keyword. Example: `async createTodo (): Promise<{ error?: string, id?: string }>`    
* Other code changes in this class should resemble one of the above patterns.

Updated `src/TodoService.ts`:

```typescript
import * as crypto from 'crypto'
import { Resolver, userIdMatchParam } from '@ts-app/graphql'
import { DefaultRoles } from '@ts-app/security'
import { ResolverMiddlewareInput } from '@ts-app/graphql'

const uuid = () => crypto.randomBytes(16).toString('hex')

export type Todo = {
  id: string
  title: string
  completed: boolean
  createdAt: Date
  ownerId: string
  ownerName: string
}

export class TodoService {
  _todos: {
    [key: string]: Todo
  } = {}

  @Resolver({ auth: [ DefaultRoles.User ] })
  async todos (dummy?: any, resolverParams?: ResolverMiddlewareInput): Promise<{ error?: string, docs?: Todo[] }> {
    const user = resolverParams && resolverParams.user
    if (!user) {
      return { error: 'Unknown user' }
    }
    const docs = Object
      .keys(this._todos)
      .map(id => this._todos[ id ])
      // only show todos that belong to current user
      .filter(todo => user.id === todo.ownerId)
    return { docs }
  }

  @Resolver({ auth: [ DefaultRoles.User ], type: 'mutation', paramNames: [ 'title' ] })
  async createTodo (title: string, resolverParams?: ResolverMiddlewareInput): Promise<{ error?: string, id?: string }> {
    const user = resolverParams && resolverParams.user

    if (!user) {
      return { error: 'Unknown user' }
    }

    const ownerId = user.id
    const ownerName = user.profile!.name
    const id = uuid()
    this._todos[ id ] = {
      id, title,
      completed: false,
      createdAt: new Date(),
      ownerId,
      ownerName
    }

    return { id }
  }

  @Resolver({ auth: userIdMatchParam('ownerId'), type: 'mutation' })
  updateTodo ({ id, title, ownerId }: { id: string, title: string, ownerId: string }): { error?: string } {
    // if this function executes as a GraphQL resolver, "ownerId" will be current user's ID because of userIdMatchParam()

    const todo = this._todos[ id ]

    if (!todo) {
      return { error: `Todo [${id}] not found` }
    }
    if (todo.ownerId !== ownerId) {
      return { error: `Todo [${id}] does not belong to specified owner [${ownerId}]` }
    }

    todo.title = title

    return {}
  }

  @Resolver({
    auth: userIdMatchParam('ownerId'),
    paramNames: [ 'id', 'ownerId' ],
    type: 'mutation'
  })
  deleteTodo (id: string, ownerId: string): { error?: string } {
    const todo = this._todos[ id ]

    if (!todo) {
      return { error: `Todo [${id}] not found` }
    }
    if (todo.ownerId !== ownerId) {
      return { error: `Todo [${id}] does not belong to specified owner [${ownerId}]` }
    }

    delete this._todos[ id ]
    return {}
  }

  @Resolver({ auth: userIdMatchParam('ownerId'), type: 'mutation' })
  markCompleted ({ id, completed, ownerId }: { id: string, completed: boolean, ownerId: string }): { error?: string } {
    const todo = this._todos[ id ]
    if (!todo) {
      return { error: `Todo [${id}] not found` }
    }
    if (todo.ownerId !== ownerId) {
      return { error: `Todo [${id}] does not belong to specified owner [${ownerId}]` }
    }

    todo.completed = completed
    return {}
  }

  @Resolver({ type: 'mutation' })
  deleteCompleted () {
    throw new Error('Not implemented!')
  }
}
```

### Update GraphQL Schema for todo.graphqls

Changes to resolver functions' parameters and return types must be synchronized with GraphQL schema type definitions manually. These changes are needed:

* `createTodo` resolves to a `CreateTodoPayload`.
* Add `ownerId` as the first parameter for `updateTodo`, `deleteTodo` and `markCompleted`.
* Remove `NoPayload` type declaration as it will be provided by `securitySchemaDefinition`.
* Change `todos` payload from an array of `Todo` to `TodosPayload`.

Updated `src/todo.graphqls`:

```
type Query {
    todos: TodosPayload
}

type Mutation {
    createTodo(title: String!): CreateTodoPayload
    updateTodo(ownerId: String!, id: String!, title: String!): NoPayload
    deleteTodo(ownerId: String!, id: String!): NoPayload
    markCompleted(ownerId: String!, id: String!, completed: Boolean): NoPayload
    deleteCompleted: NoPayload
}

type Todo {
    id: String!
    title: String!
    completed: Boolean
    createdAt: Date
    ownerId: String
    ownerName: String
}

type TodosPayload {
    error: String
    docs: [Todo]
}

type CreateTodoPayload {
    error: String
    id: String
}
```

### Update Schema Definition

Update `todoSchemaDefinition.ts` to reuse `securitySchemaDefinition` by declaring it as a "dependency".

This will expose authentication and user account management features from [ts-app/security](https://github.com/ts-app/ts-app/tree/master/packages/security) when [ts-app-graphql](https://github.com/ts-app/ts-app/tree/master/packages/graphql#ts-app-graphql) is started with `todoSchemaDefinition`:

`ts-app-graphql -p dist/todoSchemaDefinition.js -d -m mongodb://localhost:27017`

Duplicate `Query` and `Mutation` root types from dependent schema definitions are automatically merged/appended. All other root types are expected to be unique. Hence, the removal of `NoPayload` from `todo.graphqls`.

Updated `src/todoSchemaDefinition.ts`:

```typescript
import {
  mergeTypeDefs, ResolverService, SchemaDefinition,
  standardSchemaDefinition
} from '@ts-app/graphql'
import { loadFile } from '@ts-app/common'
import { TodoService } from './TodoService'
import { securitySchemaDefinition } from '@ts-app/security'
import { MongoService } from '@ts-app/mongo'

export const todoSchemaDefinition = ({ mongoService }: { mongoService: MongoService }): SchemaDefinition => {
  const resolver = ResolverService.getInstance()

  const standard = standardSchemaDefinition()
  const security = securitySchemaDefinition({ mongoService })

  const todoService = new TodoService()
  resolver.registerService(todoService)

  const typeDefs = mergeTypeDefs([ loadFile(`${__dirname}/todo.graphqls`) ])
  // create resolvers after all services with "@Resolver" are registered
  const resolvers = resolver.makeResolvers()

  return {
    resolvers, typeDefs,
    dependencies: {
      standard,
      security
    }
  }
}
```

## Start Application with `npm start`

To make it more convenient to compile and start GraphQL service, add a "start" script to `package.json`:

`"start": "npm run compile && npm run graphql"`

Now, you can start the application with `npm start`.

## Demos

If everything goes well, you should be able to access the GraphQL server after running `npm start`.

The demos below will walkthrough features created in this tutorial.

### Demo 1: JWT based authentication and pagination with GraphQL

[![JWT based authentication and pagination with GraphQL](https://img.youtube.com/vi/NU8DGtxmMdU/0.jpg)](https://www.youtube.com/watch?v=NU8DGtxmMdU)

In this demo, we will be performing the following tasks:

- Create test users (seeding).
- List users without logging in.
    - This will fail with "Unauthenticated access!".
- Login as admin.
    - Successful login will return a JSON Web Token (JWT) encoded access token.
    - To perform authenticated requests via GraphiQL, add `accessToken` to the URL.
- List users as admin.
    - Parameterize `users` query with `q`, `cursor` and `limit`.
    - Filter user with `q`.
    - Pagination can be implemented by using the `cursor` parameter.
    - Restrict number of user returned with `limit`.

### Demo 2: Only authorized users allowed to create Todos

[![Only authorized users allowed to create Todos](https://img.youtube.com/vi/wTASXDUoN2U/0.jpg)](https://www.youtube.com/watch?v=wTASXDUoN2U)

In this demo, we will be performing the following tasks:

- Security service was previously seeded with test users
- Create new user (bob)
    - sign up bob
    - login as bob
    - save userId and accessToken
    - use access token in HTTP header
        - append accessToken to GraphiQL URL
    - show create todo with "Unauthorized access!"
        - Note: Unauthorized means user is logged in but not allowed to use feature.
        - If user is NOT logged in, message will be "Unauthenticated".
- admin user grant bob access to todo
    - switch to admin access token
    - login as admin and use access token
    - addUsersToRoles bob to "User"
- bob can create todo
    - switch to bob access token
    - create todo
    - list todo

## Writing Tests

Depending on the purpose of the test, we can write tests against functions of a service class or perform actual GraphQL queries against a GraphQL service.

Test cases for `tests/TodoService.test.ts` are executed via `npm test`:

```
  TodoService
    ✓ todos() is empty (6ms)
    ✓ create() 1 todo (2ms)
    Execute GraphQL queries
      SecurityService
        ✓ cannot signUp() with invalid email (122ms)
        ✓ can signUp(). loginWithEmailPassword() (186ms)
        ✓ users() - authorized, unauthenticated and unauthorized access (862ms)
      TodoService
        ✓ before login cannot create role (23ms)
        ✓ todos(), createTodo(), updateTodo() with authentication and authorization checks (822ms)
        ✓ deleteTodo() (816ms)
        ✓ markCompleted() (785ms)
```

### Test Service Class

Test "core business logic" written in the service class.

Pro: Easier to set up/write, as it just involves instantiating the service class and calling the functions directly.

Con: Tests bypass features provided by [decorating functions with @Resolver](https://github.com/ts-app/ts-app/tree/master/packages/graphql#2-decorate-functions-with-resolver) (e.g. authentication).

Example:

```typescript
  test('create() 1 todo', async () => {
    const todo = new TodoService()
    let create = await todo.createTodo('bob', mockResolverParam)
    expect(create.error).toBeFalsy()
    create = await todo.createTodo('candy', mockResolverParam)
    expect(create.error).toBeFalsy()
    const title = (await todo.todos(null, mockResolverParam)).docs!.map(todo => todo.title)
    expect(title).toEqual([ 'bob', 'candy' ])
  })
```

### Test GraphQL Service

Ensure that application's codes, GraphQL schema types and schema definition are written correctly and works as intended.

Pro: Real GraphQL query execution. Each test starts an actual GraphQL server, execute GraphQL queries and assert results from respective HTTP calls. Authentication/Authorization code decorated on resolver functions is enforced.

Con: More tedious test setup/teardown process. Tests tend to take slightly longer to run as it needs to perform (local) HTTP calls for each GraphQL query.

All tests described within `Execute GraphQL queries` are testing against the GraphQL service.

Example:

```typescript
  // code to setup/teardown each test code not included

  const queryCreate = gql`mutation create($title: String!) {
      createTodo(title: $title) {
          error id
      }
  }`

  test('before login cannot create role', async () => {
    let result = await fetch({ query: queryCreate, variables: { title: 'first todo' } })
    expect(result.data.createTodo.error).toBe('Unauthenticated access!')
  })
```

## Next Step

That's it for the tutorial. This project is still under heavy development and is not feature complete.

So, use [graphql-todo](https://github.com/ts-app/graphql-todo) as a project template and create your GraphQL service.
