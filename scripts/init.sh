#!/usr/bin/env bash
# install dependencies for project
npm install

# install dependencies for packages
lerna bootstrap --hoist

# test, lint, compile packages
lerna run lint
lerna run compile
lerna run test
lerna run coverage
