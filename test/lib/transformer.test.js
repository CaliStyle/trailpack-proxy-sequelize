const assert = require('assert')
const lib = require('../../lib')

describe('lib.Transformer', () => {
  describe('#transformModels', () => {
    it('should augment the models with identity and globalId', () => {
      const models = lib.Transformer.transformModels(global.app)

      assert(models.User)
      assert.equal(models.User.identity, 'user')
      assert.equal(models.User.globalId, 'User')
      assert.equal(models.User.migrate, 'drop')

      assert(models.Role)
      assert.equal(models.Role.identity, 'role')
      assert.equal(models.Role.globalId, 'Role')
      assert.equal(models.Role.migrate, 'drop')
    })
    it('should correctly set the connection', () => {
      const models = lib.Transformer.transformModels(global.app)

      assert.equal(models.User.connection, 'teststore')
      assert.equal(models.Role.connection, 'storeoverride')
    })
  })

  describe('#transformConnections', () => {
    it('should transform properly', () => {
      const connections = lib.Transformer.transformStores(global.app)

      assert(connections.teststore)
      assert.equal(connections.storeoverride.options.dialect, 'postgres')
    })
    it('should transform uri properly', () => {
      const connections = lib.Transformer.transformStores(global.app)
      assert(connections.uristore)
      assert.equal(connections.uristore.options.dialect, 'sqlite')
      assert.equal(connections.uristore.options.host, 'testhost')
      assert.equal(connections.uristore.config.host, 'testhost')
      assert.equal(connections.uristore.config.database, 'testdb')
      // test config for other dialects
      assert.equal(connections.uristore.config.port, 1234)
      assert.equal(connections.uristore.config.username, 'testuser')
      assert.equal(connections.uristore.config.password, 'password')
    })
  })

})
