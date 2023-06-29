import { AllFlowsPrecondition, type PreconditionResult } from '@sapphire/framework'
import type { CommandInteraction, ContextMenuCommandInteraction, Message, Snowflake } from 'discord.js'

export class DeveloperOnlyPrecondition extends AllFlowsPrecondition {
  #message = 'This command can only be used by the owner.'

  public override chatInputRun (interaction: CommandInteraction): PreconditionResult {
    return this.doOwnerCheck(interaction.user.id)
  }

  public override contextMenuRun (interaction: ContextMenuCommandInteraction): PreconditionResult {
    return this.doOwnerCheck(interaction.user.id)
  }

  public override messageRun (message: Message): PreconditionResult {
    return this.doOwnerCheck(message.author.id)
  }

  private doOwnerCheck (userId: Snowflake): PreconditionResult {
    return userId === process.env.OWNER_ID ? this.ok() : this.error({ message: this.#message })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    DeveloperOnly: never
  }
}
