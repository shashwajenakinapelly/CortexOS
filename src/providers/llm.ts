export interface LLMRequest {
  prompt: string;
  system?: string;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  generate(req: LLMRequest): Promise<string>;
}

/**
 * Zero-dependency Ollama / OpenAI-compatible local inference adapter using native fetch().
 */
export class OllamaProvider implements LLMProvider {
  public readonly name = 'ollama-local';
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(model = 'llama3', baseUrl = 'http://127.0.0.1:11434') {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  public async generate(req: LLMRequest): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: req.system ? `${req.system}\n\n${req.prompt}` : req.prompt,
        stream: false,
        options: { temperature: req.temperature ?? 0.2 },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama inference error (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { response: string };
    return data.response;
  }
}
