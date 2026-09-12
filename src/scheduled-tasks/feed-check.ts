import {
  Message,
  APIEmbed,
  type MessageEditOptions,
  type MessageCreateOptions,
} from "discord.js";
import { parse } from "smol-toml";
import { Time } from "@sapphire/time-utilities";
import { xxh32 } from "@node-rs/xxhash";
import { prisma } from "../lib/prisma";
import { ScheduledTask } from "@sapphire/plugin-scheduled-tasks";
import {
  type Announcement,
  fetchFeed,
  formatFeed,
} from "../lib/serviceAdapters/feed";
import { ApplyOptions } from "@sapphire/decorators";
import { readFile } from "fs/promises";

interface ConfigCourses {
  contributors: string[];
  channels: string[];
  rssUrls: string[];
  courseCode?: string;
}

const DISCORD_MESSAGE_LIMIT = 2_000;
const DIFF_FILENAME = "announcement.patch";
const EDIT_PREFIX =
  "🛑 This announcement has been edited. See latest version at: ";
const OUTDATED_NOTICE =
  "🛑 The contents of this message are now __outdated__.\n";

const checkInterval = process.env.ANNOUNCEMENT_CHECK_INTERVAL
  ? parseInt(process.env.ANNOUNCEMENT_CHECK_INTERVAL)
  : Time.Minute * 15;

@ApplyOptions<ScheduledTask.Options>({
  name: "feed-check",
  interval: checkInterval,
})
export class FeedCheckTask extends ScheduledTask {
  private courses: ConfigCourses[] = [];

  async run(): Promise<void> {
    this.container.logger.info("FeedCheck: Running");
    await this.refreshFeeds();

    for (const course of this.courses) {
      // TODO: Check if other channels are also subscribed to the same feeds
      // Note: This code is of poor quality and was written a day before semester starts
      // to get the bot borderline functioning enough to be used.

      const aggregatedAnnouncements: Announcement[] = [];

      // Combine feeds from all users
      for (const rssUrl of course.rssUrls) {
        aggregatedAnnouncements.push(...formatFeed(await fetchFeed(rssUrl)));
      }

      for (const announcement of aggregatedAnnouncements) {
        const hash = xxh32(announcement.rawContent).toString(16);

        for (const channel of course.channels) {
          // Search Prisma for a broadcast with the same url and channelId
          const previousPosts = await prisma.broadcast.findMany({
            where: {
              url: announcement.link,
              channelId: channel,
            },
            orderBy: {
              createdAt: "desc",
            },
          });

          // Only compare with the latest post. An announcement can be edited back
          // to content that appeared in an older revision.
          if (previousPosts[0]?.hash === hash) continue;

          try {
            const guildChannel =
              await this.container.client.channels.fetch(channel);

            if (guildChannel == null || !guildChannel.isTextBased()) continue;

            let previousMessage: Message | null = null;
            if (previousPosts.length > 0) {
              previousMessage = await guildChannel.messages
                .fetch(previousPosts[0].messageId)
                .catch(() => null);
            }

            const messageContent = generateAnnouncementMessage(
              announcement,
              previousPosts.length > 0,
              previousMessage,
              course.contributors,
              course.courseCode,
            );
            const newMessage = previousMessage
              ? await previousMessage.reply(messageContent)
              : await guildChannel.send(messageContent);

            await prisma.broadcast.create({
              data: {
                url: announcement.link,
                channelId: channel,
                messageId: newMessage.id,
                hash,
              },
            });

            for (const post of previousPosts) {
              try {
                const oldMessage = await guildChannel.messages.fetch(
                  post.messageId,
                );
                await oldMessage.edit(
                  generateOutdatedMessage(newMessage, oldMessage),
                );
              } catch (error) {
                this.container.logger.warn(
                  `FeedCheck: Failed to mark previous announcement ${post.messageId} as outdated`,
                );
                this.container.logger.warn(error);
              }
            }
          } catch (error) {
            this.container.logger.error(
              `FeedCheck: Error while sending message to channel ${channel}`,
            );
            this.container.logger.error(error);
          }
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(checkInterval / this.courses.length)),
      );
    }
  }

