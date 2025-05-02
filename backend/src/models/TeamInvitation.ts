import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export class TeamInvitation extends Model {
  public id!: number;
  public teamId!: number;
  public email!: string;
  public invitedBy!: number;
  public status!: InvitationStatus;
  public token!: string;
  public expiresAt!: Date;
  public role!: string;
}

TeamInvitation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(InvitationStatus)),
      allowNull: false,
      defaultValue: InvitationStatus.PENDING,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'member',
    },
  },
  {
    sequelize,
    tableName: 'team_invitations',
    indexes: [
      {
        fields: ['token'],
        unique: true,
      },
      {
        fields: ['email', 'teamId', 'status'],
      },
    ],
  }
);