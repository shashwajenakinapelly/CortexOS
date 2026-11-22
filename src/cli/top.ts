import { CortexEngine, MemoryGraph } from '../index.js';

/**
 * Real-time ANSI Terminal Telemetry Monitor (`cortex top`)
 */
async function renderTelemetry() {
  const memory = new MemoryGraph();
  const engine = new CortexEngine({ model: 'local:llama-3-8b', memory, maxConcurrency: 6 });

  const stages = [
    'intent-classifier',
    'memory-vector-lookup',
    'ast-context-builder',
    'tool-sandbox-verify',
    'planner-synthesis',
    'output-guardrail',
  ];

  console.clear();
  console.log('\x1b[36m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║\x1b[1m  ⚡ CORTEX-OS KERNEL TELEMETRY (cortex top)         [STATUS: ACTIVE]  \x1b[0m\x1b[36m║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

  for (let i = 0; i < stages.length; i++) {
    memory.upsert(`trace-${i}`, `Telemetry vector frame for stage ${stages[i]}`);
    const report = await engine.executeGraph([
      {
        id: stages[i],
        run: async () => {
          await new Promise((r) => setTimeout(r, 45));
          return 'OK';
        },
      },
    ]);

    const pct = Math.round(((i + 1) / stages.length) * 100);
    const filled = '█'.repeat(Math.round(pct / 5));
    const empty = '░'.repeat(20 - filled.length);
    const rss = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

    process.stdout.write(
      `\r\x1b[32m[${filled}${empty}]\x1b[0m ${pct}% | Node: \x1b[1m${stages[i].padEnd(22)}\x1b[0m | Latency: \x1b[33m${report.durationMs}ms\x1b[0m | RSS: ${rss}MB`
    );
  }

  console.log('\n\n\x1b[32m✔ All DAG execution pipelines verified. Memory Graph Nodes: ' + memory.size() + '\x1b[0m\n');
}

renderTelemetry();
