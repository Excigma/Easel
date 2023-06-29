import { RegisterBehavior, Command } from '@sapphire/framework'
import { strSuccess, strInfo } from '../lib/constants'
import { ApplyOptions } from '@sapphire/decorators'

@ApplyOptions<Command.Options>({
  name: 'execute',
  description: 'Developer only. Executes hardcoded code for use in development (mostly to unregister/edit commands).',
  preconditions: ['DeveloperOnly']
})
class ExecuteCommand extends Command {
  registerApplicationCommands (registry: Command.Registry): void {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description), {
      idHints: ['1064385467325366293'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
  }

  async chatInputRun (interaction: Command.ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      content: strInfo('Executing code...'),
      ephemeral: true
    })

    // Stub code

    await interaction.editReply(strSuccess('Done'))
  }
}

export { ExecuteCommand }
