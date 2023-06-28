const { prisma } = require('../lib/prisma')
const { Command, RegisterBehavior } = require('@sapphire/framework')
const { strError, strWarn } = require('../lib/utils')
const { fetchCalendar, formatCalendar } = require('../lib/serviceAdapters/calendar')
const { PaginatedMessage } = require('@sapphire/discord.js-utilities')

const { EmbedBuilder } = require('discord.js')
const { DATABASE_ACCESS_ERROR } = require('../lib/consts')

class DueCommand extends Command {
  /**
   * @param {import('@sapphire/framework').Command.Context} context
   * @param {import('@sapphire/framework').Command.Options} options
   */
  constructor (context, options) {
    super(context, {
      ...options,
      name: 'due',
      description: 'Check upcoming deadlines that are set on Canvas',
      requiredClientPermissions: ['EMBED_LINKS']
    })
  }

  /** @param {import('@sapphire/framework').ApplicationCommandRegistry} registry */
  registerApplicationCommands (registry) {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description), {
      idHints: ['1063973476488192040'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
  }

  /** @param {import('discord.js').Interaction} interaction */
  async chatInputRun (interaction) {
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

      if (!user?.canvasCalendar) {
        return interaction.reply({
          content: strWarn('It seems that your Canvas calendar url has not been linked yet. The `/due` command needs to access your Canvas calendar to retrieve due dates. You can link your calendar url using the `/link calendar` command'),
          ephemeral: true
        })
      }

      await interaction.deferReply()

      const data = formatCalendar(await fetchCalendar(user.canvasCalendar.url))

      // Sometimes channel is null - attempt to fetch the channel if it's null, otherwise
      // send an unpaginated response.
      if (!interaction.channel) {
        try {
          await this.container.client.channels.fetch(interaction.channelId)
        } catch (error) {
          this.container.logger.error(error)

          // TODO: Proper error handling.
          // If missing access, then tell user that the bot needs to be re-invited

          return (interaction.replied ? interaction.followUp : interaction.reply)({
            content: strWarn('I do not have permission to view this channel. Permission to view this channel is required for pagination, and this command to work.'),
            ephemeral: true
          })
        }
      }

      const paginatedMessage = new PaginatedMessage({
        template: new EmbedBuilder()
          .setColor(0x2694D7)
          .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTitle('Due Dates')
          .setFooter({
            iconURL: this.container.client.user.displayAvatarURL(),
            text: 'Please do not solely rely on this to keep track of due dates.'
          })
      })

      const PLACEHOLDER_TEXT = "__**IMPORTANT:\n\nThe times are off by 13 hours, deadlines are due 13 hours BEFORE or AFTER the time shown.**__\nI'll fix this later\n\n"
      // const PLACEHOLDER_TEXT = ''
      let page = PLACEHOLDER_TEXT

      // Split due dates up into pages
      for (const event of data) {
        const title = event.url ? `[${event.title}](${event.url})` : event.title
        const eventText = `**${title}**\n*${event.course}*\n> due <t:${event.timestamp - 13 * 60 * 60}:R> at <t:${event.timestamp - 13 * 60 * 60}:F>\n\n`

        if (page.length + eventText.length > 1500) {
          paginatedMessage.addPageEmbed((embed) => embed.setDescription(page))
          page = PLACEHOLDER_TEXT
        }

        page += eventText
      }

      // Add a placeholder warning if there are no due dates
      if (!data.length) {
        page = [
          'It appears that there are no upcoming due dates at this time.',
          '',
          'However, we advise you to check your [calender on Canvas](https://canvas.auckland.ac.nz/calendar) to confirm this and to check other platforms for any additional deadlines.'
        ].join('\n')
      }

      paginatedMessage.addPageEmbed((embed) => embed.setDescription(page))

      return await paginatedMessage.run(interaction)
    } catch (error) {
      this.container.logger.error(error)

      return (interaction.replied ? interaction.followUp : interaction.reply)({
        content: strError(DATABASE_ACCESS_ERROR),
        ephemeral: true
      })
    }
  }
}

module.exports = { DueCommand }
