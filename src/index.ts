import 'dotenv/config'
import '@sapphire/plugin-hmr/register'
import '@sapphire/plugin-logger/register'
import '@sapphire/plugin-subcommands/register'
import '@sapphire/plugin-utilities-store/register'
import '@sapphire/plugin-scheduled-tasks/register'

import { BucketScope, LogLevel, SapphireClient } from '@sapphire/framework'
import { ActivityType, Partials, GatewayIntentBits } from 'discord.js'
import { sapphireOverrides } from './lib/sapphireOverrides'

const production = process.env.NODE_ENV === 'production'

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
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        password: process.env.REDIS_PASSWORD
      }
    }
  }
})

sapphireOverrides()

client.login(process.env.DISCORD_TOKEN)
  .catch(error => {
    client.logger.fatal(error)
    process.exit(1)
  })
