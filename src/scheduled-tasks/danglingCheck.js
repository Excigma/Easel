const { Time } = require('@sapphire/time-utilities')
const { prisma } = require('../lib/prisma')
const { ScheduledTask } = require('@sapphire/plugin-scheduled-tasks')

class DanglingCheckTask extends ScheduledTask {
  /**
     * @param {ScheduledTask.Context} context
     * @param {ScheduledTask.Options} options
     */
  constructor (context, options) {
    super(context, {
      ...options,
      interval: Time.Day
    })
  }

  async run () {
    // TODO: Remove Broadcast entries from the database from courses that no longer exist
  }
}

module.exports = { DanglingCheckTask }
