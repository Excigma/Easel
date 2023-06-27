const { RegisterBehavior } = require('@sapphire/framework')
const { Subcommand } = require('@sapphire/plugin-subcommands')
const { prisma } = require('../lib/prisma')
const { DATABASE_STORE_SUCCESSFUL, DATABASE_ACCESS_ERROR } = require('../lib/consts')
const { strWarn, strInfo, strError } = require('../lib/utils')

class UnlinkCommand extends Subcommand {
  /**
   * @param {import('@sapphire/framework').Subcommand.Context} context
   * @param {import('@sapphire/framework').Subcommand.Options} options
   */
  constructor (context, options) {
    super(context, {
      ...options,
      name: 'unlink',
      description: 'Unlink various services the University of Auckland uses to Easel',
      subcommands: [
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

  /** @param {import('@sapphire/framework').ApplicationCommandRegistry} registry */
  registerApplicationCommands (registry) {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(command =>
        command
          .setName('calendar')
          .setDescription('Unlink your Canvas calendar from Easel')
      )
      .addSubcommand(command =>
        command
          .setName('all')
          .setDescription('Unlink all accounts from Easel')
      )
      .addSubcommand(command =>
        command
          .setName('panopto')
          .setDescription('Unlink your Panopto account from Easel')
      ),
    {
      idHints: ['1065170308950147092'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
  }

  /** @param {import('discord.js').Interaction} interaction */
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

  /** @param {import('discord.js').Interaction} interaction */
  async chatInputPanopto (interaction) {
    return await interaction.reply({
      content: strInfo('This subcommand is still under construction 🚧'),
      ephemeral: true
    })
  }

  /** @param {import('discord.js').Interaction} interaction */
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
