import axios from 'axios';
import { AiAnalysisResult, AiSuggestion } from '@/types/ai';

export class AiService {
  private static instance: AiService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.VUE_APP_AI_API_URL || '/api/ai';
  }

  public static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  /**
   * 分析讨论内容
   */
  async analyzeContent(params: {
    title: string;
    content: string;
    category?: string;
    language?: string;
  }): Promise<AiAnalysisResult> {
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/analyze`,
        params
      );
      return data;
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }

  /**
   * 获取写作建议
   */
  async getSuggestions(params: {
    text: string;
    type: 'title' | 'content' | 'structure';
    context?: Record<string, any>;
  }): Promise<AiSuggestion[]> {
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/suggestions`,
        params
      );
      return data;
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      throw error;
    }
  }

  /**
   * 生成标签建议
   */
  async suggestTags(params: {
    title: string;
    content: string;
    category?: string;
    existingTags?: string[];
    maxTags?: number;
  }): Promise<string[]> {
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/suggest-tags`,
        params
      );
      return data;
    } catch (error) {
      console.error('Failed to suggest tags:', error);
      throw error;
    }
  }

  /**
   * 优化标题
   */
  async optimizeTitle(params: {
    title: string;
    content: string;
    category?: string;
    targetLength?: number;
  }): Promise<string[]> {
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/optimize-title`,
        params
      );
      return data;
    } catch (error) {
      console.error('Failed to optimize title:', error);
      throw error;
    }
  }

  /**
   * 检查可读性
   */
  async checkReadability(text: string): Promise<{
    score: number;
    level: string;
    suggestions: string[];
  }> {
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/check-readability`,
        { text }
      );
      return data;
    } catch (error) {
      console.error('Failed to check readability:', error);
      throw error;
    }
  }

  /**
   * SEO 分析
   */
  async analyzeSEO(params: {
    title: string;
    content: string;
    tags?: string[];
  }): Promise<{
    score: number;
    suggestions: string[];
  }> {
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/analyze-seo`,
        params
      );
      return data;
    } catch (error) {
      console.error('Failed to analyze SEO:', error);
      throw error;
    }
  }
}

export const aiService = AiService.getInstance();