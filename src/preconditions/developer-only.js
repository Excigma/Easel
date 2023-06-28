const { Precondition } = require('@sapphire/framework')

class DeveloperOnlyPrecondition extends Precondition {
  async messageRun (message) {
    return (message.author.id === process.env.OWNER_ID
      ? this.ok()
      : this.error({ message: 'This command can only be used by the developer of the bot.' }))
  }
}

module.exports = { DeveloperOnlyPrecondition }
