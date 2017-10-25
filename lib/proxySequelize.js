/* eslint no-console: [0] */
'use strict'

const _ = require('lodash')

module.exports = {

  defineModels: (app, models, connections) => {
    _.each(models, (model, modelName) => {
      _.each(connections, (connection, name) => {
        if (model.connection === name) {

          const Model = connection.define(modelName, model.schema, model.options)

          Object.defineProperties(Model, {
            app: {
              enumerable: false,
              value: app
            }
          })

          Model.methods = model.methods
          Model.methods.forEach(method => {
            Model[method] = model[method]
          })

          // Migration to Version 2 Assistance for classMethods
          if (model.options) {
            if (model.options.classMethods) {
              app.config.log.logger.warn(`Sequelize v4 does not support classMethods, proxy-sequelize ${modelName}.classMethods will be deprecated in v3`)
              for (const methodName in model.options.classMethods) {
                Model[methodName] = model.options.classMethods[methodName]
              }
            }

            // Migration to Version 2 Assistance for instnaceMethods
            if (model.options.instanceMethods) {
              app.config.log.logger.warn(`Sequelize v4 does not support instanceMethods, proxy-sequelize ${modelName}.instanceMethods will be deprecated in v3`)
              for (const methodName in model.options.instanceMethods) {
                Model.prototype[methodName] = model.options.instanceMethods[methodName]
              }
            }
          }

          app.orm[model.globalId] = Model
        }
      })
    })
  },

  transformOrm: (app, orm, models) => {
    _.each(models, (model, modelName) => {

      // ignore model if not configured
      if (!app.orm[model.globalId]) {
        return
      }

      // Assoc
      if (app.orm[model.globalId].associate) {
        app.orm[model.globalId].associate(app.orm)
      }

      orm[model.globalId.toLowerCase()] = app.orm[model.globalId]
    })
  },

  migrate: (app, connections) => {
    const SchemaMigrationService = app.services.SchemaMigrationService
    const database = app.config.database

    if (database.models.migrate === 'none') return

    return Promise.all(
      _.map(connections, connection => {

        if (database.models.migrate === 'drop') {
          return SchemaMigrationService.dropDB(connection)
        }
        else if (database.models.migrate === 'alter') {
          return SchemaMigrationService.alterDB(connection)
        }
      })
    )
  }
}
