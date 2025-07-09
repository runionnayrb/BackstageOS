import { storage } from '../storage';
import { 
  sharedInboxes, 
  sharedInboxMembers, 
  emailAssignments, 
  emailCollaborations, 
  emailArchiveRules,
  type SharedInbox,
  type SharedInboxMember,
  type EmailAssignment,
  type EmailCollaboration,
  type EmailArchiveRule,
  type InsertSharedInbox,
  type InsertSharedInboxMember,
  type InsertEmailAssignment,
  type InsertEmailCollaboration,
  type InsertEmailArchiveRule
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { cloudflareService } from './cloudflareService';

export class SharedInboxService {
  // ========== SHARED INBOX MANAGEMENT ==========

  async createSharedInbox(data: InsertSharedInbox): Promise<SharedInbox> {
    try {
      // Create email address if not provided
      if (!data.emailAddress) {
        const projectName = await this.getProjectName(data.projectId);
        const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
        data.emailAddress = `${cleanName}@backstageos.com`;
      }

      // Create shared inbox in database
      const result = await storage.getDb()
        .insert(sharedInboxes)
        .values(data)
        .returning();

      const sharedInbox = result[0];

      // Create email routing in Cloudflare
      await this.createEmailRouting(sharedInbox.emailAddress, data.projectId);

      return sharedInbox;
    } catch (error) {
      console.error('Error creating shared inbox:', error);
      throw new Error('Failed to create shared inbox');
    }
  }

  async getProjectSharedInboxes(projectId: number): Promise<SharedInbox[]> {
    try {
      return await storage.getDb()
        .select()
        .from(sharedInboxes)
        .where(eq(sharedInboxes.projectId, projectId))
        .orderBy(desc(sharedInboxes.createdAt));
    } catch (error) {
      console.error('Error fetching project shared inboxes:', error);
      throw new Error('Failed to fetch shared inboxes');
    }
  }

  async getSharedInboxById(inboxId: number): Promise<SharedInbox | null> {
    try {
      const result = await storage.getDb()
        .select()
        .from(sharedInboxes)
        .where(eq(sharedInboxes.id, inboxId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error fetching shared inbox:', error);
      throw new Error('Failed to fetch shared inbox');
    }
  }

  async updateSharedInbox(inboxId: number, data: Partial<InsertSharedInbox>): Promise<SharedInbox> {
    try {
      const result = await storage.getDb()
        .update(sharedInboxes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sharedInboxes.id, inboxId))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error updating shared inbox:', error);
      throw new Error('Failed to update shared inbox');
    }
  }

  async deleteSharedInbox(inboxId: number): Promise<void> {
    try {
      // Get inbox details for cleanup
      const inbox = await this.getSharedInboxById(inboxId);
      if (!inbox) {
        throw new Error('Shared inbox not found');
      }

      // Delete email routing in Cloudflare
      await this.deleteEmailRouting(inbox.emailAddress);

      // Delete shared inbox (cascade will handle members, assignments, etc.)
      await storage.getDb()
        .delete(sharedInboxes)
        .where(eq(sharedInboxes.id, inboxId));
    } catch (error) {
      console.error('Error deleting shared inbox:', error);
      throw new Error('Failed to delete shared inbox');
    }
  }

  // ========== SHARED INBOX MEMBERS ==========

  async getSharedInboxMembers(inboxId: number): Promise<SharedInboxMember[]> {
    try {
      return await storage.getDb()
        .select()
        .from(sharedInboxMembers)
        .where(eq(sharedInboxMembers.inboxId, inboxId))
        .orderBy(desc(sharedInboxMembers.joinedAt));
    } catch (error) {
      console.error('Error fetching shared inbox members:', error);
      throw new Error('Failed to fetch shared inbox members');
    }
  }

  async addSharedInboxMember(data: InsertSharedInboxMember): Promise<SharedInboxMember> {
    try {
      const result = await storage.getDb()
        .insert(sharedInboxMembers)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error adding shared inbox member:', error);
      throw new Error('Failed to add shared inbox member');
    }
  }

  async updateSharedInboxMember(memberId: number, data: Partial<InsertSharedInboxMember>): Promise<SharedInboxMember> {
    try {
      const result = await storage.getDb()
        .update(sharedInboxMembers)
        .set(data)
        .where(eq(sharedInboxMembers.id, memberId))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error updating shared inbox member:', error);
      throw new Error('Failed to update shared inbox member');
    }
  }

  async removeSharedInboxMember(memberId: number): Promise<void> {
    try {
      await storage.getDb()
        .delete(sharedInboxMembers)
        .where(eq(sharedInboxMembers.id, memberId));
    } catch (error) {
      console.error('Error removing shared inbox member:', error);
      throw new Error('Failed to remove shared inbox member');
    }
  }

  // ========== EMAIL ASSIGNMENTS ==========

  async assignEmail(data: InsertEmailAssignment): Promise<EmailAssignment> {
    try {
      const result = await storage.getDb()
        .insert(emailAssignments)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error assigning email:', error);
      throw new Error('Failed to assign email');
    }
  }

  async updateEmailAssignment(assignmentId: number, data: Partial<InsertEmailAssignment>): Promise<EmailAssignment> {
    try {
      const result = await storage.getDb()
        .update(emailAssignments)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(emailAssignments.id, assignmentId))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error updating email assignment:', error);
      throw new Error('Failed to update email assignment');
    }
  }

  async getUserEmailAssignments(userId: number): Promise<EmailAssignment[]> {
    try {
      return await storage.getDb()
        .select()
        .from(emailAssignments)
        .where(eq(emailAssignments.assignedTo, userId))
        .orderBy(desc(emailAssignments.assignedAt));
    } catch (error) {
      console.error('Error fetching user email assignments:', error);
      throw new Error('Failed to fetch email assignments');
    }
  }

  // ========== EMAIL COLLABORATIONS ==========

  async addThreadCollaborator(data: InsertEmailCollaboration): Promise<EmailCollaboration> {
    try {
      const result = await storage.getDb()
        .insert(emailCollaborations)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error adding thread collaborator:', error);
      throw new Error('Failed to add thread collaborator');
    }
  }

  async getThreadCollaborators(threadId: number): Promise<EmailCollaboration[]> {
    try {
      return await storage.getDb()
        .select()
        .from(emailCollaborations)
        .where(eq(emailCollaborations.threadId, threadId))
        .orderBy(desc(emailCollaborations.joinedAt));
    } catch (error) {
      console.error('Error fetching thread collaborators:', error);
      throw new Error('Failed to fetch thread collaborators');
    }
  }

  // ========== EMAIL ARCHIVE RULES ==========

  async createArchiveRule(data: InsertEmailArchiveRule): Promise<EmailArchiveRule> {
    try {
      const result = await storage.getDb()
        .insert(emailArchiveRules)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating archive rule:', error);
      throw new Error('Failed to create archive rule');
    }
  }

  async getProjectArchiveRules(projectId: number): Promise<EmailArchiveRule[]> {
    try {
      return await storage.getDb()
        .select()
        .from(emailArchiveRules)
        .where(eq(emailArchiveRules.projectId, projectId))
        .orderBy(desc(emailArchiveRules.createdAt));
    } catch (error) {
      console.error('Error fetching project archive rules:', error);
      throw new Error('Failed to fetch archive rules');
    }
  }

  async executeArchiveRule(ruleId: number): Promise<{ success: boolean; message: string; archivedCount?: number }> {
    try {
      const rule = await storage.getDb()
        .select()
        .from(emailArchiveRules)
        .where(eq(emailArchiveRules.id, ruleId))
        .limit(1);

      if (!rule[0]) {
        throw new Error('Archive rule not found');
      }

      const archiveRule = rule[0];

      // Execute archive action based on rule type
      let archivedCount = 0;
      
      switch (archiveRule.archiveAction) {
        case 'archive':
          archivedCount = await this.archiveProjectEmails(archiveRule.projectId);
          break;
        case 'delete':
          archivedCount = await this.deleteProjectEmails(archiveRule.projectId);
          break;
        case 'export':
          archivedCount = await this.exportProjectEmails(archiveRule.projectId, archiveRule.exportFormat || 'pdf');
          break;
        default:
          throw new Error('Unknown archive action');
      }

      // Update rule execution timestamp
      await storage.getDb()
        .update(emailArchiveRules)
        .set({ 
          lastExecuted: new Date(),
          updatedAt: new Date()
        })
        .where(eq(emailArchiveRules.id, ruleId));

      return {
        success: true,
        message: `Archive rule executed successfully. ${archivedCount} emails processed.`,
        archivedCount
      };
    } catch (error) {
      console.error('Error executing archive rule:', error);
      throw new Error('Failed to execute archive rule');
    }
  }

  // ========== HELPER METHODS ==========

  private async getProjectName(projectId: number): Promise<string> {
    try {
      const projects = await storage.getProjects();
      const project = projects.find(p => p.id === projectId);
      return project?.name || 'project';
    } catch (error) {
      console.error('Error fetching project name:', error);
      return 'project';
    }
  }

  private async createEmailRouting(emailAddress: string, projectId: number): Promise<void> {
    try {
      // Create email routing rule in Cloudflare
      await cloudflareService.createEmailRule(emailAddress, `shared-inbox-${projectId}@backstageos.com`);
    } catch (error) {
      console.error('Error creating email routing:', error);
      // Don't throw error for routing issues - shared inbox can still function
    }
  }

  private async deleteEmailRouting(emailAddress: string): Promise<void> {
    try {
      // Delete email routing rule in Cloudflare
      await cloudflareService.deleteEmailRule(emailAddress);
    } catch (error) {
      console.error('Error deleting email routing:', error);
      // Don't throw error for routing cleanup issues
    }
  }

  private async archiveProjectEmails(projectId: number): Promise<number> {
    try {
      // Implementation would mark emails as archived
      // For now, return 0 as placeholder
      return 0;
    } catch (error) {
      console.error('Error archiving project emails:', error);
      throw new Error('Failed to archive project emails');
    }
  }

  private async deleteProjectEmails(projectId: number): Promise<number> {
    try {
      // Implementation would delete emails after backup
      // For now, return 0 as placeholder
      return 0;
    } catch (error) {
      console.error('Error deleting project emails:', error);
      throw new Error('Failed to delete project emails');
    }
  }

  private async exportProjectEmails(projectId: number, format: string): Promise<number> {
    try {
      // Implementation would export emails to specified format
      // For now, return 0 as placeholder
      return 0;
    } catch (error) {
      console.error('Error exporting project emails:', error);
      throw new Error('Failed to export project emails');
    }
  }
}