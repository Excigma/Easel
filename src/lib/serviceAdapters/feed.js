const { extract } = require('@extractus/feed-extractor')
const { truncateMarkdown, HTMLtoDiscordMarkdown } = require('../utils')

// We're only supporting The University of Auckland's Canvas instance for now
const FEED_REGEX = /^https:\/\/canvas\.auckland\.ac\.nz\/feeds\/announcements\/enrollment_[a-zA-Z0-9]+\.atom$/
const validateFeedUrl = url => FEED_REGEX.test(url)

const fetchFeed = async (url) => {
  if (!validateFeedUrl(url)) {
    throw new Error('Invalid Canvas calendar URL')
  }

  const feed = await extract(url, {
    descriptionMaxLen: 9999,
    normalization: false
  })

  return feed
}

const formatFeed = (data) => {
  if (!Array.isArray(data.entry)) data.entry = [data.entry]

  // Limit to 5 entries announcements to limit abuse by subscribing to a course with a lot of announcements
  data.entry.length = Math.min(data.entry.length, 5)

  return data.entry.map(entry => {
    const content = truncateMarkdown(HTMLtoDiscordMarkdown(entry.content || "This announcement doesn't have any content"))
    const title = entry.title || 'Untitled announcement'

    return { ...entry, content, title }
  })
}

module.exports = {
  validateFeedUrl,
  fetchFeed,
  formatFeed
}
