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
    _.each(this.models, (model, modelName) => {
      _.each(this.connections, (connection, name) => {
        if (model.connection === name) {
          // console.log('CONNECTION',connection)
          // this.app.orm[model.globalId] = connection.define(modelName, model.schema, model.config)

          const Model = connection.define(modelName, model.schema, model.config)

          Object.defineProperties(Model, {
            app: {
              enumerable: false,
              value: this.app
            }
          })

          Model.methods = model.methods
          Model.methods.forEach(method => {
            Model[method] = model[method]
          })

          // Migration to Version 2 Assistance
          if (model.config) {
            if (model.config.classMethods) {
              this.app.config.log.logger.warn(`Sequelize v4 does not support class methods, proxy-sequelize ${modelName}.classMethods will be deprecated in v3`)
              for (const methodName in model.config.classMethods) {
                Model[methodName] = model.config.classMethods[methodName]
              }
            }

            if (model.config.instanceMethods) {
              this.app.config.log.logger.warn(`Sequelize v4 does not support instancec methods, proxy-sequelize ${modelName}.instanceMethods will be deprecated in v3`)
              for (const methodName in model.config.instanceMethods) {
                Model.prototype[methodName] = model.config.instanceMethods[methodName]
              }
            }
          }

          this.app.orm[model.globalId] = Model
        }

      })
    })

    _.each(this.models, (model, modelName) => {

      // ignore model if not configured
      if (!this.app.orm[model.globalId]) {
        return
      }

      if (this.app.orm[model.globalId].associate) {
        console.log('HAS ASSOCIATIONS', this.app.orm[model.globalId])
        this.app.orm[model.globalId].associate(this.app.orm)
      }

      this.orm[model.globalId.toLowerCase()] = this.app.orm[model.globalId]
    })

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

  // migrate() {
  //   const SchemaMigrationService = this.app.services.SchemaMigrationService
  //   const database = this.app.config.database
  //
  //   if (database.models.migrate === 'none') return
  //
  //   return Promise.all(
  //     _.map(this.connections, connection => {
  //
  //       if (database.models.migrate === 'drop') {
  //         return SchemaMigrationService.dropDB(connection)
  //       }
  //       else if (database.models.migrate === 'alter') {
  //         return SchemaMigrationService.alterDB(connection)
  //       }
  //     })
  //   )
  // }

  constructor(app) {
    super(app, {
      config: require('./config'),
      api: require('./api'),
      pkg: require('./package')
    })
  }
}
