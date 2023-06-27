require('@sapphire/plugin-hmr/register')
require('@sapphire/plugin-logger/register')
require('@sapphire/plugin-subcommands/register')
require('@sapphire/plugin-utilities-store/register')
require('@sapphire/plugin-scheduled-tasks/register')

require('dotenv').config()

const { BucketScope, LogLevel, SapphireClient } = require('@sapphire/framework')
const { ActivityType, Partials, GatewayIntentBits } = require('discord.js')
const sapphireOverrides = require('./lib/sapphireOverrides')

const production = process.env.NODE_ENV === 'PRODUCTION'

const client = new SapphireClient({
  caseInsensitiveCommands: true,
  loadMessageCommandListeners: true,
  caseInsensitivePrefixes: true,
  loadDefaultErrorListeners: true,
  defaultCooldown: {
    delay: 1,
    scope: BucketScope.User
  },
  logger: {
    level: production ? LogLevel.Info : LogLevel.Debug
  },
  hmr: {
    enabled: !production
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ],
  partials: [
    Partials.Channel
  ],
  presence: {
    activities: [{
      name: 'Canvas',
      type: ActivityType.Watching
    }]
  },
  allowedMentions: {
    parse: ['users', 'roles']
  },
  tasks: {
    bull: {
      connection: {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST
      }
    }
  }
})

sapphireOverrides()

client.login(process.env.DISCORD_TOKEN)
