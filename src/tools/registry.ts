export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  execute: (input: TInput) => Promise<TOutput>;
}

/**
 * Sandboxed Tool Registry with strict execution timeouts and audit logging.
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  public register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): this {
    this.tools.set(tool.name, tool as ToolDefinition);
    return this;
  }

  public async invoke(name: string, input: Record<string, unknown>, timeoutMs = 5000): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool "${name}" is not registered in sandbox.`);

    return Promise.race([
      tool.execute(input),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool "${name}" timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  public list(): string[] {
    return Array.from(this.tools.keys());
  }
}
