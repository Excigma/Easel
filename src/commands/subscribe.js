const { RegisterBehavior } = require('@sapphire/framework')
const { Subcommand } = require('@sapphire/plugin-subcommands')
const { PermissionFlagsBits } = require('discord.js')
const { prisma } = require('../lib/prisma')
const { DATABASE_ACCESS_ERROR } = require('../lib/consts')
const { strInfo, strError, strSuccess } = require('../lib/utils')

const LINK_SUCCESSFUL = 'Cool. The service has been subscribed to this channel successfully.'

class SubscribeCommand extends Subcommand {
  constructor (context, options) {
    super(context, {
      ...options,
      name: 'subscribe',
      description: "Subscribe this channel to various services that you've previously linked to Easel",
      subcommands: [
        {
          name: 'feed',
          chatInputRun: 'chatInputFeed'
        },
        {
          name: 'calendar',
          chatInputRun: 'chatInputCalendar'
        },
        {
          name: 'panopto',
          chatInputRun: 'chatInputPanopto'
        }
      ],
      requiredUserPermissions: [PermissionFlagsBits.ManageWebhooks]
    })
  }

  registerApplicationCommands (registry) {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(command =>
        command
          .setName('feed')
          .setDescription("Subscribe this channel to a Canvas course's announcement feed")
          .addStringOption(option =>
            option
              .setName('name')
              .setDescription("Name of Canvas course's announcement feed")
              .setRequired(true)
              .setAutocomplete(true)
          )
      ), {
      idHints: ['1064385467325366293'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
    // .addSubcommand(command =>
    //   command
    //     .setName('calendar')
    //     .setDescription('Subscribe this channel to your Canvas calendar')
    // )
    // .addSubcommand(command =>
    //   command
    //     .setName('panopto')
    //     .setDescription('Subscribe this channel to a Panopto folder')
    // )
  }

  async chatInputFeed (interaction) {
    await interaction.deferReply({ ephemeral: true })

    const name = interaction.options.getString('name')

    if (!name) {
      // TODO: Get list of linked feeds and display them
      return await interaction.editReply({
        content: strError('wjat happen lol i die. In the future, this will return a list of linked feeds, however, this command is still under construction 🚧'),
        ephemeral: true
      })
    }

    const feed = await prisma.canvasFeed.findFirst({
      where: {
        userId: interaction.user.id,
        name
      }
    })

    if (!feed) {
      return await interaction.editReply({
        content: strError('The name you provided is not a valid Canvas announcement RSS feed name. Run `/subscribe feed` without a name to get a list of linked Canvas announcement RSS feed urls'),
        ephemeral: true
      })
    }

    try {
      const newChannel = {
        id: interaction.channelId,
        canvasFeeds: {
          connect: {
            url: feed.url
          }
        }
      }

      await prisma.channel.upsert({
        where: {
          id: interaction.channelId
        },
        create: newChannel,
        update: newChannel
      })

      return interaction.editReply({
        content: strSuccess(`${LINK_SUCCESSFUL} You will now receive updates from the \`${name}\` Canvas announcement RSS feed in this channel`),
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

  // TODO: The method of doing this is not great.
  // Need to investigate how Sapphire handles autocomplete with subcommands.
  // This blanket solution works it is currently the only working subcommand.
  async autocompleteRun (interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase?.()
    const feeds = await prisma.canvasFeed.findMany({
      where: {
        userId: interaction.user.id
      }
    })

    if (!feeds) return await interaction.respond([])

    const choices = feeds.map(feed => feed.name)
    const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue))

    return await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice }))
    )
  }

  async chatInputCalendar (interaction) {
    return await interaction.reply({
      content: strInfo('This subcommand is still under construction 🚧'),
      ephemeral: true
    })
  }

  async chatInputPanopto (interaction) {
    return await interaction.reply({
      content: strInfo('This subcommand is still under construction 🚧'),
      ephemeral: true
    })
  }
}

module.exports = { SubscribeCommand }
