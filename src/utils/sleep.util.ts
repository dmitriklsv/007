import type { Duration } from "luxon";

export const sleep = (duration: Duration) =>
  new Promise(res => setTimeout(res, duration.toMillis()));
