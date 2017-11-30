import { Collection, Cursor, Db, FindOneOptions, MongoClient, ObjectId } from 'mongodb'
import { FindWithCursor } from './FindWithCursor'

/**
 * MongoService provides to access MongoDB via promise based functions for common usage patterns such as CRUD and pagination via cursor.
 */
export class MongoService {
  private mongoUrl: string
  private _db: Db

  constructor (mongoUrl: string) {
    this.mongoUrl = mongoUrl
  }

  mapMongoId<T> (o: any): T {
    if (Array.isArray(o)) {
      o = o.map(doc => {
        doc.id = doc._id.toString()
        return doc
      })
    } else {
      o.id = o._id.toString()
    }
    return o
  }

  async create<T = object> (collectionName: string, doc: T): Promise<string> {
    const collection = await this.collection(collectionName)
    const result = await collection.insertOne(doc)

    if (result.result.ok === 1) {
      return result.insertedId.toString()
    } else {
      throw new Error('Error creating document')
    }
  }

  async get<T> (collectionName: string, idOrFilter: string | object, options?: FindOneOptions): Promise<T | null> {
    let filter
    if (typeof idOrFilter === 'string') {
      filter = { _id: new ObjectId(idOrFilter) }
    } else {
      filter = idOrFilter
    }
    const collection = (await this.db()).collection(collectionName)
    const doc = await collection.findOne(filter, options)
    if (doc) {
      return this.mapMongoId<T>(doc)
    } else {
      return null
    }
  }

  async cursor<T> (collectionName: string, query: object): Promise<Cursor<T>> {
    const collection = (await this.db()).collection(collectionName)
    return collection.find(query)
  }

  async update (collectionName: string, id: string, update: object): Promise<void> {
    const collection = await this.collection(collectionName)
    const result = await collection.updateOne({ _id: new ObjectId(id) }, update)
    if (result.result.ok !== 1) {
      throw new Error(`Error updating document with ID [${id}]`)
    }
  }

  async remove (collectionName: string, idOrFilter: string | object): Promise<number> {
    let deleteById
    let filter
    let result

    if (!idOrFilter) {
      throw new Error('Invalid ID or filter')
    }

    if (typeof idOrFilter === 'string') {
      filter = { _id: new ObjectId(idOrFilter) }
      deleteById = true
    } else {
      filter = idOrFilter
    }

    const collection = await this.collection(collectionName)
    if (deleteById) {
      result = await collection.deleteOne(filter)
    } else {
      result = await collection.deleteMany(filter)
    }
    if (result.result.ok) {
      return result.result.n!
    } else {
      throw new Error('Error deleting document')
    }
  }

  async collection (collectionName: string): Promise<Collection> {
    const db = await this.db()
    return db.collection(collectionName)
  }

  /**
   * Drop collection with the specified name.
   *
   * @param {string} collectionName
   * @return {Promise<ServiceOutput<void>>}
   */
  async dropCollection (collectionName: string): Promise<{ error?: string }> {
    try {
      const db = await this.db()
      const Collection = db.collection(collectionName)
      const result = await Collection.drop()

      if (result === true) {
        return {}
      } else {
        return { error: `Error dropping collection [${collectionName}]` }
      }

    } catch (error) {
      if (error.message) {
        return { error: `Error dropping collection [${collectionName}] - ${error.message}` }
      } else {
        return { error: `Error dropping collection [${collectionName}] - unknown error` }
      }
    }
  }

  async collectionExist (collectionName: string): Promise<boolean> {
    const db = await this.db()
    const collections = await db.collections()
    return !!collections.find(c => c.collectionName === collectionName)
  }

  async db (): Promise<Db> {
    if (!this._db) {
      this._db = await MongoClient.connect(this.mongoUrl)
    }
    return this._db
  }

  async findWithCursor<T> (collectionName: string, filter: object, limit: number = 10,
                           cursor?: string): Promise<FindWithCursor<T>> {
    const collection = await this.collection(collectionName)
    let filterWithCursor = filter
    if (cursor) {
      filterWithCursor = {
        ...filterWithCursor,
        _id: { $gt: new ObjectId(cursor) }
      }
    }
    const doc = await collection.find(filterWithCursor).limit(limit).toArray()
    const newCursor = doc.length > 0 ? doc[ doc.length - 1 ]._id : null
    return {
      cursor: newCursor === null ? null : newCursor.toString(),
      docs: this.mapMongoId(doc)
    }
  }
}
