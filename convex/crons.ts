import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Purge expired messages every minute
crons.interval("purge expired messages", { minutes: 1 }, internal.cleanup.purgeExpiredMessages);

export default crons;
