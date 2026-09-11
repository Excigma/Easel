import { extractFromXml } from "@extractus/feed-extractor";
import { truncateMarkdown, HTMLtoDiscordMarkdown } from "../utils";
import {
  CanvasRateLimitError,
  fetchCanvasText,
  validateCanvasTokenUrl,
} from "./canvas";

export const validateFeedUrl = (url: string): boolean =>
  validateCanvasTokenUrl(url, "/feeds/announcements/enrollment_", ".atom") ||
  validateCanvasTokenUrl(
    url,
    "/feeds/announcements/group_membership_",
    ".atom",
  );

export const fetchFeed = async (url: string): Promise<any> => {
  if (!validateFeedUrl(url)) {
    throw new Error("Invalid Canvas announcement feed URL");
  }

  try {
    return extractFromXml(await fetchCanvasText(url, false), {
      descriptionMaxLen: 9999,
      normalization: false,
    });
  } catch (error) {
    if (error instanceof CanvasRateLimitError) return null;
    throw error;
  }
};

export const formatFeed = (data: any[]): any[] => {
  if (!data || !data.entry) return [];
  if (!Array.isArray(data.entry)) data.entry = [data.entry];

  // Reverse order of announcements
  // data.entry.reverse();

  // Limit to 5 entries announcements to limit abuse by subscribing to a course with a lot of announcements
  data.entry.length = Math.min(data.entry.length, 5);

  // Reverse order of announcements so oldest is first
  data.entry.reverse();
  return data.entry.map((entry: any) => {
    const content = truncateMarkdown(
      HTMLtoDiscordMarkdown(
        entry.content || "This announcement doesn't have any content",
      ),
    );
    const title = entry.title || "Untitled announcement";

    return { ...entry, content, rawContent: entry.content, title };
  });
};
