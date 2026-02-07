// Main entry point for backend services
// This can be used to run agents directly or for testing

import { createJarvis } from "./agents/jarvis";
import { createShuri } from "./agents/shuri";
import { createFriday } from "./agents/friday";

async function main() {
  const args = process.argv.slice(2);
  const agentName = args[0] || "jarvis";

  let agent;
  switch (agentName.toLowerCase()) {
    case "jarvis":
      agent = createJarvis();
      break;
    case "shuri":
      agent = createShuri();
      break;
    case "friday":
      agent = createFriday();
      break;
    default:
      console.error(`Unknown agent: ${agentName}`);
      process.exit(1);
  }

  await agent.initialize();

  if (args[1]) {
    // Execute single command
    const result = await agent.execute(args[1]);
    console.log(result);
  } else {
    // Interactive mode (basic)
    console.log(`Agent ${agentName} ready. Type your message:`);
    process.stdin.on("data", async (data) => {
      const input = data.toString().trim();
      if (input === "exit") process.exit(0);
      const result = await agent.execute(input);
      console.log(result);
    });
  }
}

main().catch(console.error);
