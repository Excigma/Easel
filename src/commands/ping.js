const { Command, RegisterBehavior } = require('@sapphire/framework')

class PingCommand extends Command {
  constructor (context, options) {
    super(context, {
      ...options,
      name: 'ping',
      description: "Check Easel's connection to Discord"
    })
  }

  registerApplicationCommands (registry) {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description), {
      idHints: ['797033342818189342'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
  }

  async chatInputRun (interaction) {
    const msg = await interaction.reply({ content: 'Ping?', fetchReply: true })

    if (msg.createdTimestamp) {
      const diff = msg.createdTimestamp - interaction.createdTimestamp
      const ping = Math.round(this.container.client.ws.ping)
      return interaction.editReply(`Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`)
    }

    return interaction.editReply('Failed to retrieve ping :(')
  }
}

module.exports = { PingCommand }
