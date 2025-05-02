export interface AiAnalysisResult {
  titleSuggestion: string;
  contentSuggestion: string;
  recommendedTags: string[];
  readability: {
    score: number;
    level: string;
    suggestions: string[];
  };
  seo: {
    score: number;
    suggestions: string[];
  };
  sentiment: {
    score: number;
    type: 'positive' | 'neutral' | 'negative';
  };
  keywords: Array<{
    word: string;
    score: number;
  }>;
  structure: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

export interface AiSuggestion {
  type: string;
  content: string;
  rationale: string;
  example?: string;
}

export interface AiPromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
}