import { MongoService } from '../src/MongoService'
import { MongoUpdateBuilder } from '../src/MongoUpdateBuilder'

describe('MongoDbService', async () => {
  const localUrl = 'mongodb://localhost:27017'
  let mongoService: MongoService

  beforeEach(async () => {
    mongoService = new MongoService(localUrl)
    try {
      await mongoService.dropCollection('test')
    } catch (e) {
      // just ignore if cannot drop
    }
  })

  afterEach(async () => {
    const db = await mongoService.db()
    return db.close()
  })

  test('crud', async () => {
    type DocSchema = {
      id: string
      title: string
      description: string
    }

    // --- create
    const createResult = await mongoService.create<DocSchema>('test', {
      id: '',
      title: 'test 123',
      description: 'test 123'
    })
    expect(createResult.length).toBe(24)

    // --- read
    let doc = await mongoService.get<DocSchema>('test', createResult)
    expect(doc!.id).toBe(createResult)
    expect(doc!.title).toBe('test 123')

    // --- update
    const updateDoc = new MongoUpdateBuilder({ title: 'changed 456' }).$set('title').build()
    await mongoService.update('test', createResult, updateDoc)
    doc = await mongoService.get<DocSchema>('test', createResult)
    expect(doc!.title).toBe('changed 456')
    expect(doc!.description).toBe('test 123')

    // --- delete
    let deleteResult = await mongoService.remove('test', createResult)
    expect(deleteResult).toBe(1)
    expect(await mongoService.get<DocSchema>('test', createResult)).toBeNull()
  })

  test('remove() invalid id', async () => {
    await expect(
      mongoService.remove('test', null as any)
    ).rejects.toEqual(new Error('Invalid ID or filter'))
  })

  test('collectionExist()', async () => {
    try {
      await mongoService.dropCollection('test-collection')
    } catch {
      // just ignore if nothing to drop
    }

    let testCollectionExist = await mongoService.collectionExist('test-collection')
    expect(testCollectionExist).toBe(false)

    await mongoService.create('test-collection', { sample: 123 })
    testCollectionExist = await mongoService.collectionExist('test-collection')
    expect(testCollectionExist).toBe(true)

    await mongoService.dropCollection('test-collection')
  })

  test('get() with options', async () => {
    type DocSchema = { name: string, description: string }

    await mongoService.create<DocSchema>('test', { name: 'abc', description: 'def' })

    // get all fields
    let get = await mongoService.get<DocSchema>('test', { name: 'abc' })
    expect(get!.name).toBe('abc')
    expect(get!.description).toBe('def')

    // only projected fields
    get = await mongoService.get<DocSchema>('test', { name: 'abc' }, {
      fields: {
        description: 1
      }
    })
    expect(get!.name).toBeUndefined()
    expect(get!.description).toBe('def')
  })
})
