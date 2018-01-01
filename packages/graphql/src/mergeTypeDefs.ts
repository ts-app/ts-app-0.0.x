import { DocumentNode, ObjectTypeDefinitionNode, parse } from 'graphql'

const getInsertLocation = (typeDef: string, rootToInsert: 'Query' | 'Mutation' | string) => {
  const parsed = parse(typeDef)
  const root = parsed.definitions.find(d => {
    if (d.kind === 'ObjectTypeDefinition') {
      const otd: ObjectTypeDefinitionNode = d
      if (otd.name.kind === 'Name' && otd.name.value === rootToInsert && otd.fields.length > 0) {
        return true
      }
    }
    return false
  })

  if (root) {
    const otd = root as ObjectTypeDefinitionNode
    return otd.fields[ otd.fields.length - 1 ].loc!.end
  }

  // rootToInsert does not exist
  return null
}

const extract = (typeDef: string, rootToExtract: 'Query' | 'Mutation', rootsToExclude: string[]) => {
  // --- GraphQL parse type definitions
  const parsed = parse(typeDef)

  let root: ObjectTypeDefinitionNode | null = null
  const excludedLocs: { start: number, end: number }[] = []

  const excludes = Array.from(new Set([ ...rootsToExclude, rootToExtract ]))
  parsed.definitions.map(d => {
    if (d.kind === 'ObjectTypeDefinition') {
      const otd: ObjectTypeDefinitionNode = d

      if (otd.name.kind === 'Name' && otd.name.value === rootToExtract && otd.fields.length > 0) {
        root = otd
      }
      if (otd.name.kind === 'Name' && excludes.indexOf(otd.name.value) !== -1 && otd.loc) {
        excludedLocs.push(otd.loc)
      }
    }
  })

  // --- extract specified root queries
  let queries
  if (root) {
    const otd = root as ObjectTypeDefinitionNode
    const start = otd.fields[ 0 ].loc!.start
    const end = otd.fields[ otd.fields.length - 1 ].loc!.end

    queries = typeDef.substring(start, end)
  } else {
    queries = ''
  }

  // --- extract type definition with unwanted roots filtered
  let reduced = excludedLocs.reduce<{ result: string, startIdx: number }>((prev, loc) => {
    prev.result += typeDef.substring(prev.startIdx, loc.start)
    prev.startIdx = loc.end
    return prev
  }, {
    result: '',
    startIdx: 0
  })
  const filteredTypeDef = reduced.result + typeDef.substring(reduced.startIdx)

  return {
    queries,
    filteredTypeDef
  }
}

const getLoc = (doc: DocumentNode, rootType: string) => {
  const definition = doc.definitions.find(d => {
    if (d.kind === 'ObjectTypeDefinition') {
      return d.name.kind === 'Name' && d.name.value === rootType
    }
    return false
  })

  return definition ? definition.loc : null
}

const removeRootType = (typeDef: string, rootType: string) => {
  const loc = getLoc(parse(typeDef), rootType)
  return loc ? typeDef.substring(0, loc.start) + typeDef.substring(loc.end) : typeDef
}

const mergeRootType = (mainTypeDef: string, typeDefs: string[], rootType: 'Query' | 'Mutation', appendFilteredTypeDef: boolean = false) => {
  const insertAt = getInsertLocation(mainTypeDef, rootType)

  const reduced = typeDefs.reduce<{ queries: string, filteredTypeDef: string }>((prev, typeDef) => {
    const current = extract(typeDef, rootType, [ 'Query', 'Mutation' ])
    prev.queries += current.queries
    prev.filteredTypeDef += current.filteredTypeDef
    return prev
  }, {
    queries: '',
    filteredTypeDef: ''
  })

  let merged = ''

  if (insertAt === null) {
    merged += `type ${rootType} {\n`
  } else {
    merged = mainTypeDef.substring(0, insertAt)
  }
  merged += '\n' + reduced.queries

  if (insertAt === null) {
    merged += `}\n${removeRootType(mainTypeDef, rootType)}`
  } else {
    merged += mainTypeDef.substring(insertAt)
  }

  if (appendFilteredTypeDef) {
    merged += `\n${reduced.filteredTypeDef}`
  }

  return merged
}

/**
 * Merge an array of type definition strings. This function allows "Query" and "Mutation" root types
 * to be repeated - by appending contents of such repeated root types.
 */
export const mergeTypeDefs = (typeDefs: string[]): string => {
  const first = typeDefs.shift() as string

  const mergedQuery = mergeRootType(first, typeDefs, 'Query')

  return mergeRootType(mergedQuery, typeDefs, 'Mutation', true)
}
