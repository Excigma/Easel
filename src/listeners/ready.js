const { Listener } = require('@sapphire/framework')
const { FeedCheck } = require('../lib/recurringPolls/feedCheck')
const cron = require('node-cron')

class ReadyEvent extends Listener {
  constructor (context, options = {}) {
    super(context, {
      ...options,
      once: true
    })
  }

  run () {
    console.log(`Ready. Logged in as ${this.container.client.user.tag}`)

    // TODO: Check for announcements, due dates, panopto uploads etc.

    this.start_recurring_notify_check(FeedCheck)
  }

  async start_recurring_notify_check (Check) {
    const check = new Check()

    if (!check.noRunOnStart) await check.run()
    for (const cronjob of check.cronjobs) {
      cron.schedule(cronjob, check.run, { timezone: 'Pacific/Auckland' }).start()
    }
  }
}

module.exports = {
  ReadyEvent
}
