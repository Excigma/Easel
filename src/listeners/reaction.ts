import { Events, Listener, ListenerOptions } from "@sapphire/framework";
import { MessageReaction, User } from "discord.js";

export class ReactionListener extends Listener {
  constructor(context: Listener.LoaderContext, options: ListenerOptions) {
    super(context, {
      ...options,
      event: Events.MessageReactionAdd,
    });
  }

  async run(reaction: MessageReaction, user: User) {
    // When a reaction is received, check if the structure is partial
    if (reaction.partial) {
      // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
      try {
        await reaction.fetch();
      } catch (error) {
        // Return as `reaction.message.author` may be undefined/null
        return;
      }
    }

    if (user.id !== process.env.OWNER_ID) return;
    if (reaction.emoji.name !== "🗑️") return;
    if (reaction.message.author?.id !== this.container.client.user?.id) return;

    reaction.message.delete();
  }
}
