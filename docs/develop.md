# Develop

## Setup

* `./scripts/reset.sh` to delete all generated files 
* `./scripts/init.sh` to build this project

## Tips

* `lerna bootstrap --hoist` - Install dependencies.
* `lerna bootstrap --hoist --scope @ts-app/security` - Install dependencies for a specific package (i.e. `@ts-app/security`) in the project.
* To use ts-app-graphql from the security package, you need to manually make graphql.js executable via `chmod +x ./packages/graphql/dist/graphql.js`.

## File Naming Convention

* Use exported module name as filename.
  * `UpperCamelCase` for interface, type, enum or class.
  * `lowerCamelCase` for function.
* Avoid default export.
* Avoid exporting multiple objects from single file.

## JavaScript/TypeScript Practices

* Avoid destructuring parameters in function declaration (as a [workaround](https://github.com/TypeStrong/typedoc/issues/653) for better TypeDoc generated documentation).

## Common Design Patterns

* Use TypeScript interface to define a service's contract. This project uses [strict type checking](https://blog.mariusschulz.com/2017/06/09/typescript-2-3-the-strict-compiler-option#strict-type-checking-options) and avoids declaring types as `any`.
* For functions with multiple parameters, use single input object to receive GraphQL query parameters to avoid manual mapping using `@Resolver({ paramNames })`. 
* Return value is an object with optional keys. An `error` key for errors that can be managed by caller function. If there is no error, function specific key(s) can be returned.
* Asynchronous functions should use `async/await` and return `Promise<T>`.
* `@Resolver()` are decorated on service implementations (i.e. `MongoSecurityService`).
* Declare TypeScript type definitions carefully. It must be compatible with GraphQL schema definition including specifying if a field is optional.  
```
type Query {
    # userIsInRoles (input: { userId: string, roles: string | string[], group?: string }): Promise<boolean>
    userIsInRoles(userId: String!, roles: [String]!, group: String): Boolean
    
    # getGroupsForUser (input: { userId: string, role?: string }): Promise<{ error?: string, groups?: string[] }>
    getGroupsForUser(userId: String!, role: String): GetGroupsForUserPayload
    
    # findRolesWithCursor (input?: { q?: string, limit?: number, cursor?: string }): Promise<FindWithCursor<Role>>
    findRolesWithCursor(q: String, limit: Int, cursor: String): FindRolesWithCursorPayload
    
    # getRolesForUser (input: { userId: string, group?: string }): Promise<{ error?: string, roles?: string[] }>
    # (use resolver to function name mapping) 
    userRoles(userId: String!, group: String): GetRolesForUserPayload
    
   # getUsersInRoles (input: { roles: string | string[], group?: string, limit?: number, cursor?: string }): Promise<FindWithCursor<User>>
    getUsersInRoles(roles: [String]!, group: String, limit: Int, cursor: String): GetUsersInRolesPayload
}

type Mutation {
    # addUsersToRoles (input: { userIds: string | string[], roles: string | string[], group?: string }): Promise<{ error?: string }>
    addUsersToRoles(userIds: [String]!, roles: [String], group: String): NoPayload
    
    # createRole (input: { name: string }): Promise<{ error?: string, id: string }>
    createRole(name: String!): CreateRolePayload
    
    # removeRole (input: { name: string }): Promise<{ error?: string }>
    removeRole(name: String!): NoPayload
    
    # removeUsersFromRoles (input: { userIds: string | string[], roles: string | string[], group?: string }): Promise<{ error?: string }>
    removeUsersFromRoles(userIds: [String]!, roles: [String]!, group: String): NoPayload
    
    # removeUsersFromAllRoles (input: { userIds: string | string[] }): Promise<{ error?: string }>
    removeUsersFromAllRoles(userIds: [String]!): NoPayload
}
```

## Why so many tsconfig.json?

* tsconfig.json - The main tsconfig.json file where configuration are specified. 
* packages/*/config/tsconfig-compile.json - Extends from base tsconfig.json to specify production build compilation settings.
* packages/*/config/ts-config-test.json - Extends from base tsconfig.json to specify test specific compilation settings.
* packages/*/tsconfig.json - Used by typedoc because I cannot find a way to specify the file directly.
