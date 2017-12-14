/**
 * FindWithCursor represents the returned type from a findXxxWithCursor() function. It supports
 * cursor based pagination.
 *
 * The type of "docs" is specified a generic type.
 */
export type FindWithCursor<T> = { cursor: string, docs: T[] }
