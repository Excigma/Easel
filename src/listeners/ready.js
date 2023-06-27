const { Listener } = require('@sapphire/framework')

class ReadyEvent extends Listener {
  constructor (context, options = {}) {
    super(context, {
      ...options
    })
  }

  run () {
    console.log(`Ready. Logged in as ${this.container.client.user.tag}`)
  }
}

module.exports = {
  ReadyEvent
}
