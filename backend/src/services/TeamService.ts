import { Team, TeamStatus } from '../models/Team';
import { TeamMember, TeamRole, MemberStatus } from '../models/TeamMember';
import { TeamInvitation, InvitationStatus } from '../models/TeamInvitation';
import { NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors';
import { generateToken } from '../utils/crypto';
import { sendEmail } from '../utils/email';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { EventEmitter } from 'events';

export class TeamService {
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  // 创建团队
  async createTeam(userId: number, data: {
    name: string;
    description?: string;
    visibility: 'public' | 'private' | 'invite_only';
    maxMembers?: number;
    settings?: any;
  }) {
    const transaction = await sequelize.transaction();

    try {
      // 创建团队
      const team = await Team.create({
        ...data,
        createdBy: userId,
        updatedBy: userId,
      }, { transaction });

      // 添加创建者为团队所有者
      await TeamMember.create({
        teamId: team.id,
        userId: userId,
        role: TeamRole.OWNER,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date(),
        permissions: ['*'], // 所有者拥有所有权限
      }, { transaction });

      await transaction.commit();

      this.eventEmitter.emit('team:created', { team, userId });
      return team;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // 更新团队信息
  async updateTeam(teamId: number, userId: number, data: Partial<Team>) {
    const team = await Team.findByPk(teamId);
    if (!team) throw new NotFoundError('Team not found');

    // 验证权限
    await this.validateTeamPermission(teamId, userId, ['manage_team']);

    const updatedTeam = await team.update({
      ...data,
      updatedBy: userId,
    });

    this.eventEmitter.emit('team:updated', { team: updatedTeam, userId });
    return updatedTeam;
  }

  // 邀请成员
  async inviteMember(teamId: number, inviterId: number, data: {
    email: string;
    role?: TeamRole;
  }) {
    // 验证权限
    await this.validateTeamPermission(teamId, inviterId, ['invite_members']);

    // 检查团队成员数量限制
    const memberCount = await TeamMember.count({ where: { teamId } });
    const team = await Team.findByPk(teamId);
    if (memberCount >= team!.maxMembers) {
      throw new ValidationError('Team has reached maximum member limit');
    }

    // 创建邀请
    const invitation = await TeamInvitation.create({
      teamId,
      email: data.email,
      invitedBy: inviterId,
      token: generateToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
      role: data.role || TeamRole.MEMBER,
    });

    // 发送邀请邮件
    await this.sendInvitationEmail(invitation);

    this.eventEmitter.emit('team:member_invited', { 
      teamId,
      invitation,
      inviterId 
    });
    
    return invitation;
  }

  // 接受邀请
  async acceptInvitation(token: string, userId: number) {
    const invitation = await TeamInvitation.findOne({
      where: {
        token,
        status: InvitationStatus.PENDING,
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!invitation) {
      throw new ValidationError('Invalid or expired invitation');
    }

    const transaction = await sequelize.transaction();

    try {
      // 更新邀请状态
      await invitation.update({
        status: InvitationStatus.ACCEPTED,
      }, { transaction });

      // 创建团队成员
      const member = await TeamMember.create({
        teamId: invitation.teamId,
        userId,
        role: invitation.role as TeamRole,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date(),
        invitedBy: invitation.invitedBy,
      }, { transaction });

      await transaction.commit();

      this.eventEmitter.emit('team:member_joined', {
        teamId: invitation.teamId,
        userId,
        member,
      });

      return member;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // 更改成员角色
  async updateMemberRole(teamId: number, adminId: number, userId: number, newRole: TeamRole) {
    // 验证权限
    await this.validateTeamPermission(teamId, adminId, ['manage_roles']);

    const member = await TeamMember.findOne({
      where: { teamId, userId },
    });

    if (!member) throw new NotFoundError('Member not found');

    // 不能更改所有者的角色
    if (member.role === TeamRole.OWNER) {
      throw new ValidationError('Cannot change owner\'s role');
    }

    await member.update({ role: newRole });

    this.eventEmitter.emit('team:member_role_updated', {
      teamId,
      userId,
      newRole,
      updatedBy: adminId,
    });

    return member;
  }

  // 移除成员
  async removeMember(teamId: number, adminId: number, userId: number) {
    // 验证权限
    await this.validateTeamPermission(teamId, adminId, ['manage_members']);

    const member = await TeamMember.findOne({
      where: { teamId, userId },
    });

    if (!member) throw new NotFoundError('Member not found');

    // 不能移除所有者
    if (member.role === TeamRole.OWNER) {
      throw new ValidationError('Cannot remove team owner');
    }

    await member.destroy();

    this.eventEmitter.emit('team:member_removed', {
      teamId,
      userId,
      removedBy: adminId,
    });
  }

  // 验证团队权限
  private async validateTeamPermission(teamId: number, userId: number, requiredPermissions: string[]) {
    const member = await TeamMember.findOne({
      where: {
        teamId,
        userId,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!member) {
      throw new UnauthorizedError('Not a team member');
    }

    // 所有者和管理员拥有所有权限
    if (member.role === TeamRole.OWNER || member.role === TeamRole.ADMIN) {
      return true;
    }

    // 检查是否具有所有required permissions
    const hasPermissions = requiredPermissions.every(
      permission => member.permissions.includes(permission)
    );

    if (!hasPermissions) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    return true;
  }

  // 发送邀请邮件
  private async sendInvitationEmail(invitation: TeamInvitation) {
    const team = await Team.findByPk(invitation.teamId);
    const inviter = await TeamMember.findOne({
      where: { userId: invitation.invitedBy },
    });

    await sendEmail({
      to: invitation.email,
      subject: `邀请加入团队 ${team!.name}`,
      template: 'team-invitation',
      context: {
        teamName: team!.name,
        inviterName: inviter!.userId, // 这里应该关联用户表获取用户名
        acceptUrl: `${process.env.APP_URL}/teams/join/${invitation.token}`,
        expiresAt: invitation.expiresAt,
      },
    });
  }
}