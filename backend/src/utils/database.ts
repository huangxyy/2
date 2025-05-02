import { Pool, QueryResult } from 'pg';
import pool from '../config/database';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = pool;
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * 执行 SQL 查询
   */
  async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error', { text, error });
      throw error;
    }
  }

  /**
   * 在事务中执行查询
   */
  async transaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 分页查询
   */
  async paginate<T = any>(
    sql: string,
    params: any[] = [],
    page = 1,
    pageSize = 20
  ): Promise<{
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * pageSize;
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) AS t`;
    const dataSql = `${sql} LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: number }>(countSql, params),
      this.query<T>(dataSql, [...params, pageSize, offset]),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: dataResult.rows,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}

export const db = Database.getInstance();