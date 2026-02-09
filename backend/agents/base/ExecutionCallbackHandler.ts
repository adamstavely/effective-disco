import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Serialized } from "@langchain/core/load/serializable";
import { AgentAction, AgentFinish, ChainValues } from "@langchain/core/agents";
import * as executionFunctions from "../../supabase/functions/execution";

export interface ExecutionCallbackConfig {
  taskId: string;
  agentId: string | null;
}

export class ExecutionCallbackHandler extends BaseCallbackHandler {
  name = "ExecutionCallbackHandler";
  private taskId: string;
  private agentId: string | null;
  private currentStepId: string | null = null;
  private stepStartTime: number = 0;

  constructor(config: ExecutionCallbackConfig) {
    super();
    this.taskId = config.taskId;
    this.agentId = config.agentId;
  }

  async handleToolStart(
    serialized: Serialized,
    inputStr: string,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    runName?: string
  ): Promise<void> {
    const toolName = serialized.name || "unknown_tool";
    this.stepStartTime = Date.now();

    try {
      // Check if task is paused before starting
      const executionState = await executionFunctions.checkTaskExecutionState(this.taskId);
      if (executionState === 'paused') {
        // Wait for resume (with timeout)
        await this.waitForResume(30000); // 30 second timeout
      }

      // Log step start
      this.currentStepId = await executionFunctions.logExecutionStep(
        this.taskId,
        this.agentId,
        {
          toolName,
          input: this.sanitizeInput(inputStr),
          message: `Starting ${toolName}`
        },
        'running'
      );
    } catch (error) {
      // Don't break execution if logging fails
      console.error(`Error logging step start: ${error}`);
    }
  }

  async handleToolEnd(
    output: string,
    runId: string,
    parentRunId?: string,
    tags?: string[]
  ): Promise<void> {
    if (!this.currentStepId) return;

    const duration = Date.now() - this.stepStartTime;

    try {
      await executionFunctions.updateStepStatus(
        this.currentStepId,
        'completed',
        {
          output: this.sanitizeOutput(output),
          duration
        }
      );
    } catch (error) {
      console.error(`Error logging step completion: ${error}`);
    }

    this.currentStepId = null;
  }

  async handleToolError(
    err: any,
    runId: string,
    parentRunId?: string,
    tags?: string[]
  ): Promise<void> {
    if (!this.currentStepId) return;

    const duration = Date.now() - this.stepStartTime;

    try {
      await executionFunctions.updateStepStatus(
        this.currentStepId,
        'failed',
        {
          error: err?.message || String(err),
          duration
        }
      );
    } catch (logError) {
      console.error(`Error logging step failure: ${logError}`);
    }

    this.currentStepId = null;
  }

  async handleAgentAction(
    action: AgentAction,
    runId: string,
    parentRunId?: string,
    tags?: string[]
  ): Promise<void> {
    // Log agent action as a step
    try {
      await executionFunctions.logExecutionStep(
        this.taskId,
        this.agentId,
        {
          toolName: action.tool,
          input: this.sanitizeInput(JSON.stringify(action.toolInput)),
          message: `Agent action: ${action.tool}`
        },
        'running'
      );
    } catch (error) {
      console.error(`Error logging agent action: ${error}`);
    }
  }

  async handleAgentEnd(
    action: AgentFinish,
    runId: string,
    parentRunId?: string,
    tags?: string[]
  ): Promise<void> {
    // Log agent finish
    try {
      await executionFunctions.logExecutionStep(
        this.taskId,
        this.agentId,
        {
          message: "Agent finished execution",
          output: action.returnValues?.output || ""
        },
        'completed'
      );
    } catch (error) {
      console.error(`Error logging agent finish: ${error}`);
    }
  }

  /**
   * Wait for task to be resumed (with timeout)
   */
  private async waitForResume(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 1000; // Check every second

    while (Date.now() - startTime < timeoutMs) {
      const state = await executionFunctions.checkTaskExecutionState(this.taskId);
      if (state === 'running') {
        return; // Resumed
      }
      if (state === 'idle') {
        throw new Error('Task execution was interrupted');
      }
      // Still paused, wait and check again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Timeout waiting for task resume');
  }

  /**
   * Sanitize input to remove sensitive data
   */
  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potential API keys, passwords, etc.
      return input
        .replace(/api[_-]?key["\s:=]+([a-zA-Z0-9_-]{20,})/gi, 'api_key=***')
        .replace(/password["\s:=]+([^\s"']+)/gi, 'password=***')
        .replace(/token["\s:=]+([a-zA-Z0-9_-]{20,})/gi, 'token=***');
    }
    if (typeof input === 'object') {
      const sanitized = { ...input };
      // Remove sensitive fields
      delete sanitized.apiKey;
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      return sanitized;
    }
    return input;
  }

  /**
   * Sanitize output to remove sensitive data
   */
  private sanitizeOutput(output: any): any {
    if (typeof output === 'string') {
      // Truncate very long outputs
      if (output.length > 1000) {
        return output.substring(0, 1000) + '... (truncated)';
      }
      return this.sanitizeInput(output);
    }
    return output;
  }
}
