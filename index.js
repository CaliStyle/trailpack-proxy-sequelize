/* eslint no-console: [0] */

'use strict'

const Trailpack = require('trailpack-datastore')
const lib = require('./lib')
const _ = require('lodash')

module.exports = class ProxySequelizeTrailpack extends Trailpack {

  /**
   * Validate the database config, and api.model definitions
   */
  validate() {

    if (!_.includes(_.keys(this.app.packs), 'router')) {
      return Promise.reject(new Error('Trailpack-proxy-sequelize requires trailpack-router!'))
    }

    const stores = _.get(this.app.config, 'database.stores')
    if (stores && Object.keys(stores).length === 0) {
      this.app.config.log.logger.warn('No store configured at config.database.stores, models will be ignored')
    }
    return Promise.all([
      lib.Validator.validateDatabaseConfig(this.app.config.database)
    ])
  }

  /**
   * Merge configuration into models, load Sequelize collections.
   */
  configure() {
    this.app.config.database.orm = 'proxy-sequelize'
    _.merge(this.app.config, lib.FailsafeConfig)
  }

  /**
   * Initialize Sequelize. This will compile the schema and connect to the
   * database.
   */
  initialize() {
    super.initialize()

    this.orm = this.orm || {}
    this.app.orm = {}
    this.connections = lib.Transformer.transformStores(this.app)
    this.models = lib.Transformer.transformModels(this.app)

    // Define the new models into Sequelize Models
    lib.ProxySequelize.defineModels(this.app, this.models, this.connections)

    // Transform the ORM
    lib.ProxySequelize.transformOrm(this.app, this.orm, this.models)

    // Migrate the Schema of the new Models
    return lib.ProxySequelize.migrate(this.app, this.connections)
  }

  /**
   * Close all database connections
   */
  unload() {
    return Promise.all(
      _.map(this.connections, connection => {
        return new Promise((resolve, reject) => {
          connection.close()
          resolve()
        })
      })
    )
  }

  constructor(app) {
    super(app, {
      config: require('./config'),
      api: require('./api'),
      pkg: require('./package')
    })
  }
}
