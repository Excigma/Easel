const { PermissionFlagsBits } = require('discord.js')
const { Time } = require('@sapphire/time-utilities')
const { xxh32 } = require('@node-rs/xxhash')

const { prisma } = require('../lib/prisma')

const { ScheduledTask } = require('@sapphire/plugin-scheduled-tasks')
const { fetchFeed, formatFeed } = require('../lib/serviceAdapters/feed')

const courses = require('../../feeds.json')

class FeedCheckTask extends ScheduledTask {
  /**
   * @param {ScheduledTask.Context} context
   * @param {ScheduledTask.Options} options
   */
  constructor (context, options) {
    super(context, {
      ...options,
      interval: Time.Minute * 5
    })
  }

  async run () {
    this.container.logger.info('FeedCheck: Running')

    for (const [courseId, feeds] of Object.entries(courses)) {
    // TODO: Check if other channels are also subscribed to the same feeds
    // Note: This code is of poor quality and was written a day before semester starts
    // to get the bot borderline functioning enough to be used.

      for (const feed of feeds) {
        const announcements = formatFeed(await fetchFeed(feed.rssUrl))

        for (const announcement of announcements) {
          const hash = xxh32(announcement.content).toString(16)

          for (const channel of feed.channels) {
            // Search Prisma for a broadcast with the same url and channelId
            const previousPosts = await prisma.broadcast.findMany({
              where: {
                url: announcement.link,
                channelId: channel,
                courseId
              }
            })

            // Check if the announcement has already been posted
            if (previousPosts.length && previousPosts.some(post => post.hash === hash)) continue

            try {
              const guildChannel = await this.container.client.channels.fetch(channel)

              if (!guildChannel.permissionsFor(this.container.client.user.id).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                return this.container.logger.info(`FeedCheck: Missing permissions to send messages in channel ${channel.id}`)
              }

              // TODO: Fetch and reply to the last sent announcement if it exists
              const newMessage = await guildChannel.send(this.generateMessage(announcement, previousPosts))
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

  generateMessage (announcement, previousPosts) {
    const embed = {
      title: announcement.title,
      url: announcement.link,
      color: 0x2694D7,
      description: announcement.content
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
      ? '⚠️ A previous announcement was updated'
      : 'A new announcement was posted to Canvas'

    const messageContent = `**${messageContentHeader}** <t:${Date.parse(announcement.updated || announcement.published) / 1000}:R>: ${announcement.title || ''} (<${announcement.link}>)\n*This __won't__ be updated if the announcement is edited; I will try send a new message but this is not guaranteed. Check Canvas for the most up to date content.*`

    return {
      content: messageContent,
      embeds: [embed]
    }
  }

  generateEditMessage (newMessage, previousMessage) {
    let newContent = `🛑 There is a more updated version of this announcement below:\n${newMessage.url}\n\n`

    if (!previousMessage.content.includes('🛑')) {
      newContent += '🛑 The content of this announcement is now __outdated__.\n'
    }

    newContent += previousMessage.content

    return {
      content: newContent,
      embeds: previousMessage.embeds
    }
  }
}

module.exports = { FeedCheckTask }
