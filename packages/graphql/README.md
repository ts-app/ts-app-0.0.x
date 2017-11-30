# ts-app/graphql

- @Resolver decorator expose regular functions as GraphQL resolvers.
- Create NPM packages that expose executable GraphQL schema.


```
#  List schema definitions in package
ts-app-graphql -p @ts-app/security

# Start GraphQL server with security schema and MongoDB connection
ts-app-graphql -p @ts-app/security -s securitySchemaDefinition -m mongodb://localhost:27017
```


* GraphQL
  * Create resolvers by decorating functions with @Resolver()
  * Flexible resolver naming and parameter mapping
  * xx
  * Security
      * Security service to manage user and roles
      * JWT Authentication
      * Role based Authorization
  * Working with multiple schemas
    * Merge schema definitions
    * Predefined schema definition for common scalar types
  * Define schema definitions that can be easi
  *  (schema stitching)
