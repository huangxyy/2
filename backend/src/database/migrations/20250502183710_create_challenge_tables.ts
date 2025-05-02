import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // 创建挑战分类表
  await queryInterface.createTable('challenge_categories', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'challenge_categories',
        key: 'id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  // 创建挑战表
  await queryInterface.createTable('challenges', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'challenge_categories',
        key: 'id',
      },
    },
    difficulty_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    docker_image: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    flag_format: {
      type: DataTypes.STRING(255),
    },
    flag_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    time_limit: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  // 创建用户挑战记录表
  await queryInterface.createTable('user_challenges', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    challenge_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'challenges',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'in_progress',
    },
    start_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completion_time: {
      type: DataTypes.DATE,
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    points_earned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  });

  // 添加索引
  await queryInterface.addIndex('challenges', ['category_id']);
  await queryInterface.addIndex('challenges', ['author_id']);
  await queryInterface.addIndex('user_challenges', ['user_id']);
  await queryInterface.addIndex('user_challenges', ['challenge_id']);
  await queryInterface.addIndex('user_challenges', ['status']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('user_challenges');
  await queryInterface.dropTable('challenges');
  await queryInterface.dropTable('challenge_categories');
}