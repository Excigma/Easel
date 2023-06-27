const { PermissionFlagsBits } = require('discord.js')
const { Time } = require('@sapphire/time-utilities')

const { prisma } = require('../lib/prisma')

const { ScheduledTask } = require('@sapphire/plugin-scheduled-tasks')
const { fetchFeed, formatFeed } = require('../lib/serviceAdapters/feed')

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

  /**
   * This task splits the job into smaller chunks chunks to be done within the interval.
   */
  async run () {
    this.container.logger.info('FeedCheck: Running')

    // Fetch the channel that was checked the longest time ago
    // const channel = (await prisma.channel.findMany({
    //   orderBy: {
    //     lastChecked: { sort: 'asc', nulls: 'first' }
    //   },
    //   include: {
    //     canvasFeeds: {
    //       include: {
    //         broadcasts: true
    //       }
    //     }
    //   },
    //   take: 1
    // }))?.[0]
    const channel = null

    if (!channel) {
      return this.container.logger.info('FeedCheck: No channels found')
    }

    // We are checking for stuff on this channel
    await prisma.channel.update({
      where: {
        id: channel.id
      },
      data: {
        lastChecked: new Date()
      }
    })

    this.container.logger.info(channel.id)

    // TODO: Check if other channels are also subscribed to the same feeds
    // Note: This code is of poor quality and was written a day before semester starts
    // to get the bot borderline functioning enough to be used.
    for (const canvasFeed of channel.canvasFeeds) {
      const announcements = formatFeed(await fetchFeed(canvasFeed.url))

      for (const announcement of announcements) {
        const previousPost = canvasFeed.broadcasts.find(broadcast => (broadcast.url === announcement.link) && (broadcast.channelId === channel.id))

        // Check if the announcement has already been posted
        if (previousPost && previousPost.lastUpdate === (announcement.updated || announcement.published).toString()) continue

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

        try {
          const guildChannel = await this.container.client.channels.fetch(channel.id)

          if (!guildChannel.permissionsFor(this.container.client.user.id).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return this.container.logger.info(`FeedCheck: Missing permissions to send messages in channel ${channel.id}`)
          }

          const message = await guildChannel.send({
            content: messageContent,
            embeds: [embed]
          })

          await prisma.broadcast.upsert({
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
              lastUpdate: (announcement.updated ?? announcement.published).toString(),
              CanvasFeed: {
                connect: {
                  url: canvasFeed.url
                }
              }
            },
            update: {
              lastUpdate: (announcement.updated ?? announcement.published).toString()
            }
          })
        } catch (error) {
          this.container.logger.error(`FeedCheck: Error while sending message to channel ${channel.id}`)
          this.container.logger.error(error)
        }
      }
    }

    // TODO: Update the channel's updatedAt field
  }
}

module.exports = { FeedCheckTask }
