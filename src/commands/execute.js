const { RegisterBehavior } = require('@sapphire/framework')
const { Subcommand } = require('@sapphire/plugin-subcommands')
const { strInfo, strSuccess } = require('../lib/utils')

class ExecuteCommand extends Subcommand {
  /**
   * @param {import('@sapphire/framework').Command.Context} context
   * @param {import('@sapphire/framework').Command.Options} options
   */
  constructor (context, options) {
    super(context, {
      ...options,
      name: 'c',
      description: 'Developer only. Executes hardcoded code for use in development (mostly to unregister/edit commands).',
      preconditions: ['DeveloperOnly']
    })
  }

  /** @param {import('@sapphire/framework').ApplicationCommandRegistry} registry */
  registerApplicationCommands (registry) {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description), {
      idHints: ['1064385467325366293'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
  }

  /** @param {import('discord.js').Interaction} interaction */
  async chatInputRun (interaction) {
    await interaction.reply({
      content: strInfo('Executing code...'),
      ephemeral: true
    })

    // Stub code

    interaction.editReply(strSuccess('Done'))
  }
}

module.exports = { ExecuteCommand }
