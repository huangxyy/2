import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class DiscussionReply extends Model {
  public id!: number;
  public discussionId!: number;
  public content!: string;
  public authorId!: number;
  public parentId?: number;
  public isAnswer!: boolean;
  public likes!: number;
  public isEdited!: boolean;
}

DiscussionReply.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    discussionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isAnswer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    likes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'discussion_replies',
    indexes: [
      {
        fields: ['discussionId'],
      },
      {
        fields: ['authorId'],
      },
      {
        fields: ['parentId'],
      },
    ],
  }
);