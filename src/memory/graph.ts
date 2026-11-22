import * as fs from 'node:fs';
import * as path from 'node:path';

export interface MemoryNode {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface SearchResult {
  node: MemoryNode;
  score: number;
}

/**
 * Hybrid Key-Value & Vector Memory Graph.
 * Combines O(1) deterministic key lookup with O(N*D) cosine-similarity semantic retrieval.
 */
export class MemoryGraph {
  private nodes = new Map<string, MemoryNode>();
  private readonly persistencePath?: string;

  constructor(options?: { persistence?: string }) {
    this.persistencePath = options?.persistence;
    if (this.persistencePath && fs.existsSync(this.persistencePath)) {
      this.load();
    }
  }

  /**
   * Computes cosine similarity between two equal-length vectors.
   * Time Complexity: O(D) where D is embedding dimension.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Generates a deterministic lightweight local embedding (64-dim) for zero-dependency execution.
   */
  public embed(text: string): number[] {
    const dim = 64;
    const vec = new Array<number>(dim).fill(0);
    const normalized = text.toLowerCase();
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      vec[(code * (i + 1)) % dim] += 1;
    }
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map((v) => v / mag);
  }

  public upsert(id: string, content: string, metadata: Record<string, unknown> = {}): MemoryNode {
    const node: MemoryNode = {
      id,
      content,
      embedding: this.embed(content),
      metadata,
      timestamp: Date.now(),
    };
    this.nodes.set(id, node);
    this.persist();
    return node;
  }

  public get(id: string): MemoryNode | undefined {
    return this.nodes.get(id);
  }

  public query(text: string, topK = 3): SearchResult[] {
    const qVec = this.embed(text);
    const results: SearchResult[] = [];
    for (const node of this.nodes.values()) {
      results.push({
        node,
        score: this.cosineSimilarity(qVec, node.embedding),
      });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  public size(): number {
    return this.nodes.size;
  }

  private persist(): void {
    if (!this.persistencePath) return;
    const dir = path.dirname(this.persistencePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const serialized = JSON.stringify(Array.from(this.nodes.entries()), null, 2);
    fs.writeFileSync(this.persistencePath, serialized, 'utf-8');
  }

  private load(): void {
    if (!this.persistencePath) return;
    const raw = fs.readFileSync(this.persistencePath, 'utf-8');
    const entries = JSON.parse(raw) as [string, MemoryNode][];
    this.nodes = new Map(entries);
  }
}
