const { PermissionFlagsBits } = require('discord.js')
const { Time } = require('@sapphire/time-utilities')

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
          // Search Prisma for a broadcast with the same url and channelId
          const previousPosts = await prisma.broadcast.findMany({
            where: {
              url: announcement.link,
              courseId
            }
          })

          for (const channel of feed.channels) {
            const previousPost = previousPosts.find(broadcast => (broadcast.url === announcement.link) && (broadcast.channelId === channel))

            // Check if the announcement has already been posted
            if (previousPost && previousPost.lastUpdate === (announcement.updated || announcement.published).toString()) continue

            try {
              const guildChannel = await this.container.client.channels.fetch(channel)

              if (!guildChannel.permissionsFor(this.container.client.user.id).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                return this.container.logger.info(`FeedCheck: Missing permissions to send messages in channel ${channel.id}`)
              }

              // TODO: Fetch and reply to the last sent announcement if it exists
              const message = await guildChannel.send(this.generateMessage(announcement, previousPost))
              await prisma.broadcast.upsert(this.generateUpset(courseId, message, announcement, channel))
            } catch (error) {
              this.container.logger.error(`FeedCheck: Error while sending message to channel ${channel.id}`)
              this.container.logger.error(error)
            }
          }
        }
      }
    }
  }

  generateMessage (announcement, previousPost) {
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

    const messageContentHeader =
      previousPost
        ? '⚠️ A previous announcement was updated'
        : 'A new announcement was posted to Canvas'

    const messageContent = `**${messageContentHeader}** <t:${Date.parse(announcement.updated || announcement.published) / 1000}:R>: ${announcement.title || ''} (<${announcement.link}>)\n*This __won't__ be updated if the announcement is edited; I will try send a new message but this is not guaranteed. Check Canvas for the most up to date content.*`

    return {
      content: messageContent,
      embeds: [embed]
    }
  }

  generateUpset (courseId, message, announcement, channel) {
    return {
      where: {
        channelId_messageId: {
          channelId: channel.id,
          messageId: message.id
        }
      },
      create: {
        url: announcement.link,
        channelId: channel.id,
        messageId: message.id,
        courseId,
        lastUpdate: (announcement.updated ?? announcement.published).toString()
      },
      update: {
        lastUpdate: (announcement.updated ?? announcement.published).toString()
      }
    }
  }
}

module.exports = { FeedCheckTask }
