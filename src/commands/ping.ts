import { ApplyOptions } from '@sapphire/decorators'
import { Command, RegisterBehavior } from '@sapphire/framework'

@ApplyOptions<Command.Options>({
  name: 'ping',
  description: "Check Easel's connection to Discord"
})
export class PingCommand extends Command {
  public override registerApplicationCommands (registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    {
      idHints: ['797033342818189342'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    }
    )
  }

  public async chatInputRun (interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const msg = await interaction.reply({ content: 'Ping?', fetchReply: true })

    if (msg.createdTimestamp !== null) {
      const diff = msg.createdTimestamp - interaction.createdTimestamp
      const ping = Math.round(this.container.client.ws.ping)
      await interaction.editReply(`Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`)

      return
    }

    await interaction.editReply('Failed to retrieve ping :(')
  }
}
