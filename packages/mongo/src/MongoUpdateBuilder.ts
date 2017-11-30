/**
 *
 * @deprecated will be removed
 */
export class MongoUpdateBuilder {
  private data: { [key: string]: any }
  private $setKeys: string[] = []

  constructor (data: object) {
    this.data = data
  }

  $set (...keys: string[]) {
    this.$setKeys = [
      ...this.$setKeys,
      ...keys
    ]
    return this
  }

  build () {
    const $set: { [key: string]: any } = {}

    this.$setKeys.map(key => {
      const value = this.data[ key ]
      if (value !== undefined) {
        $set[ key ] = value
      }
    })

    return {
      $set
    }
  }
}
