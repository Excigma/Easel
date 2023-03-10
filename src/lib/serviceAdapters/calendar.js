const ical = require('node-ical')

// We're only supporting The University of Auckland's Canvas instance for now
const CALENDAR_REGEX = /^https:\/\/canvas\.auckland\.ac\.nz\/feeds\/calendars\/user_[a-zA-Z0-9]+\.ics$/
const validateCalendarUrl = url => CALENDAR_REGEX.test(url)

const fetchCalendar = async (url) => {
  if (!validateCalendarUrl(url)) {
    throw new Error('Invalid Canvas calendar URL')
  }

  const events = await ical.async.fromURL(url)
  return events
}

const COURSE_MATCH = / \[([A-Z0-9 /]+)\]$/
const DAY_MS = 1000 * 60 * 60 * 24
const formatCalendar = (data) => {
  return Object.values(data)
    .filter(value => {
      return value.type === 'VEVENT' &&
        value.end &&
        value.end >= (Date.now() - DAY_MS)
    })
    .map(value => {
      const matches = value.summary.match(COURSE_MATCH)
      const due = !(value.end >= Date.now())

      return {
        timestamp: Math.floor(value.end / 1000),
        course: `${due ? '~~' : ''}${matches ? matches[1] : 'Unknown course'}${due ? '~~' : ''}`,
        title: `${due ? '~~' : ''}${value.summary.replace(COURSE_MATCH, '') ?? 'Event has no summary'}${due ? '~~' : ''}`,
        content: value.description ?? 'Event has no description',
        url: value.url
      }
    })
}

module.exports = {
  validateCalendarUrl,
  fetchCalendar,
  formatCalendar
}
