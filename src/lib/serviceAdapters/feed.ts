import { extract } from '@extractus/feed-extractor'
import { truncateMarkdown, HTMLtoDiscordMarkdown } from '../utils'

const FEED_REGEX = /^https:\/\/canvas\.auckland\.ac\.nz\/feeds\/announcements\/enrollment_[a-zA-Z0-9]+\.atom$/

export const validateFeedUrl = (url: string): boolean => FEED_REGEX.test(url)

export const fetchFeed = async (url: string): Promise<any> => {
  if (!validateFeedUrl(url)) {
    throw new Error('Invalid Canvas calendar URL')
  }

  const feed = await extract(url, {
    descriptionMaxLen: 9999,
    normalization: false
  })

  return feed
}

export const formatFeed = (data: any[]): any[] => {
  if (!Array.isArray(data.entry)) data.entry = [data.entry]

  // Limit to 5 entries announcements to limit abuse by subscribing to a course with a lot of announcements
  data.entry.length = Math.min(data.entry.length, 5)

  return data.entry.map((entry: any) => {
    const content = truncateMarkdown(
      HTMLtoDiscordMarkdown(entry.content || "This announcement doesn't have any content")
    )
    const title = entry.title || 'Untitled announcement'

    return { ...entry, content, rawContent: entry.content, title }
  })
}
