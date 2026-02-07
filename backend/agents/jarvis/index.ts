import { Agent, AgentConfig } from "../base/Agent";
import * as path from "path";

export function createJarvis(): Agent {
  const workspacePath = path.join(process.cwd(), "workspace", "agents", "jarvis");
  
  const config: AgentConfig = {
    name: "Jarvis",
    role: "Squad Lead",
    sessionKey: "agent:main:main",
    workspacePath,
    model: "anthropic",
    modelName: process.env.AGENT_MODEL || "claude-3-5-sonnet-20241022",
    temperature: 0.7,
  };

  return new Agent(config);
}
