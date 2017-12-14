# ts-app/security

[![npm version](https://badge.fury.io/js/%40ts-app%2Fsecurity.svg)](https://badge.fury.io/js/%40ts-app%2Fsecurity)

This package provides fullstack authentication and user account management for GraphQL applications written with [@ts-app/graphql](https://github.com/ts-app/ts-app/tree/master/packages/graphql).

* Secure GraphQL services with JSON Web Token (JWT) authentication. 
* Authorize access to resolvers based on user roles or custom authorization functions.
* GraphQL mutations to allow unauthenticated users to sign up and login.
* Access security service management queries for authorized administrators.
* Easily integrate authentication, account & role management GraphQL queries as part of your application's 
GraphQL schema by reusing `securitySchemaDefinition` within your application's schema definition.
* Secure GraphQL resolvers with the `@Resolver()` decorator.

```typescript
// only for authenticated user assigned with "User" role
@Resolver({ auth: [ DefaultRoles.User ] })
async todos (q: string, resolverParams?: ResolverMiddlewareInput): Promise<{ error?: string, docs?: Todo[] }> {
    // resolver implementation...
}

// only for authenticated user where user ID equals value of GraphQL query parameter "ownerId"
@Resolver({ auth: userIdMatchParam('ownerId'), type: 'mutation' })
updateTodo ({ id, title, ownerId }: { id: string, title: string, ownerId: string }): { error?: string } {
    // resolver implementation...
}
```

## Similar Projects, Inspirations, Prior Art

* [Meteor - Users and Accounts](https://guide.meteor.com/accounts.html). Basically, Meteor introduced the idea of super simple user sign up and account management flows for NodeJS applications.
* [accounts-js](https://github.com/accounts-js/accounts). Server side goals are similar. `accounts-js` is probably more complete as it covers both server and client side. For now, `@ts-app/security`'s scope is only providing server side GraphQL support.
* [roles-npm](https://github.com/alanning/roles-npm) and [meteor-roles](https://github.com/alanning/meteor-roles). `RoleService` and the Mongo implementation `MongoRoleService` was translated very closely based on these packages with added static typing support. 

## Tutorial

The best way to get started, is to refer to the tutorial.

## Test Coverage

Some of these are simple unit tests, some use MongoDB while others sets up an actual GraphQL server to perform GraphQL queries with [apollo-fetch](https://github.com/apollographql/apollo-fetch).

Currently covered test scenarios:

```
$ npm run test
> jest --config config/jest.config.js --maxWorkers=1

 PASS  tests/MongoSecurityService.test.ts (7.283s)
  MongoSecurityService
    ✓ user sign up & login with email/password (via bcrypt) (187ms)
    ✓ user sign up & login with user ID (via JWT) (81ms)
    ✓ getProfile() (92ms)
    ✓ setProfile() and updateProfile() (82ms)
    ✓ user() (179ms)
    ✓ user() with invalid user ID (4ms)
    ✓ seedUsers() (734ms)
    ✓ seedUsers() cannot seed twice (695ms)
    ✓ users() (667ms)
    ✓ deleteUser() (82ms)
    ✓ seedUsers(true) will force delete (1329ms)
    ✓ reset() (730ms)
    ✓ seedUsers() - create roles (782ms)

 PASS  tests/MongoRoleService.test.ts
  MongoRoleService
    ✓ addUsersToRoles() (265ms)
    ✓ deleteRole() (277ms)
    ✓ getGroupsForUser() (319ms)
    ✓ getGroupsForUser() with invalid role (234ms)
    ✓ getGroupsForUser() with invalid user (30ms)
    ✓ findRolesWithCursor() (225ms)
    ✓ findRolesWithCursor() with query (232ms)
    ✓ getRolesForUser() (313ms)
    ✓ getUsersInRole() (271ms)
    ✓ removeUsersFromRoles() - remove "def" from user1 but not user2 (240ms)
    ✓ removeUsersFromAllRoles() (206ms)
    ✓ userIsInRoles() (312ms)

 PASS  tests/securitySchemaDefinition.test.ts
  securitySchemaDefinition
    ✓ security schema definition (79ms)
    ✓ signUp() with invalid email (63ms)
    ✓ signUp() without password (10ms)
    ✓ signUp() works (94ms)
    ✓ loginWithEmailPassword works (118ms)
    ✓ allow anonymous access to "signUp" (72ms)
    ✓ allow anonymous access to "loginWithEmailPassword" (7ms)
    ✓ prevent anonymous access to "users" (6ms)
    ✓ authorized access to "users" (912ms)
    ✓ authorized access with userIdMatchParam() (785ms)

Test Suites: 3 passed, 3 total
Tests:       35 passed, 35 total
Snapshots:   12 passed, 12 total
Time:        12.828s, estimated 14s
Ran all test suites.
```
