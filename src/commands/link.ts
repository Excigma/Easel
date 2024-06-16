import { Subcommand } from '@sapphire/plugin-subcommands'
import { prisma } from '../lib/prisma'
import { validateCalendarUrl } from '../lib/serviceAdapters/calendar'
import { DATABASE_ACCESS_ERROR, strError, strSuccess, strInfo } from '../lib/constants'
import { ApplyOptions } from '@sapphire/decorators'

const LINK_SUCCESSFUL = 'Cool. The service has been linked to Easel successfully.'

// TODO: De-duplicate code if possible
@ApplyOptions<Subcommand.Options>({
  name: 'link',
  description: 'Link various services the University of Auckland uses to Easel',
  subcommands: [
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
export class LinkCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry): void {
    registry.registerChatInputCommand((builder) => builder
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(command =>
        command
          .setName('calendar')
          .setDescription('Link your Canvas calendar to Easel')
          .addStringOption(option =>
            option
              .setName('url')
              .setDescription('URL of Canvas calendar')
              .setRequired(false)
          )
      )
      .addSubcommand(command =>
        command
          .setName('panopto')
          .setDescription('Link your Panopto account to Easel')
      ))
  }

  public async chatInputCalendar(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
    const url = interaction.options.getString('url')

    if (url === null) {
      await this.canvasCalendarInstructions(interaction)
      return
    }

    if (!validateCalendarUrl(url)) {
      await interaction.reply({
        content: strError('The URL you provided is not a valid Canvas calendar URL. Run `/link calendar` without a URL to get instructions on how to get your Canvas calendar URL'),
        ephemeral: true
      })

      return
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

      await interaction.editReply({
        content: strSuccess(`${LINK_SUCCESSFUL} You can now use the \`/due\` command to check your upcoming deadlines.`)
      })
    } catch (error) {
      this.container.logger.error(error)

      await (interaction.replied ? interaction.followUp : interaction.reply)({
        content: strError(DATABASE_ACCESS_ERROR),
        ephemeral: true
      })
    }
  }

  public async chatInputPanopto(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      content: strInfo('This subcommand is still under construction 🚧'),
      ephemeral: true
    })
  }

  public async canvasCalendarInstructions(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
    const instructions = [
      '**Disclaimer:**',
      'Your iCalendar link is a unique URL that allows you to share your calendar with applications like Easel.',
      'By providing us with your Canvas calendar link, you will give us permission to access your calendar on Canvas.',
      '',
      'We cannot make any changes to your Canvas account nor will we share your information with anyone else.',
      "We'll use your calendar solely to provide you with a list of upcoming events in Easel with the `/due` command to help you stay organised and up-to-date with deadlines assigned on Canvas.",
      '',
      "Easel may omit events from your calendar if there is no set deadline for the event. Don't solely rely on Easel to keep track of your deadlines. It is meant to be a tool to supplement your existing workflow.",
      '',
      "By continuing, you agree that you have read and understood the above disclaimer and are comfortable with sharing your iCalendar link for the aforementioned purposes. You also acknowledge that you shouldn't solely rely on Easel for deadlines.",
      '',
      '',
      '**Instructions:**',
      '1. Visit your Canvas calendar at: <https://canvas.auckland.ac.nz/calendar>',
      '2. Click the `Calendar feed` button in the bottom right corner',
      '3. Copy the URL in the popup prompt',
      '4. Run the `/link calendar` command and paste the URL in the `url` option'
    ].join('\n')

    await interaction.reply({
      content: strInfo(instructions),
      ephemeral: true
    })
  }
}
