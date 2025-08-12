import { ApplyOptions } from "@sapphire/decorators";
import { Command, RegisterBehavior } from "@sapphire/framework";
import { ApplicationCommandType } from "discord.js";

@ApplyOptions<Command.Options>({
  name: "ping",
  description: "Check Easel's connection to Discord",
})
export class PingCommand extends Command {
  public override registerApplicationCommands(
    registry: Command.Registry,
  ): void {
    // Register Chat Input command
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
    });
  }

  public async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ): Promise<void> {
    const msg = await interaction.reply({ content: "Ping?", fetchReply: true });

    if (msg.createdTimestamp !== null) {
      const diff = msg.createdTimestamp - interaction.createdTimestamp;
      const ping = Math.round(this.container.client.ws.ping);
      await interaction.editReply(
        `Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`,
      );

      return;
    }

    await interaction.editReply("Failed to retrieve ping :(");
  }
}
