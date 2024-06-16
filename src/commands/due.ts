import { ApplyOptions } from '@sapphire/decorators'
import { prisma } from '../lib/prisma'
import { Command } from '@sapphire/framework'
import { fetchCalendar, formatCalendar } from '../lib/serviceAdapters/calendar'
import { PaginatedMessage } from '@sapphire/discord.js-utilities'

import { EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import { DATABASE_ACCESS_ERROR, strError, strWarn } from '../lib/constants'

@ApplyOptions<Command.Options>({
  name: 'due',
  description: 'Check upcoming deadlines that are set on Canvas',
  requiredClientPermissions: [PermissionFlagsBits.EmbedLinks]
})
export class DueCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry): void {
    // Register Chat Input command
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description
    });
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    try {
      // Check if the user has their canvasICalendar relational field set
      const user = await prisma.user.findUnique({
        where: {
          id: interaction.user.id
        },
        select: {
          canvasCalendar: true
        }
      })

      if ((user?.canvasCalendar) == null) {
        await interaction.reply({
          content: strWarn('It seems that your Canvas calendar url has not been linked yet. The `/due` command needs to access your Canvas calendar to retrieve due dates. You can link your calendar URL
      }

      await interaction.deferReply()

      const data = formatCalendar(await fetchCalendar(user.canvasCalendar.url))

      // Sometimes channel is null - attempt to fetch the channel if it's null, otherwise
      // send an unpaginated response.
      if (interaction.channel == null) {
        try {
          await this.container.client.channels.fetch(interaction.channelId)
        } catch (error) {
          this.container.logger.error(error)

          // TODO: Proper error handling.
          // If missing access, then tell user that the bot needs to be re-invited

          await (interaction.replied ? interaction.followUp : interaction.reply)({
            content: strWarn('I do not have permission to view this channel. Permission to view this channel is required for pagination, and this command to work.'),
            ephemeral: true
          })

          return
        }
      }

      const paginatedMessage = new PaginatedMessage({
        template: new EmbedBuilder()
          .setColor(0x2694D7)
          .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTitle('Canvas Due Dates')
          .setFooter({
            iconURL: this.container.client.user?.displayAvatarURL(),
            text: "Deadlines are from Canvas"
          })
      })

      const PLACEHOLDER_TEXT = "*There may be issues with times returned from Canvas. Please check Canvas for the correct times.*\n\n"
      let page = PLACEHOLDER_TEXT

      // Split due dates up into pages
      for (const event of data) {
        const title = event.url ? `[${event.title}](${event.url})` : event.title
        const eventText = `**${title}**\n*${event.course}*\n> due <t:${event.timestamp}:R> at <t:${event.timestamp}:F>\n\n`

        if (page.length + eventText.length > 1500) {
          paginatedMessage.addPageEmbed((embed) => embed.setDescription(page))
          page = PLACEHOLDER_TEXT
        }

        page += eventText
      }

      // Add a placeholder warning if there are no due dates
      if (data.length === 0) {
        page = [
          'It appears that there are no upcoming due dates at this time. It may be a good opportunity to touch grass now.',
          '',
          'However, we recommend checking your [calendar on Canvas](https://canvas.auckland.ac.nz/calendar) to confirm this and to check other platforms for any additional deadlines.'
        ].join('\n')
      }

      paginatedMessage.addPageEmbed((embed) => embed.setDescription(page))

      await paginatedMessage.run(interaction)
    } catch (error) {
      this.container.logger.error(error)

      await (interaction.replied ? interaction.followUp : interaction.reply)({
        content: strError(DATABASE_ACCESS_ERROR),
        ephemeral: true
      })
    }
  }
}
