import { Message, MessagePayload, type MessageEditOptions, type MessageCreateOptions } from 'discord.js'
import { Time } from '@sapphire/time-utilities'
import { xxh32 } from '@node-rs/xxhash'
import { prisma } from '../lib/prisma'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { fetchFeed, formatFeed } from '../lib/serviceAdapters/feed'
import { ApplyOptions } from '@sapphire/decorators'

import courses from '../../feeds'

@ApplyOptions<ScheduledTask.Options>({
  name: 'feed-check',
  interval: Time.Minute * 5
})
export class FeedCheckTask extends ScheduledTask {
  async run(): Promise<void> {
    this.container.logger.info('FeedCheck: Running')

    for (const [courseId, feeds] of Object.entries(courses)) {
      // TODO: Check if other channels are also subscribed to the same feeds
      // Note: This code is of poor quality and was written a day before semester starts
      // to get the bot borderline functioning enough to be used.

      const contributors = feeds.map(feed => feed.contributor);

      for (const feed of feeds) {
        const announcements = formatFeed(await fetchFeed(feed.rssUrl))

        for (const announcement of announcements) {
          const hash = xxh32(announcement.rawContent).toString(16)

          for (const channel of feed.channels) {
            // Search Prisma for a broadcast with the same url and channelId
            const previousPosts = await prisma.broadcast.findMany({
              where: {
                url: announcement.link,
                channelId: channel,
                courseId
              },
              orderBy: {
                createdAt: 'desc'
              }
            })

            // Check if the announcement has already been posted
            if ((previousPosts.length > 0) && previousPosts.some(post => post.hash === hash)) continue

            try {
              const guildChannel = await this.container.client.channels.fetch(channel)

              if (guildChannel == null || !guildChannel.isTextBased()) continue

              let newMessage
              const messageContent = this.generateMessage(announcement, previousPosts, contributors)

              // Try to reply to the previous message if there is a previous message
              let previousMessage, hasPreviousMessage = false;
              if (previousPosts.length > 0) {
                previousMessage = await guildChannel.messages.fetch(previousPosts[0].messageId).catch(_ => { return null; })

                hasPreviousMessage = (previousMessage !== null);
              }

              if (hasPreviousMessage) {
                newMessage = await previousMessage!.reply(messageContent);
              } else {
                newMessage = await guildChannel.send(messageContent);
              }

              await prisma.broadcast.create({
                data: {
                  url: announcement.link,
                  channelId: channel,
                  messageId: newMessage.id,
                  courseId,
                  hash
                }
              })

              for (const post of previousPosts) {
                const previousMessage = await guildChannel.messages.fetch(post.messageId)
                await previousMessage.edit(this.generateEditMessage(newMessage, previousMessage))
              }
            } catch (error) {
              this.container.logger.error(`FeedCheck: Error while sending message to channel ${channel}`)
              this.container.logger.error(error)
            }
          }
        }
      }
    }
  }

  generateMessage(announcement, previousPosts, contributors): MessagePayload | MessageCreateOptions {
    const embed = {
      title: announcement.title,
      url: announcement.link,
      color: 0x2694D7,
      description: announcement.content,
      footer: {
        text: `Contributed via ${contributors.join(", ")}'s Canvas`
      },
    }

    // Check if there is an author name or profile picture, if there is then add it to the embed
    if (announcement?.author?.name) {
      embed.author = { name: announcement.author.name }
    }

    // created_at is the time when the announcement was written, but not posted yet
    // posted_at is the scheduled time that the announcement should be posted
    if (announcement.updated || announcement.published) {
      embed.timestamp = announcement.updated || announcement.published
    }

    const messageContentHeader = previousPosts.length
      ? '⚠️ A previous announcement was edited'
      : 'A new announcement was posted to Canvas'

    const messageContent = `**${messageContentHeader}** <t:${Date.parse(announcement.updated || announcement.published) / 1000}:R>: [${announcement.title || ''}](${announcement.link})`

    return {
      content: messageContent,
      embeds: [embed]
    }
  }

  generateEditMessage(newMessage: Message, previousMessage: Message): MessagePayload | MessageEditOptions {
    let newContent = `🛑 This announcement has been edited. See latest version at: ${newMessage.url}\n\n`

    if (!previousMessage.content.includes('🛑')) {
      newContent += '🛑 The contents of this message are now __outdated__.\n'
    }

    newContent += previousMessage.content

    return {
      content: newContent,
      embeds: previousMessage.embeds
    }
  }
}

