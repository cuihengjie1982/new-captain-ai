import { Note, NoteInput, NoteUpdate, AppError } from '@/types';
import { logger } from '@/utils/logger';
import db from '@/config/database';

export class NoteService {
  // 获取用户笔记列表
  async getUserNotes(userId: string, options: {
    page: number;
    limit: number;
    sourceType?: 'article' | 'video' | 'manual';
    search?: string;
  }): Promise<{ notes: Note[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit, sourceType, search } = options;
      const offset = (page - 1) * limit;

      let query = db('user_notes')
        .select('*')
        .where({ userId });

      // 添加筛选条件
      if (sourceType) {
        query = query.where('sourceType', sourceType);
      }

      if (search) {
        query = query.where(function() {
          this.where('content', 'ilike', `%${search}%`)
              .orWhere('lessonTitle', 'ilike', `%${search}%`)
              .orWhere('quote', 'ilike', `%${search}%`);
        });
      }

      // 获取总数
      const totalQuery = query.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取笔记列表
      const notes = await query
        .orderBy('createdAt', 'DESC')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        notes: notes.map(note => this.mapDbNoteToNote(note)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('获取用户笔记失败', { userId, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取用户笔记失败', 500);
    }
  }

  // 创建笔记
  async createNote(userId: string, noteData: NoteInput): Promise<Note> {
    try {
      const [note] = await db('user_notes')
        .insert({
          id: require('uuid').v4(),
          userId,
          lessonTitle: noteData.lessonTitle,
          content: noteData.content,
          quote: noteData.quote,
          sourceType: noteData.sourceType || 'manual',
          sourceId: noteData.sourceId,
          timestampDisplay: noteData.timestampDisplay,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning('*');

      logger.info('笔记创建成功', { userId, noteId: note.id, sourceType: note.sourceType });

      return this.mapDbNoteToNote(note);
    } catch (error) {
      logger.error('笔记创建失败', { userId, noteData, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('笔记创建失败', 500);
    }
  }

  // 更新笔记
  async updateNote(id: string, userId: string, updateData: NoteUpdate): Promise<Note> {
    try {
      // 检查笔记是否存在且属于当前用户
      const existingNote = await db('user_notes')
        .where({ id, userId })
        .first();

      if (!existingNote) {
        throw new AppError('笔记不存在', 404);
      }

      const updateFields: any = {
        updatedAt: new Date(),
      };

      if (updateData.lessonTitle !== undefined) updateFields.lessonTitle = updateData.lessonTitle;
      if (updateData.content !== undefined) updateFields.content = updateData.content;
      if (updateData.quote !== undefined) updateFields.quote = updateData.quote;
      if (updateData.timestampDisplay !== undefined) updateFields.timestampDisplay = updateData.timestampDisplay;

      const [note] = await db('user_notes')
        .where({ id })
        .update(updateFields)
        .returning('*');

      logger.info('笔记更新成功', { userId, noteId: id, updateData });

      return this.mapDbNoteToNote(note);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('笔记更新失败', { id, userId, updateData, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('笔记更新失败', 500);
    }
  }

  // 删除笔记
  async deleteNote(id: string, userId: string): Promise<void> {
    try {
      const deletedCount = await db('user_notes')
        .where({ id, userId })
        .del();

      if (deletedCount === 0) {
        throw new AppError('笔记不存在', 404);
      }

      logger.info('笔记删除成功', { userId, noteId: id });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('笔记删除失败', { id, userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('笔记删除失败', 500);
    }
  }

  // 根据ID获取笔记
  async getNoteById(id: string, userId: string): Promise<Note | null> {
    try {
      const note = await db('user_notes')
        .where({ id, userId })
        .first();

      return note ? this.mapDbNoteToNote(note) : null;
    } catch (error) {
      logger.error('获取笔记详情失败', { id, userId, error: error instanceof Error ? error.message : '未知错误' });
      return null;
    }
  }

  // 获取文章相关的笔记
  async getNotesByArticle(userId: string, articleId: string): Promise<Note[]> {
    try {
      const notes = await db('user_notes')
        .select('*')
        .where({ userId, sourceId: articleId, sourceType: 'article' })
        .orderBy('createdAt', 'DESC');

      return notes.map(note => this.mapDbNoteToNote(note));
    } catch (error) {
      logger.error('获取文章笔记失败', { userId, articleId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取文章笔记失败', 500);
    }
  }

  // 搜索笔记
  async searchNotes(userId: string, query: string, options: {
    page?: number;
    limit?: number;
    sourceType?: 'article' | 'video' | 'manual';
  } = {}): Promise<{ notes: Note[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page = 1, limit = 10, sourceType } = options;
      const offset = (page - 1) * limit;

      let searchQuery = db('user_notes')
        .select('*')
        .where({ userId })
        .where(function() {
          this.where('content', 'ilike', `%${query}%`)
              .orWhere('lessonTitle', 'ilike', `%${query}%`)
              .orWhere('quote', 'ilike', `%${query}%`);
        });

      if (sourceType) {
        searchQuery = searchQuery.where('sourceType', sourceType);
      }

      // 获取总数
      const totalQuery = searchQuery.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取搜索结果
      const notes = await searchQuery
        .orderBy('createdAt', 'DESC')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        notes: notes.map(note => this.mapDbNoteToNote(note)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('搜索笔记失败', { userId, query, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('搜索笔记失败', 500);
    }
  }

  // 获取笔记统计信息
  async getNoteStats(userId: string): Promise<{
    totalNotes: number;
    articleNotes: number;
    videoNotes: number;
    manualNotes: number;
    recentNotes: number;
  }> {
    try {
      const [totalNotes, sourceStats] = await Promise.all([
        db('user_notes')
          .where({ userId })
          .count('* as count')
          .first(),

        db('user_notes')
          .where({ userId })
          .select('sourceType')
          .select(db.raw('COUNT(*) as count'))
          .groupBy('sourceType'),
      ]);

      // 计算最近7天的笔记数
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentNotesResult = await db('user_notes')
        .where({ userId })
        .where('createdAt', '>=', weekAgo)
        .count('* as count')
        .first();

      const stats = {
        totalNotes: parseInt(totalNotes.count as string),
        articleNotes: 0,
        videoNotes: 0,
        manualNotes: 0,
        recentNotes: parseInt(recentNotesResult.count as string),
      };

      sourceStats.forEach((stat: any) => {
        const count = parseInt(stat.count as string);
        switch (stat.sourceType) {
          case 'article':
            stats.articleNotes = count;
            break;
          case 'video':
            stats.videoNotes = count;
            break;
          case 'manual':
            stats.manualNotes = count;
            break;
        }
      });

      return stats;
    } catch (error) {
      logger.error('获取笔记统计失败', { userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取笔记统计失败', 500);
    }
  }

  // 将数据库笔记对象映射为笔记类型
  private mapDbNoteToNote(dbNote: any): Note {
    return {
      id: dbNote.id,
      userId: dbNote.userId,
      lessonTitle: dbNote.lessonTitle,
      content: dbNote.content,
      quote: dbNote.quote,
      sourceType: dbNote.sourceType,
      sourceId: dbNote.sourceId,
      timestampDisplay: dbNote.timestampDisplay,
      createdAt: new Date(dbNote.createdAt),
      updatedAt: new Date(dbNote.updatedAt),
    };
  }
}

export default NoteService;