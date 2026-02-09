import * as agentsFunctions from "../../backend/supabase/functions/agents";
import * as tasksFunctions from "../../backend/supabase/functions/tasks";
import * as activitiesFunctions from "../../backend/supabase/functions/activities";
import * as cron from "node-cron";


async function generateStandup(): Promise<string> {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).getTime();

  // Get all agents
  const agents = await agentsFunctions.getAllAgents();

  // Get all tasks
  const allTasks = await tasksFunctions.getAllTasks();

  // Get today's activities
  const activities = await activitiesFunctions.getActivityFeed(100);
  const todayActivities = activities.filter(
    (a) => a.createdAt >= startOfDay && a.createdAt <= endOfDay
  );

  // Categorize tasks
  const completedToday: Record<string, string[]> = {};
  const inProgress: Record<string, string[]> = {};
  const blocked: Record<string, string[]> = {};
  const needsReview: string[] = [];

  for (const task of allTasks) {
    const assignees = task.assigneeIds.map((id) => {
      const agent = agents.find((a) => a.id === id);
      return agent?.name || "Unknown";
    });

    if (task.status === "done" && task.updatedAt >= startOfDay) {
      assignees.forEach((name) => {
        if (!completedToday[name]) completedToday[name] = [];
        completedToday[name].push(task.title);
      });
    } else if (task.status === "in_progress") {
      assignees.forEach((name) => {
        if (!inProgress[name]) inProgress[name] = [];
        inProgress[name].push(task.title);
      });
    } else if (task.status === "blocked") {
      assignees.forEach((name) => {
        if (!blocked[name]) blocked[name] = [];
        blocked[name].push(task.title);
      });
    } else if (task.status === "review") {
      needsReview.push(task.title);
    }
  }

  // Build standup report
  let report = `📊 DAILY STANDUP — ${today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}\n\n`;

  report += "✅ COMPLETED TODAY\n";
  for (const [agentName, tasks] of Object.entries(completedToday)) {
    tasks.forEach((task) => {
      report += `• ${agentName}: ${task}\n`;
    });
  }
  if (Object.keys(completedToday).length === 0) {
    report += "• None\n";
  }

  report += "\n🔄 IN PROGRESS\n";
  for (const [agentName, tasks] of Object.entries(inProgress)) {
    tasks.forEach((task) => {
      report += `• ${agentName}: ${task}\n`;
    });
  }
  if (Object.keys(inProgress).length === 0) {
    report += "• None\n";
  }

  report += "\n🚫 BLOCKED\n";
  for (const [agentName, tasks] of Object.entries(blocked)) {
    tasks.forEach((task) => {
      report += `• ${agentName}: ${task}\n`;
    });
  }
  if (Object.keys(blocked).length === 0) {
    report += "• None\n";
  }

  report += "\n👀 NEEDS REVIEW\n";
  needsReview.forEach((task) => {
    report += `• ${task}\n`;
  });
  if (needsReview.length === 0) {
    report += "• None\n";
  }

  // Key decisions from messages
  const decisionMessages = todayActivities.filter((a) =>
    a.message.toLowerCase().includes("decision") || a.message.toLowerCase().includes("decided")
  );

  if (decisionMessages.length > 0) {
    report += "\n📝 KEY DECISIONS\n";
    decisionMessages.forEach((activity) => {
      report += `• ${activity.message}\n`;
    });
  }

  return report;
}

async function sendStandup(): Promise<void> {
  try {
    const report = await generateStandup();
    console.log("\n" + report + "\n");

    // TODO: Send to Telegram or other notification channel
    // For now, just log it
  } catch (error) {
    console.error("Error generating standup:", error);
  }
}

export function startStandupScheduler(): void {
  console.log("Starting standup scheduler...");

  // Schedule for 11:30 PM IST (6:00 PM UTC)
  cron.schedule("0 18 * * *", () => {
    sendStandup().catch(console.error);
  });

  console.log("Standup scheduler started (runs daily at 11:30 PM IST)");
}

if (require.main === module) {
  startStandupScheduler();
  // Keep process alive
  setInterval(() => {}, 1000);
}