  async refreshFeeds(): Promise<void> {
    const file = await readFile("./config/config.toml", "utf-8");
    this.courses = parse(file).feeds as unknown as ConfigCourses[];
  }
}

function generateAnnouncementMessage(
  announcement: Announcement,
  edited: boolean,
  previousMessage: Message | null,
  contributors: string[],
  courseCode?: string,
): MessageCreateOptions {
  const displayCourseCode = courseCode?.trim();
  const timestampValue = announcement.updated ?? announcement.published;
  const timestamp = timestampValue ? Date.parse(timestampValue) : NaN;
  const timestampSeconds = Number.isFinite(timestamp)
    ? Math.floor(timestamp / 1_000)
    : 0;
  const header = edited
    ? "⚠️ A previous announcement was edited"
    : "A new announcement was posted to Canvas";
  const fullHeader = `**${header}** <t:${timestampSeconds}:R>: [${announcement.title}](${announcement.link})`;
  const diff = edited
    ? announcementDiff(previousMessage?.embeds[0]?.description, announcement.content)
    : undefined;
  const { suffix, patch } = renderAnnouncementDiff(
    fullHeader,
    diff,
    DISCORD_MESSAGE_LIMIT,
  );
  const content = boundedMessageContent(
    announcement,
    header,
    timestampSeconds,
    fullHeader,
    suffix,
  );

  const embed: APIEmbed = {
    title: displayCourseCode ?? "Announcement",
    url: announcement.link,
    color: displayCourseCode
      ? courseEmbedColor(announcement.link)
      : 0x2694d7,
    description: announcement.content,
    footer: {
      text: `Contributed via ${contributors.join(", ")}'s Canvas`,
    },
  };

  if (announcement.author?.name) {
    embed.author = { name: truncateCharacters(announcement.author.name, 256) };
  }
  if (timestampValue) embed.timestamp = timestampValue;

  return {
    content,
    embeds: [embed],
    allowedMentions: { parse: [] },
    files: patch
      ? [{ attachment: Buffer.from(patch, "utf8"), name: DIFF_FILENAME }]
      : undefined,
  };
}

function generateOutdatedMessage(
  newMessage: Message,
  previousMessage: Message,
): MessageEditOptions {
  const prefix = `${EDIT_PREFIX}${newMessage.url}\n\n`;
  const originalContent = stripEditNotices(previousMessage.content);
  const available =
    DISCORD_MESSAGE_LIMIT -
    characterCount(prefix) -
    characterCount(OUTDATED_NOTICE);

  return {
    content: `${prefix}${OUTDATED_NOTICE}${truncateCharacters(
      originalContent,
      Math.max(0, available),
    )}`,
    embeds: previousMessage.embeds,
    allowedMentions: { parse: [] },
  };
}

type AnnouncementDiff =
  | { kind: "inline"; line: string; patch: string }
  | { kind: "attachment"; patch: string }
  | { kind: "empty" }
  | { kind: "unavailable" };

function announcementDiff(
  previous: string | null | undefined,
  current: string,
): AnnouncementDiff {
  if (previous === undefined || previous === null) {
    return { kind: "unavailable" };
  }
  if (previous === current) return { kind: "empty" };

  const previousLines = previous.split(/\r?\n/);
  const currentLines = current.split(/\r?\n/);
  let prefix = 0;
  while (
    prefix < previousLines.length &&
    prefix < currentLines.length &&
    previousLines[prefix] === currentLines[prefix]
  ) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < previousLines.length - prefix &&
    suffix < currentLines.length - prefix &&
    previousLines[previousLines.length - 1 - suffix] ===
      currentLines[currentLines.length - 1 - suffix]
  ) {
    suffix++;
  }

  const removed = previousLines.slice(prefix, previousLines.length - suffix);
  const added = currentLines.slice(prefix, currentLines.length - suffix);
  const changedLines = [
    ...removed.map((line) => `-${line}`),
    ...added.map((line) => `+${line}`),
  ];
  const patch = createAnnouncementPatch(
    previousLines,
    currentLines,
    prefix,
    suffix,
    removed,
    added,
  );

  return changedLines.length === 1
    ? { kind: "inline", line: changedLines[0], patch }
    : { kind: "attachment", patch };
}

