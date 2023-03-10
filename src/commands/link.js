const { Subcommand } = require('@sapphire/plugin-subcommands')
const { prisma } = require('../lib/prisma')
const { strError, strSuccess, strInfo } = require('../lib/utils')
const { validateCalendarUrl } = require('../lib/serviceAdapters/calendar')
const { DATABASE_ACCESS_ERROR } = require('../lib/consts')
const { RegisterBehavior } = require('@sapphire/framework')
const { fetchFeed, validateFeedUrl } = require('../lib/serviceAdapters/feed')

const LINK_SUCCESSFUL = 'Cool. The service has been linked to Easel successfully.'

// TODO: De-duplicate code if possible
class LinkCommand extends Subcommand {
  constructor (context, options) {
    super(context, {
      ...options,
      name: 'link',
      description: 'Link various services the University of Auckland uses to Easel',
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
      ]
    })
  }

  registerApplicationCommands (registry) {
    registry.registerChatInputCommand(builder => builder
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(command =>
        command
          .setName('feed')
          .setDescription("Link a Canvas course's announcement feed to Easel")
          .addStringOption(option =>
            option
              .setName('url')
              .setDescription("Url of Canvas course's announcement feed")
              .setRequired(false)
          )
      )
      .addSubcommand(command =>
        command
          .setName('calendar')
          .setDescription('Link your Canvas calendar to Easel')
          .addStringOption(option =>
            option
              .setName('url')
              .setDescription('Url of Canvas calendar')
              .setRequired(false)
          )
      ), {
      idHints: ['1063973473824804875'],
      behaviorWhenNotIdentical: RegisterBehavior.Overwrite
    })
    // .addSubcommand(command =>
    //   command
    //     .setName('panopto')
    //     .setDescription('Link your Panopto account to Easel')
    // )
  }

  async chatInputFeed (interaction) {
    const url = interaction.options.getString('url')
    let name

    if (!url) {
      return await this.canvasFeedInstructions(interaction)
    }

    if (!validateFeedUrl(url)) {
      return await interaction.reply({
        content: strError('The url you provided is not a valid Canvas announcement RSS feed url. Run `/link feed` without a url to get instructions on how to get your Canvas announcement RSS feed url'),
        ephemeral: true
      })
    }

    await interaction.deferReply({ ephemeral: true })

    if (!name) {
      const feed = await fetchFeed(url)
      name = feed.title ?? feed.id ?? feed.link ?? url
    }

    try {
      await prisma.canvasFeed.upsert({
        where: {
          url
        },
        create: {
          name,
          url,
          User: {
            connectOrCreate: {
              where: {
                id: interaction.user.id
              },
              create: {
                id: interaction.user.id
              }
            }
          }
        },
        update: {
          name,
          url
        }
      })

      return interaction.editReply({
        content: strSuccess(`${LINK_SUCCESSFUL} You can now use the \`/subscribe\` command to subscribe this feed to a Discord channel.`),
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

  async chatInputCalendar (interaction) {
    const url = interaction.options.getString('url')

    if (!url) {
      return await this.canvasCalendarInstructions(interaction)
    }

    if (!validateCalendarUrl(url)) {
      return await interaction.reply({
        content: strError('The url you provided is not a valid Canvas calendar url. Run `/link calendar` without a url to get instructions on how to get your Canvas calendar url'),
        ephemeral: true
      })
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      await prisma.canvasCalendar.upsert({
        where: {
          userId: interaction.user.id
        },
        create: {
          url,
          User: {
            connectOrCreate: {
              where: {
                id: interaction.user.id
              },
              create: {
                id: interaction.user.id
              }
            }
          }
        },
        update: {
          url
        }
      })

      return interaction.editReply({
        content: strSuccess(`${LINK_SUCCESSFUL} You can now use the \`/due\` command to check your upcoming deadlines.`),
        ephemeral: true
      })
    } catch (error) {
      this.container.logger.error(error)

      return (interaction.replied ? interaction.followUp : interaction.reply)({
        content: strError(DATABASE_ACCESS_ERROR),
        ephemeral: true
      })
    }
  }

  async chatInputPanopto (interaction) {
    return await interaction.reply({
      content: strInfo('This subcommand is still under construction 🚧'),
      ephemeral: true
    })
  }

  async canvasFeedInstructions (interaction) {
    const instructions = [
      '**Disclaimer:**',
      "Your Canvas course RSS link is a unique url that allows you to share one of your course's announcements with applications like Easel.",
      'By providing us with your Canvas feed link, you will give us permission to access announcements that you can see on Canvas. This includes announcements sent to you or other groups you belong to on Canvas, eg. Tutorial Groups.',
      '',
      'We cannot make any changes to your Canvas account nor will we share your information with anyone else.',
      "We'll use your RSS link to allow you to receive announcements from your Canvas course in Easel with the `/subscribe` command to help you stay up-to-date with announcements on Canvas.",
      '',
      "Easel may omit announcements if not everyone in the course can see the announcement. Don't solely rely on Easel to keep track of your announcements. It is meant to be a tool to supplement your existing workflow.",
      '',
      "By continuing, you agree that you have read and understood the above disclaimer and are comfortable with sharing your Canvas course RSS link for the aforementioned purposes. You also acknowledge that you shouldn't solely rely on Easel for announcements.",
      '',
      '',
      '**Instructions:**',
      '1. Visit Canvas at: <https://canvas.auckland.ac.nz>',
      "2. Navigate to the `Announcements` tab in the course's canvas page",
      '3. Click the `External Feeds` link in the top right corner',
      '4. Right click on `RSS Feeds` and click `copy link`',
      '5. Run the `/link announcements` command and paste the url in the `url` option'
    ].join('\n')

    return await interaction.reply({
      content: strInfo(instructions),
      ephemeral: true
    })
  }

  async canvasCalendarInstructions (interaction) {
    const instructions = [
      '**Disclaimer:**',
      'Your iCalendar link is a unique url that allows you to share your calendar with applications like Easel.',
      'By providing us with your Canvas calendar link, you will give us permission to access your calendar on Canvas.',
      '',
      'We cannot make any changes to your Canvas account nor will we share your information with anyone else.',
      "We'll use your calendar solely to provide you with a list of upcoming events in Easel with the `/due` command to help you stay organized and up-to-date with deadlines assigned on Canvas.",
      '',
      "Easel may omit events from your calendar if there is no set deadline for the event. Don't solely rely on Easel to keep track of your deadlines. It is meant to be a tool to supplement your existing workflow.",
      '',
      "By continuing, you agree that you have read and understood the above disclaimer and are comfortable with sharing your iCalendar link for the aforementioned purposes. You also acknowledge that you shouldn't solely rely on Easel for deadlines.",
      '',
      '',
      '**Instructions:**',
      '1. Visit your Canvas calendar at: <https://canvas.auckland.ac.nz/calendar>',
      '2. Click the `Calendar feed` button in the bottom right corner',
      '3. Copy the url in the popup prompt',
      '4. Run the `/link calendar` command and paste the url in the `url` option'
    ].join('\n')

    return await interaction.reply({
      content: strInfo(instructions),
      ephemeral: true
    })
  }
}

module.exports = { LinkCommand }
