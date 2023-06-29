import { RegisterBehavior, Command } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { prisma } from '../lib/prisma'
import { DATABASE_ACCESS_ERROR, DATABASE_STORE_SUCCESSFUL, strError, strWarn, strInfo } from '../lib/constants'

@ApplyOptions<Subcommand.Options>({
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
class UnlinkCommand extends Subcommand {
  registerApplicationCommands (registry: Command.Registry): void {
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

  async chatInputCalendar (interaction: Command.ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true })

    const user = await prisma.user.findUnique({
      where: {
        id: interaction.user.id
      },
      include: {
        canvasCalendar: true
      }
    })

    if ((user == null) || (user.canvasCalendar == null)) {
      await interaction.reply({
        content: strWarn("You haven't linked your Canvas calendar to Easel yet"),
        ephemeral: true
      })

      return
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

  async chatInputPanopto (interaction: Command.ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      content: strInfo('This subcommand is still under construction 🚧'),
      ephemeral: true
    })
  }

  async chatInputAll (interaction: Command.ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true })

    try {
      const user = await prisma.user.findUnique({
        where: {
          id: interaction.user.id
        }
      })

      if (user == null) {
        await interaction.editReply({
          content: strWarn('At this time, Easel does not store any data about you.')
        })

        return
      }

      await prisma.user.update({
        where: {
          id: interaction.user.id
        },
        data: {
          canvasCalendar: {
            delete: true
          }
        }
      })

      await prisma.user.delete({
        where: {
          id: interaction.user.id
        }
      })

      await interaction.editReply({
        content: strInfo(DATABASE_STORE_SUCCESSFUL)
      })
    } catch (error) {
      this.container.logger.error(error)

      await (interaction.replied ? interaction.followUp : interaction.editReply)({
        content: strError(DATABASE_ACCESS_ERROR),
        ephemeral: true
      })
    }
  }
}

export { UnlinkCommand }
