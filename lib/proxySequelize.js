/* eslint no-console: [0] */
'use strict'

const _ = require('lodash')

module.exports = {
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
