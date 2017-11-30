/**
 * FindWithCursor is used to implement cursor based pagination.
 */
export type FindWithCursor<T> = { cursor: string, docs: T[] }
