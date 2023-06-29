import { Time } from '@sapphire/time-utilities'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { ApplyOptions } from '@sapphire/decorators'

@ApplyOptions<ScheduledTask.Options>({ interval: Time.Day })
export class DanglingCheckTask extends ScheduledTask {
  async run (): Promise<void> {
    // TODO: Remove Broadcast entries from the database from courses that no longer exist
  }
}
