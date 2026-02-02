export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatConfig {
  model: string;
  temperature?: number;
  max_tokens?: number;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function createChatCompletion(
  messages: Message[],
  config: ChatConfig,
  onStream?: (chunk: string) => void
) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_OPENROUTER_API_KEY is not defined');
  }

  console.log(`[OpenRouter] Calling model: ${config.model}`);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MULTIGPT',
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages,
      stream: !!onStream,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`[OpenRouter] Error for ${config.model}:`, error);
    throw new Error(error.error?.message || `Model ${config.model} failed with status ${response.status}`);
  }

  if (onStream && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');
      for (const line of lines) {
        if (line === 'data: [DONE]') return;
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content || '';
            onStream(content);
          } catch (e) {
            console.error('Error parsing stream chunk', e);
          }
        }
      }
    }
  } else {
    const data = await response.json();
    return data.choices[0].message.content;
  }
}
