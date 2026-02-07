import { Agent, AgentConfig } from "../base/Agent";
import * as path from "path";

export function createShuri(): Agent {
  const workspacePath = path.join(process.cwd(), "workspace", "agents", "shuri");
  
  const config: AgentConfig = {
    name: "Shuri",
    role: "Product Analyst",
    sessionKey: "agent:product-analyst:main",
    workspacePath,
    model: "anthropic",
    modelName: process.env.AGENT_MODEL || "claude-3-5-sonnet-20241022",
    temperature: 0.7,
  };

  return new Agent(config);
}
