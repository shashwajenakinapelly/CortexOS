import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CortexEngine, MemoryGraph } from '../src/index.js';

describe('CortexOS Core Runtime', () => {
  it('executes DAG dependencies in topological order', async () => {
    const engine = new CortexEngine({ model: 'test-model', maxConcurrency: 2 });
    const order: string[] = [];

    const report = await engine.executeGraph([
      {
        id: 'step-1',
        run: async () => {
          order.push('step-1');
          return 10;
        },
      },
      {
        id: 'step-2',
        dependencies: ['step-1'],
        run: async ({ results }) => {
          order.push('step-2');
          return (results['step-1'] as number) * 2;
        },
      },
    ]);

    assert.deepEqual(order, ['step-1', 'step-2']);
    assert.equal(report.output['step-2'], 20);
  });

  it('detects circular dependencies', async () => {
    const engine = new CortexEngine({ model: 'test-model' });
    await assert.rejects(
      () =>
        engine.executeGraph([
          { id: 'a', dependencies: ['b'], run: async () => 1 },
          { id: 'b', dependencies: ['a'], run: async () => 2 },
        ]),
      /Circular dependency/
    );
  });

  it('retrieves semantically similar items from MemoryGraph', () => {
    const mem = new MemoryGraph();
    mem.upsert('k1', 'Rust and TypeScript systems programming');
    mem.upsert('k2', 'Italian pasta cooking recipes');

    const hits = mem.query('TypeScript systems', 1);
    assert.equal(hits[0].node.id, 'k1');
  });
});
