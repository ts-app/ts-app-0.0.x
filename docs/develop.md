# Develop

## Setup

* `./scripts/reset.sh` to delete all generated files 
* `./scripts/init.sh` to build this project

## Tips

* `lerna bootstrap --hoist` - Install dependencies.
* `lerna bootstrap --hoist --scope @ts-app/security` - Install dependencies for a specific package (i.e. `@ts-app/security`) in the project.
* To use ts-app-graphql from the security package, you need to manually make graphql.js executable via `chmod +x ./packages/graphql/dist/graphql.js`.
