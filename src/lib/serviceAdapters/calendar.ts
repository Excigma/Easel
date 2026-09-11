import icalRoot from "node-ical";
import { Time } from "@sapphire/time-utilities";
import { fetchCanvasText, validateCanvasTokenUrl } from "./canvas";

const ical = icalRoot.async;

const COURSE_MATCH = / \[([A-Z0-9 /]+)\]$/;
export const validateCalendarUrl = (url: string): boolean =>
  validateCanvasTokenUrl(url, "/feeds/calendars/user_", ".ics");

export const fetchCalendar = async (url: string): Promise<any> => {
  if (!validateCalendarUrl(url)) {
    throw new Error("Invalid Canvas calendar URL");
  }

  return ical.parseICS(await fetchCanvasText(url));
};

export const formatCalendar = (data: any): any[] => {
  return Object.values(data)
    .filter((value: any) => {
      return (
        value.type === "VEVENT" &&
        value.end &&
        value.end >= Date.now() - Time.Day
      );
    })
    .map((value: any) => {
      const matches = value.summary.match(COURSE_MATCH);
      const pastDue = !(value.end >= Date.now());
      const timestamp = !value?.end?.tz ? value.end - Time.Minute : value.end;

      return {
        timestamp: Math.floor(timestamp / 1000),
        course: `${pastDue ? "~~" : ""}${
          matches ? matches[1] : "Unknown course"
        }${pastDue ? "~~" : ""}`,
        title: `${pastDue ? "~~" : ""}${
          value.summary.replace(COURSE_MATCH, "") ?? "Event has no summary"
        }${pastDue ? "~~" : ""}`,
        content: value.description ?? "Event has no description",
        url: value?.url?.val,
      };
    });
};
