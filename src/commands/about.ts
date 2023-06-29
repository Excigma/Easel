import { ApplyOptions } from '@sapphire/decorators'
import { Command, RegisterBehavior } from '@sapphire/framework'

@ApplyOptions<Command.Options>({
  name: 'about',
  description: 'Information about Easel'
})
class AboutCommand extends Command {
  public override registerApplicationCommands (registry: Command.Registry): void {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description),
    {
      idHints: ['1063980653164625960'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
  }

  public async chatInputRun (interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const about = [
      "Easel is a Discord bot that provides a bridge between the University of Auckland's Canvas LMS and Discord.",
      '',
      "Easel historically runs off a single user's Canvas account and used the Canvas API, however due to limitations, Easel now uses other methods to gather data.",
      '',
      'Easel now utilizes RSS feeds for courses and the exportable calendar to fetch data for users. While this limits what Easel can do, it allows you to use Easel without having to give it your Canvas credentials.',
      '',
      "However, to be honest, using the methods Easel now uses to fetch data directly may be more favorable. For example, you can use an RSS reader for Canvas announcements and import the calendar into your phone's calendar. That way, you can stay up-to-date with everything happening on Canvas without having to rely on Easel."
    ].join('\n')

    await interaction.reply({
      content: about,
      ephemeral: true
    })
  }
}

module.exports = { AboutCommand }
