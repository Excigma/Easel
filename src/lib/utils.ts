// TODO: Use @sapphire/plugin-utilities-store
import TurndownService, { type Node } from 'turndown'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**'
})
  .addRule('strikethrough', {
    filter: ['del', 's'],
    replacement: (content: string) => `~~${content}~~`
  })
  .addRule('paragraph_spacing', {
    filter: 'p',
    replacement: (content: string) => `${content}\n\n`
  })
  .addRule('table', {
    filter: 'table',
    replacement: () => '\n\n**[There is a table here that cannot be displayed]**\n\n'
  })
  .addRule('a', {
    filter: function (node: Node) {
      return (
        node.nodeName === 'A' &&
        node.getAttribute('href')
      )
    },

    replacement: function (content, node: Node) {
      let href: string = node.getAttribute('href')
      if (href.startsWith('/')) href = `https://${process.env.CANVAS_BASE_URL}${href}`
      return `*[${content}]: (${href})*`
    }
  })

const DISCORD_DESCRIPTION_LIMIT = 4096
const DESCRIPTION_LIMIT = 4000

const TRUNCATION_WARNING = '...'

export function HTMLtoDiscordMarkdown (html: string): string {
  // TODO: Discord isn't able to handle images (need authentication to see img so can't just embed the url)
  // TODO: Discord isn't able to handle URLs to files properly either. Detect and rename or remove
  const markdown = html

    // Some lecturers place a space before the end of the bold but none after (before the next)
    // text, so that gets messed up. We just hardcode a condition for that :^)
    .replaceAll(/ +<\/strong>(\w)/g, '</strong> $1')
    .replaceAll(/ +<\/a>(\w)/g, '</a> $1')

    // Add spacing around URLs so Discord doesn't mess it up
    .replaceAll(/(\w)<a href/g, '$1 <a href')

    // Remove adjacent double ups of tags as Discord's MD parser can't handle them, and they're unnecessary
    .replaceAll('</u><u>', '')
    .replaceAll('</strong><strong>', '')
    .replaceAll('</em><em>', '')

  // I'm lazy ok?
  // Like a true JavaScript programmer, I searched for a library to do it for me
  return turndownService.turndown(markdown)
}

// By JamesNZL. Function to truncate markdown whilst making sure no bold or italics are chopped off
// TODO: Maybe get it to work with ` and other characters, however, it shouldn't be essential
export function truncateMarkdown (
  markdown,
  descriptionLimit = Math.min(DESCRIPTION_LIMIT, DISCORD_DESCRIPTION_LIMIT)
): string {
  const truncateAt = (markdown.length > descriptionLimit)
    ? descriptionLimit - TRUNCATION_WARNING.length
    : descriptionLimit

  // Truncate if the message is long (character limit is 4096 but it's a little spammy)
  if (markdown.length > descriptionLimit) {
    // Make sure we aren't going to slice a group of * in half
    const willSliceAsterisk = (string, index) => string[index - 1] === '*' && string[index] === '*'

    let sliceIndex = truncateAt
    while (willSliceAsterisk(markdown, sliceIndex)) {
      --sliceIndex
    }

    markdown = markdown.slice(0, sliceIndex) + TRUNCATION_WARNING
  }

  // Fix any truncated bold operators **
  const boldOperatorCount = (markdown.match(/\*\*/g) ?? []).length

  // Must be even count of **, or one has been truncated
  // * this isn't very readable, because regex isn't very readable...
  if (boldOperatorCount % 2 !== 0) {
    const trail = markdown.match(new RegExp(`(${escapeRegExp(TRUNCATION_WARNING)})`))?.[1] ?? ''

    markdown = (new RegExp(`\\*\\*.{0,2}${escapeRegExp(trail)}$`).test(markdown))
      /*
      * If the unclosed ** are the very last characters, or the second/third-to-last characters, just delete them
      * Discord doesn't render **** nicely, so this is the most elegant solution
      *
      * eg |    **...$ ->      ...$
      *    |   **?...$ ->      ...$
      *    |  **??...$ ->      ...$
      *    | **???...$ -> **?**...$
      *
      * this is much better than:
      !
      ! eg |    **...$ ->    **...$
      !    |   **?...$ ->   ***...$
      !    |  **??...$ ->  ****...$
      !    | **???...$ -> **?**...$
      !
      * (to clarify symbols: in regex syntax, the last line would be \*\*...\.\.\.$)
      */
      ? markdown.replace(new RegExp(`(\\*\\*.{0,2})${escapeRegExp(trail)}$`), match => {
        return ' '.repeat(match.length) + trail
      })
      : markdown.replace(new RegExp(`.{2}${escapeRegExp(trail)}$`), '**' + trail)
  }

  const asteriskOperatorCount = (markdown.match(/\*/g) ?? []).length

  if (asteriskOperatorCount % 2 !== 0) {
    const trail = markdown.match(new RegExp(`((?:\\*\\*)?${escapeRegExp(TRUNCATION_WARNING)})`))?.[1] ?? ''

    markdown = (new RegExp(`\\*.${escapeRegExp(trail)}$`).test(markdown))
      ? markdown.replace(new RegExp(`(\\*.)${escapeRegExp(trail)}$`), match => {
        return ' '.repeat(match.length) + trail
      })
      : markdown.replace(new RegExp(`.${escapeRegExp(trail)}$`), '*' + trail)
  }

  return markdown
}

function escapeRegExp (string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}
