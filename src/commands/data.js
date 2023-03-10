const { Command, RegisterBehavior } = require('@sapphire/framework')
const { prisma } = require('../lib/prisma')
const { DATABASE_ACCESS_ERROR } = require('../lib/consts')
const { strError, strSuccess, strInfo } = require('../lib/utils')

class DataCommand extends Command {
  constructor (context, options) {
    super(context, {
      ...options,
      name: 'data',
      description: 'View all the data that Easel has stored about you'
    })
  }

  registerApplicationCommands (registry) {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description), {
      idHints: ['1065079886106087495'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
  }

  async chatInputRun (interaction) {
    try {
      const data = await prisma.user.findUnique({
        where: {
          id: interaction.user.id
        },
        include: {
          canvasCalendar: true,
          canvasFeeds: true,
          panoptoFolders: true
        }
      })

      if (!data) {
        return await interaction.reply({
          content: strInfo('At this time, Easel does not store any data about you.'),
          ephemeral: true
        })
      }

      return await interaction.reply({
        content: strSuccess('Please note that the information contained herein may be sensitive or private, and we advise you to refrain from sharing it publicly.'),
        ephemeral: true,
        files: [{
          attachment: Buffer.from(JSON.stringify(data, null, 2)),
          name: `data_${interaction.user.id}.json`
        }]
      })
    } catch (error) {
      this.container.logger.error(error)

      return (interaction.replied ? interaction.followUp : interaction.reply)({
        content: strError(DATABASE_ACCESS_ERROR),
        ephemeral: true
      })
    }
  }
}

module.exports = { DataCommand }
