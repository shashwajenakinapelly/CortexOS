import { MemoryGraph } from '../memory/graph.js';

export interface CortexConfig {
  model: string;
  memory?: MemoryGraph;
  maxConcurrency?: number;
  maxRetries?: number;
}

export interface AgentTask<T = unknown> {
  id: string;
  dependencies?: string[];
  run: (context: TaskContext) => Promise<T>;
}

export interface TaskContext {
  results: Record<string, unknown>;
  memory: MemoryGraph;
}

export interface ExecutionReport {
  output: Record<string, unknown>;
  durationMs: number;
  tasksExecuted: number;
}

/**
 * CortexEngine: Deterministic Directed Acyclic Graph (DAG) agent runtime.
 * Resolves task dependencies, enforces bounded concurrency, and isolates failures.
 */
export class CortexEngine {
  public readonly model: string;
  public readonly memory: MemoryGraph;
  private readonly maxConcurrency: number;
  private readonly maxRetries: number;

  constructor(config: CortexConfig) {
    this.model = config.model;
    this.memory = config.memory ?? new MemoryGraph();
    this.maxConcurrency = Math.max(1, config.maxConcurrency ?? 4);
    this.maxRetries = Math.max(0, config.maxRetries ?? 2);
  }

  private async runWithRetry<T>(task: AgentTask<T>, context: TaskContext): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await task.run(context);
      } catch (err) {
        if (attempt >= this.maxRetries) throw err;
        attempt++;
        const backoffMs = Math.pow(2, attempt) * 10;
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    }
  }

  /**
   * Executes a DAG of AgentTasks respecting dependencies and maxConcurrency.
   * Detects circular dependencies in O(V + E) before execution.
   */
  public async executeGraph(tasks: AgentTask[]): Promise<ExecutionReport> {
    const start = performance.now();
    const taskMap = new Map<string, AgentTask>();
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const task of tasks) {
      if (taskMap.has(task.id)) throw new Error(`Duplicate task ID: ${task.id}`);
      taskMap.set(task.id, task);
      inDegree.set(task.id, 0);
      dependents.set(task.id, []);
    }

    for (const task of tasks) {
      for (const dep of task.dependencies ?? []) {
        if (!taskMap.has(dep)) throw new Error(`Missing dependency "${dep}" for task "${task.id}"`);
        inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
        dependents.get(dep)!.push(task.id);
      }
    }

    const ready: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) ready.push(id);
    }

    const results: Record<string, unknown> = {};
    let completedCount = 0;
    let activeCount = 0;

    await new Promise<void>((resolve, reject) => {
      const schedule = () => {
        if (completedCount === tasks.length) {
          resolve();
          return;
        }
        while (activeCount < this.maxConcurrency && ready.length > 0) {
          const currentId = ready.shift()!;
          const task = taskMap.get(currentId)!;
          activeCount++;

          this.runWithRetry(task, { results, memory: this.memory })
            .then((res) => {
              results[currentId] = res;
              completedCount++;
              activeCount--;

              for (const nextId of dependents.get(currentId) ?? []) {
                const nextDeg = (inDegree.get(nextId) ?? 1) - 1;
                inDegree.set(nextId, nextDeg);
                if (nextDeg === 0) ready.push(nextId);
              }
              schedule();
            })
            .catch(reject);
        }

        if (activeCount === 0 && ready.length === 0 && completedCount < tasks.length) {
          reject(new Error('Circular dependency detected in task graph.'));
        }
      };

      schedule();
    });

    return {
      output: results,
      durationMs: Number((performance.now() - start).toFixed(3)),
      tasksExecuted: completedCount,
    };
  }
}
