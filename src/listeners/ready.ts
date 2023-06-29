import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'

@ApplyOptions<Listener.Options>({ once: true })
export class ReadyEvent extends Listener {
  run (): void {
    console.log(`Ready. Logged in as ${this.container.client.user.tag}`)
  }
}
