import { createChatCompletion } from './openrouter';

interface RoutingDecision {
  model: string;
  reason: string;
}

// Keyword-based routing for reliability
const KEYWORD_ROUTES: { keywords: string[]; model: string; reason: string }[] = [
  {
    keywords: ['code', 'coding', 'programming', 'function', 'debug', 'javascript', 'python', 'java', 'html', 'css', 'api', 'algorithm', 'software', 'developer'],
    model: 'nvidia/nemotron-3-nano-30b-a3b:free',
    reason: 'Coding and reasoning task - using Nemotron for best results'
  },
  {
    keywords: ['chinese', 'mandarin', '中文', 'translate', 'translation', 'multilingual', 'language'],
    model: 'z-ai/glm-4.5-air:free',
    reason: 'Multilingual content - using GLM for best language support'
  },
  {
    keywords: ['analyze', 'analysis', 'explain', 'detailed', 'comprehensive', 'essay', 'write', 'story', 'creative', 'long', 'article', 'research'],
    model: 'google/gemma-3-27b-it:free',
    reason: 'Complex analysis task - using largest model for depth'
  },
  {
    keywords: ['quick', 'fast', 'simple', 'short', 'brief', 'hi', 'hello', 'hey', 'thanks', 'okay'],
    model: 'google/gemma-3-4b-it:free',
    reason: 'Quick response needed - using fast model'
  },
  {
    keywords: ['math', 'calculate', 'logic', 'reason', 'solve', 'problem', 'think', 'step by step'],
    model: 'nvidia/nemotron-3-nano-30b-a3b:free',
    reason: 'Reasoning task - using Nemotron for logical analysis'
  },
  {
    keywords: ['efficient', 'mobile', 'lightweight'],
    model: 'google/gemma-3n-e4b-it:free',
    reason: 'Efficient response - using optimized model'
  }
];

function routeByKeywords(query: string): RoutingDecision | null {
  const lowerQuery = query.toLowerCase();

  for (const route of KEYWORD_ROUTES) {
    if (route.keywords.some(keyword => lowerQuery.includes(keyword))) {
      return { model: route.model, reason: route.reason };
    }
  }

  return null;
}

export async function routeQuery(query: string): Promise<RoutingDecision> {
  // First try keyword-based routing (fast and reliable)
  const keywordRoute = routeByKeywords(query);
  if (keywordRoute) {
    console.log('[Router] Keyword match:', keywordRoute);
    return keywordRoute;
  }

  // For queries without clear keywords, use AI to decide
  try {
    const response = await createChatCompletion(
      [
        {
          role: 'system',
          content: `Pick the best model for this query. Reply with ONLY the model ID, nothing else.
Models:
- google/gemma-3-27b-it:free (complex tasks, creative writing)
- google/gemma-3-12b-it:free (general purpose)
- google/gemma-3-4b-it:free (quick responses)
- z-ai/glm-4.5-air:free (multilingual)
- nvidia/nemotron-3-nano-30b-a3b:free (reasoning, coding)`
        },
        { role: 'user', content: query }
      ],
      { model: 'google/gemma-3-4b-it:free', temperature: 0 }
    );

    if (response) {
      const cleanResponse = response.trim();
      // Check if the response contains a valid model ID
      const validModels = [
        'google/gemma-3-27b-it:free',
        'google/gemma-3-12b-it:free',
        'google/gemma-3-4b-it:free',
        'google/gemma-3n-e4b-it:free',
        'z-ai/glm-4.5-air:free',
        'nvidia/nemotron-3-nano-30b-a3b:free'
      ];

      for (const model of validModels) {
        if (cleanResponse.includes(model)) {
          console.log('[Router] AI selected:', model);
          return { model, reason: 'AI-selected best model for this query' };
        }
      }
    }
  } catch (error) {
    console.error('Routing error:', error);
  }

  // Default fallback - use general purpose model
  console.log('[Router] Using default model');
  return {
    model: 'google/gemma-3-12b-it:free',
    reason: 'General purpose model for balanced response'
  };
}











