import { Client } from '@elastic/elasticsearch';
import config from '../config/app';

export class SearchService {
  private static instance: SearchService;
  private client: Client;
  private indexPrefix: string;

  private constructor() {
    this.client = new Client({
      node: config.elasticsearch.node,
      auth: {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
      },
    });
    this.indexPrefix = config.elasticsearch.indexPrefix;
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * 索引讨论
   */
  async indexDiscussion(discussion: any): Promise<void> {
    const { id, title, content, author, category, tags, created_at } = discussion;

    await this.client.index({
      index: `${this.indexPrefix}discussions`,
      id: id.toString(),
      document: {
        title,
        content,
        author: {
          id: author.id,
          username: author.username,
        },
        category: category
          ? {
              id: category.id,
              name: category.name,
            }
          : null,
        tags: tags.map((tag: any) => tag.name),
        created_at,
      },
    });
  }

  /**
   * 搜索讨论
   */
  async searchDiscussions(params: {
    query: string;
    filters?: {
      category?: string;
      author?: string;
      tags?: string[];
      timeRange?: {
        start: Date;
        end: Date;
      };
    };
    page?: number;
    pageSize?: number;
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
  }) {
    const {
      query,
      filters = {},
      page = 1,
      pageSize = 20,
      sort,
    } = params;

    const must: any[] = [
      {
        multi_match: {
          query,
          fields: ['title^2', 'content'],
          fuzziness: 'AUTO',
        },
      },
    ];

    if (filters.category) {
      must.push({
        match: { 'category.name': filters.category },
      });
    }

    if (filters.author) {
      must.push({
        match: { 'author.username': filters.author },
      });
    }

    if (filters.tags?.length) {
      must.push({
        terms: { tags: filters.tags },
      });
    }

    if (filters.timeRange) {
      must.push({
        range: {
          created_at: {
            gte: filters.timeRange.start,
            lte: filters.timeRange.end,
          },
        },
      });
    }

    const result = await this.client.search({
      index: `${this.indexPrefix}discussions`,
      body: {
        query: {
          bool: { must },
        },
        sort: sort
          ? [{ [sort.field]: { order: sort.order } }]
          : [{ _score: { order: 'desc' } }],
        from: (page - 1) * pageSize,
        size: pageSize,
        highlight: {
          fields: {
            title: {},
            content: {
              fragment_size: 150,
              number_of_fragments: 3,
            },
          },
        },
        aggs: {
          categories: {
            terms: { field: 'category.name.keyword' },
          },
          tags: {
            terms: { field: 'tags.keyword' },
          },
          authors: {
            terms: { field: 'author.username.keyword' },
          },
        },
      },
    });

    return {
      total: result.hits.total,
      items: result.hits.hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
        highlights: hit.highlight,
      })),
      aggregations: result.aggregations,
    };
  }

  /**
   * 删除讨论索引
   */
  async deleteDiscussion(id: number): Promise<void> {
    await this.client.delete({
      index: `${this.indexPrefix}discussions`,
      id: id.toString(),
    });
  }

  /**
   * 更新讨论索引
   */
  async updateDiscussion(id: number, fields: any): Promise<void> {
    await this.client.update({
      index: `${this.indexPrefix}discussions`,
      id: id.toString(),
      doc: fields,
    });
  }

  /**
   * 搜索建议
   */
  async getSuggestions(
    query: string,
    size = 5
  ): Promise<Array<{ text: string; score: number }>> {
    const result = await this.client.search({
      index: `${this.indexPrefix}discussions`,
      body: {
        suggest: {
          title_suggest: {
            prefix: query,
            completion: {
              field: 'title_suggest',
              size,
              fuzzy: {
                fuzziness: 'AUTO',
              },
            },
          },
        },
        _source: ['title'],
      },
    });

    return result.suggest.title_suggest[0].options.map((option: any) => ({
      text: option._source.title,
      score: option._score,
    }));
  }

  /**
   * 相关内容推荐
   */
  async getRelatedContent(
    discussionId: string,
    size = 5
  ): Promise<any[]> {
    const { _source } = await this.client.get({
      index: `${this.indexPrefix}discussions`,
      id: discussionId,
    });

    const result = await this.client.search({
      index: `${this.indexPrefix}discussions`,
      body: {
        query: {
          bool: {
            must: [
              {
                more_like_this: {
                  fields: ['title', 'content'],
                  like: [
                    {
                      _index: `${this.indexPrefix}discussions`,
                      _id: discussionId,
                    },
                  ],
                  min_term_freq: 1,
                  max_query_terms: 12,
                },
              },
            ],
            must_not: [
              {
                ids: {
                  values: [discussionId],
                },
              },
            ],
          },
        },
        size,
      },
    });

    return result.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    }));
  }
}

export const searchService = SearchService.getInstance();