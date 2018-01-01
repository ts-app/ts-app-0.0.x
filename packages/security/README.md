# ts-app/security

[![npm version](https://badge.fury.io/js/%40ts-app%2Fsecurity.svg)](https://badge.fury.io/js/%40ts-app%2Fsecurity)

Fullstack authentication and user account management for GraphQL applications written with [@ts-app/graphql](https://github.com/ts-app/ts-app/tree/master/packages/graphql).

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


## Next Step

Try the [@ts-app/security - Tutorial](https://github.com/ts-app/ts-app/blob/master/packages/security/docs/tutorial.md).