function createAnnouncementPatch(
  previousLines: string[],
  currentLines: string[],
  prefix: number,
  suffix: number,
  removed: string[],
  added: string[],
): string {
  const contextBefore = previousLines.slice(Math.max(0, prefix - 3), prefix);
  const contextAfter = previousLines.slice(
    previousLines.length - suffix,
    Math.min(previousLines.length, previousLines.length - suffix + 3),
  );
  const oldStart = Math.max(0, prefix - contextBefore.length) + 1;
  const newStart = oldStart;
  const oldCount = contextBefore.length + removed.length + contextAfter.length;
  const newCount = contextBefore.length + added.length + contextAfter.length;

  return [
    "--- previous-announcement.md",
    "+++ current-announcement.md",
    `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
    ...contextBefore.map((line) => ` ${line}`),
    ...removed.map((line) => `-${line}`),
    ...added.map((line) => `+${line}`),
    ...contextAfter.map((line) => ` ${line}`),
    "",
  ].join("\n");
}

function renderAnnouncementDiff(
  fullHeader: string,
  diff: AnnouncementDiff | undefined,
  messageLimit: number,
): { suffix: string; patch?: string } {
  if (!diff) return { suffix: "" };

  switch (diff.kind) {
    case "inline": {
      const suffix = `\n\n**Changes:**\n\`\`\`diff\n${diff.line}\n\`\`\``;
      if (
        !diff.line.includes("```") &&
        characterCount(fullHeader) + characterCount(suffix) <= messageLimit
      ) {
        return { suffix };
      }
      return {
        suffix: `\n\n**Changes:** attached as \`${DIFF_FILENAME}\`.`,
        patch: diff.patch,
      };
    }
    case "attachment":
      return {
        suffix: `\n\n**Changes:** attached as \`${DIFF_FILENAME}\`.`,
        patch: diff.patch,
      };
    case "empty":
      return {
        suffix:
          "\n\n⚠️ Easel detected an edit, but no change is visible in the previous Discord post. The change may be beyond the displayed announcement's truncation limit or removed during HTML conversion.",
      };
    case "unavailable":
      return {
        suffix:
          "\n\n⚠️ Easel couldn't fetch the immediately previous announcement content, so no diff is available.",
      };
  }
}

function boundedMessageContent(
  announcement: Announcement,
  header: string,
  timestamp: number,
  fullHeader: string,
  suffix: string,
): string {
  const availableForHeader = DISCORD_MESSAGE_LIMIT - characterCount(suffix);
  if (characterCount(fullHeader) <= availableForHeader) {
    return `${fullHeader}${suffix}`;
  }

  const prefix = `**${header}** <t:${timestamp}:R>: `;
  const title = truncateCharacters(
    announcement.title,
    Math.max(0, availableForHeader - characterCount(prefix)),
  );
  return `${prefix}${title}${suffix}`;
}

function stripEditNotices(content: string): string {
  while (content.startsWith(EDIT_PREFIX)) {
    const end = content.indexOf("\n\n");
    if (end === -1) break;
    content = content.slice(end + 2);
  }

  return content.startsWith(OUTDATED_NOTICE)
    ? content.slice(OUTDATED_NOTICE.length)
    : content;
}

function truncateCharacters(value: string, limit: number): string {
  const characters = [...value];
  if (characters.length <= limit) return value;
  if (limit === 0) return "";
  return `${characters.slice(0, limit - 1).join("")}…`;
}

function characterCount(value: string): number {
  return [...value].length;
}

function courseEmbedColor(link: string): number {
  let seed = link;

  try {
    const url = new URL(link);
    const coursePath = url.pathname.match(/^\/courses\/[^/]+/)?.[0];

    if (coursePath) {
      seed = `${url.origin}${coursePath}`;
    }
  } catch {
    // Fall back to the original link if it is not a valid URL.
  }

  const hash = Number(xxh32(seed));
  const red = 96 + (hash & 0x7f);
  const green = 96 + ((hash >>> 8) & 0x7f);
  const blue = 96 + ((hash >>> 16) & 0x7f);

  return (red << 16) | (green << 8) | blue;
}
