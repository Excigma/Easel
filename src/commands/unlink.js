const { RegisterBehavior } = require('@sapphire/framework')
const { Subcommand } = require('@sapphire/plugin-subcommands')
const { prisma } = require('../lib/prisma')
const { DATABASE_STORE_SUCCESSFUL, DATABASE_ACCESS_ERROR } = require('../lib/consts')
const { strWarn, strInfo, strError } = require('../lib/utils')

class UnlinkCommand extends Subcommand {
  constructor (context, options) {
    super(context, {
      ...options,
      name: 'unlink',
      description: 'Unlink various services the University of Auckland uses to Easel',
      subcommands: [
        {
          name: 'announcements',
          chatInputRun: 'chatInputAnnouncements'
        },
        {
          name: 'calendar',
          chatInputRun: 'chatInputCalendar'
        },
        {
          name: 'panopto',
          chatInputRun: 'chatInputPanopto'
        },
        {
          name: 'all',
          chatInputRun: 'chatInputAll'
        }
      ]
    })
  }

  registerApplicationCommands (registry) {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(command =>
        command
          .setName('announcements')
          .setDescription("Unlink a Canvas course's announcement feeds from Easel")
          .addStringOption(option =>
            option
              .setName('name')
              .setDescription("Name of Canvas course's announcement feed")
              .setRequired(true)
          )
      )
      .addSubcommand(command =>
        command
          .setName('calendar')
          .setDescription('Unlink your Canvas calendar from Easel')
      )
      .addSubcommand(command =>
        command
          .setName('all')
          .setDescription('Unlink all accounts from Easel')
      ), {
      idHints: ['1065170308950147092'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
    // .addSubcommand(command =>
    //   command
    //     .setName('panopto')
    //     .setDescription('Unlink your Panopto account from Easel')
    // )
  }

  async chatInputAnnouncements (interaction) {
    return await interaction.reply({
      content: strInfo('This command is still under construction 🚧'),
      ephemeral: true
    })
  }

  async chatInputCalendar (interaction) {
    await interaction.deferReply({ ephemeral: true })

    const user = await prisma.user.findUnique({
      where: {
        id: interaction.user.id
      },
      include: {
        canvasCalendar: true
      }
    })

    if (!user || !user.canvasCalendar) {
      return await interaction.reply({
        content: strWarn("You haven't linked your Canvas calendar to Easel yet"),
        ephemeral: true
      })
    }

    // Delete the user's Canvas calendar
    await prisma.canvasCalendar.delete({
      where: {
        userId: interaction.user.id
      }
    })

    await interaction.reply({
      content: DATABASE_STORE_SUCCESSFUL,
      ephemeral: true
    })
  }

  async chatInputPanopto (interaction) {
    return await interaction.reply({
      content: strInfo('This subcommand is still under construction 🚧'),
      ephemeral: true
    })
  }

  async chatInputAll (interaction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const user = await prisma.user.findUnique({
        where: {
          id: interaction.user.id
        }
      })

      if (!user) {
        return await interaction.editReply({
          content: strWarn('At this time, Easel does not store any data about you.'),
          ephemeral: true
        })
      }

      await prisma.user.update({
        where: {
          id: interaction.user.id
        },
        data: {
          canvasCalendar: {
            delete: true
          },
          panoptoFolders: {
            deleteMany: {}
          },
          canvasFeeds: {
            deleteMany: {}
          }
        }
      })

      await prisma.user.delete({
        where: {
          id: interaction.user.id
        }
      })

      return await interaction.editReply({
        content: strInfo(DATABASE_STORE_SUCCESSFUL),
        ephemeral: true
      })
    } catch (error) {
      this.container.logger.error(error)

      return (interaction.replied ? interaction.followUp : interaction.editReply)({
        content: strError(DATABASE_ACCESS_ERROR),
        ephemeral: true
      })
    }
  }
}

module.exports = { UnlinkCommand }
