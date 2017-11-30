#!/usr/bin/env bash
rm package-lock.json
rm -fr node_modules

# common
rm packages/common/package-lock.json
rm -fr packages/common/dist
rm -fr packages/common/node_modules
rm packages/common/*.tgz

# graphql
rm packages/graphql/package-lock.json
rm -fr packages/graphql/dist
rm -fr packages/graphql/node_modules
rm packages/graphql/*.tgz

# mongo
rm packages/mongo/package-lock.json
rm -fr packages/mongo/dist
rm -fr packages/mongo/node_modules
rm packages/mongo/*.tgz

# security
rm packages/security/package-lock.json
rm -fr packages/security/dist
rm -fr packages/security/node_modules
rm packages/security/*.tgz
