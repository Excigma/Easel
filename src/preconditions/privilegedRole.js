const { Precondition } = require('@sapphire/framework')

// TODO: Investigate using this precondition in src/commands/subscribe.js
class RolePrecondition extends Precondition {
  async messageRun (message) {
    await message.member.fetch()
    return message.member.roles.cache.hasAny([])
      ? this.ok()
      : this.error({ message: 'This command can only be used by members with a specified role.' })
  }
}

module.exports = { RolePrecondition }
