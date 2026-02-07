import { Agent, AgentConfig } from "../base/Agent";
import * as path from "path";

export function createFriday(): Agent {
  const workspacePath = path.join(process.cwd(), "workspace", "agents", "friday");
  
  const config: AgentConfig = {
    name: "Friday",
    role: "Developer",
    sessionKey: "agent:developer:main",
    workspacePath,
    model: "anthropic",
    modelName: process.env.AGENT_MODEL || "claude-3-5-sonnet-20241022",
    temperature: 0.7,
  };

  return new Agent(config);
}
