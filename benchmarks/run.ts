import { CortexEngine, MemoryGraph, AgentTask } from '../src/index.js';

async function runBenchmarks() {
  console.log('⚡ CortexOS Performance Benchmark Suite\n');

  // 1. DAG Scheduling Throughput (1,000 interdependent tasks)
  const taskCount = 1000;
  const tasks: AgentTask[] = [];
  for (let i = 0; i < taskCount; i++) {
    tasks.push({
      id: `node-${i}`,
      dependencies: i > 0 ? [`node-${i - 1}`] : [],
      run: async () => i * 2,
    });
  }

  const engine = new CortexEngine({ model: 'bench-runtime', maxConcurrency: 16 });
  const dagStart = performance.now();
  const report = await engine.executeGraph(tasks);
  const dagTotalMs = performance.now() - dagStart;

  // 2. Hybrid Memory Graph Indexing & Vector Retrieval (5,000 nodes)
  const memory = new MemoryGraph();
  const memInsertStart = performance.now();
  for (let i = 0; i < 5000; i++) {
    memory.upsert(`doc-${i}`, `Autonomous agent execution trace and telemetry packet #${i}`);
  }
  const memInsertMs = performance.now() - memInsertStart;

  const queryStart = performance.now();
  const hits = memory.query('agent execution telemetry packet', 5);
  const queryMs = performance.now() - queryStart;

  // 3. Process Memory Footprint
  const rssMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

  console.table([
    {
      Metric: '1,000-Node Sequential DAG Execution',
      Total_Time: `${dagTotalMs.toFixed(2)} ms`,
      Per_Op_Latency: `${(dagTotalMs / taskCount).toFixed(4)} ms/task`,
      Tasks_Verified: report.tasksExecuted,
    },
    {
      Metric: '5,000-Node Vector + KV Upsert',
      Total_Time: `${memInsertMs.toFixed(2)} ms`,
      Per_Op_Latency: `${(memInsertMs / 5000).toFixed(4)} ms/node`,
      Tasks_Verified: memory.size(),
    },
    {
      Metric: 'Top-5 Cosine Similarity Query (5k Corpus)',
      Total_Time: `${queryMs.toFixed(3)} ms`,
      Per_Op_Latency: `${queryMs.toFixed(3)} ms/query`,
      Tasks_Verified: hits.length,
    },
  ]);

  console.log(`\n📦 Peak Process RSS Memory: ${rssMb} MB`);
}

runBenchmarks();
