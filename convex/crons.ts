import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Purge expired messages every 5 minutes
crons.interval("purge expired messages", { minutes: 5 }, internal.cleanup.purgeExpiredMessages);

export default crons;
