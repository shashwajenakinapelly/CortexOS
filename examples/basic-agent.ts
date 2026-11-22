import { CortexEngine, MemoryGraph } from '../src/index.js';

async function main() {
  const memory = new MemoryGraph();
  memory.upsert('arch-1', 'CortexOS uses a deterministic DAG scheduler for parallel agent tasks.');
  memory.upsert('arch-2', 'Hybrid memory combines O(1) lookup with cosine similarity search.');

  const engine = new CortexEngine({
    model: 'local:llama-3-8b',
    memory,
    maxConcurrency: 4,
  });

  const report = await engine.executeGraph([
    {
      id: 'retrieve-context',
      run: async ({ memory }) => memory.query('How does CortexOS schedule tasks?', 1)[0],
    },
    {
      id: 'analyze-system',
      dependencies: ['retrieve-context'],
      run: async ({ results }) => {
        const ctx = results['retrieve-context'] as { node: { content: string }; score: number };
        return `Verified context (score=${ctx.score.toFixed(2)}): ${ctx.node.content}`;
      },
    },
  ]);

  console.log('Execution Report:', JSON.stringify(report, null, 2));
}

main();
