import { db } from '../db';
import { 
  searchIndexes, 
  searchHistory, 
  scheduleEvents, 
  contacts, 
  reports, 
  props, 
  costumes, 
  scripts, 
  emailThreads, 
  emailMessages,
  emailAccounts,
  notes,
  projects,
  users
} from '../../shared/schema';
import { eq, and, or, ilike, desc, sql, inArray } from 'drizzle-orm';
import { naturalLanguageProcessor } from './naturalLanguageProcessor';
import { resultRanker } from './resultRanker';

export interface SearchQuery {
  query?: string;
  filters?: {
    type?: string;
    key: string;
    value: string | string[] | { start?: string; end?: string };
    label: string;
  }[];
  userId: number;
  projectId?: number;
}

export interface SearchResult {
  id: string;
  type: 'event' | 'contact' | 'report' | 'prop' | 'costume' | 'script' | 'email' | 'note' | 'document';
  title: string;
  description: string;
  projectId?: number;
  projectName?: string;
  date?: string;
  relevanceScore: number;
  metadata: Record<string, any>;
  url: string;
}

class SearchEngine {
  /**
   * Performs natural language search across all production data
   */
  async performNaturalLanguageSearch({ query, filters = [], userId, projectId }: SearchQuery): Promise<{ results: SearchResult[]; processedQuery: any }> {
    if (!query?.trim()) {
      return { results: [], processedQuery: null };
    }

    const startTime = Date.now();
    
    try {
      // Process natural language query with OpenAI
      const processedQuery = await naturalLanguageProcessor.processQuery(query, userId, projectId);
      
      // Execute searches based on processed query
      const searchResults = await this.executeMultiTableSearch(processedQuery, filters, userId, projectId);
      
      // Rank and deduplicate results
      const rankedResults = await resultRanker.rankResults(searchResults, query, processedQuery);
      
      // Record search in history
      const responseTime = Date.now() - startTime;
      await this.recordSearchHistory(userId, query, 'natural', filters, rankedResults.length, responseTime);
      
      return { 
        results: rankedResults.slice(0, 50), // Limit to top 50 results
        processedQuery 
      };
      
    } catch (error) {
      console.error('Natural language search error:', error);
      // Fallback to basic text search
      return this.performBasicTextSearch({ query, filters, userId, projectId });
    }
  }

  /**
   * Performs advanced filtered search
   */
  async performAdvancedSearch({ filters = [], userId, projectId }: SearchQuery): Promise<{ results: SearchResult[] }> {
    const startTime = Date.now();
    
    try {
      const searchResults = await this.executeFilteredSearch(filters, userId, projectId);
      const rankedResults = await resultRanker.rankResults(searchResults, '', null);
      
      const responseTime = Date.now() - startTime;
      await this.recordSearchHistory(userId, '', 'advanced', filters, rankedResults.length, responseTime);
      
      return { results: rankedResults.slice(0, 50) };
      
    } catch (error) {
      console.error('Advanced search error:', error);
      return { results: [] };
    }
  }

  /**
   * Execute search across multiple tables based on processed query
   */
  private async executeMultiTableSearch(processedQuery: any, filters: any[], userId: number, projectId?: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchQueries: Promise<SearchResult[]>[] = [];

    // Determine which entity types to search based on query intent
    const entityTypes = processedQuery.entityTypes || ['event', 'contact', 'report', 'prop', 'costume', 'script', 'email', 'note'];

    // Build project filter
    const projectFilter = projectId ? eq(scheduleEvents.projectId, projectId) : undefined;

    if (entityTypes.includes('event')) {
      searchQueries.push(this.searchEvents(processedQuery, filters, projectFilter));
    }
    
    if (entityTypes.includes('contact')) {
      searchQueries.push(this.searchContacts(processedQuery, filters, projectFilter));
    }
    
    if (entityTypes.includes('report')) {
      searchQueries.push(this.searchReports(processedQuery, filters, projectFilter));
    }
    
    if (entityTypes.includes('prop')) {
      searchQueries.push(this.searchProps(processedQuery, filters, projectFilter));
    }
    
    if (entityTypes.includes('costume')) {
      searchQueries.push(this.searchCostumes(processedQuery, filters, projectFilter));
    }
    
    if (entityTypes.includes('script')) {
      searchQueries.push(this.searchScripts(processedQuery, filters, projectFilter));
    }
    
    if (entityTypes.includes('email')) {
      searchQueries.push(this.searchEmails(processedQuery, filters, userId));
    }
    
    if (entityTypes.includes('note')) {
      searchQueries.push(this.searchNotes(processedQuery, filters, projectFilter));
    }

    // Execute all searches in parallel
    const searchResultArrays = await Promise.all(searchQueries);
    
    // Flatten results
    searchResultArrays.forEach(resultArray => {
      results.push(...resultArray);
    });

    return results;
  }

  /**
   * Search calendar events
   */
  private async searchEvents(processedQuery: any, filters: any[], projectFilter?: any): Promise<SearchResult[]> {
    try {
      const conditions = [projectFilter].filter(Boolean);
      
      // Add text search conditions
      if (processedQuery.keywords?.length > 0) {
        const textConditions = processedQuery.keywords.map((keyword: string) => 
          or(
            ilike(scheduleEvents.title, `%${keyword}%`),
            ilike(scheduleEvents.description, `%${keyword}%`)
          )
        );
        conditions.push(or(...textConditions));
      }

      // Add date filters
      if (processedQuery.dateRange) {
        if (processedQuery.dateRange.start) {
          conditions.push(sql`${scheduleEvents.startTime} >= ${processedQuery.dateRange.start}`);
        }
        if (processedQuery.dateRange.end) {
          conditions.push(sql`${scheduleEvents.startTime} <= ${processedQuery.dateRange.end}`);
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const events = await db
        .select({
          id: scheduleEvents.id,
          title: scheduleEvents.title,
          description: scheduleEvents.description,
          startTime: scheduleEvents.startTime,
          endTime: scheduleEvents.endTime,
          projectId: scheduleEvents.projectId,
          eventType: scheduleEvents.eventType,
          status: scheduleEvents.status,
        })
        .from(scheduleEvents)
        .where(whereClause)
        .orderBy(desc(scheduleEvents.startTime))
        .limit(20);

      // Get project names
      const projectIds = [...new Set(events.map(e => e.projectId).filter(Boolean))];
      const projectData = projectIds.length > 0 ? await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds)) : [];
      
      const projectMap = new Map(projectData.map(p => [p.id, p.name]));

      return events.map(event => ({
        id: `event-${event.id}`,
        type: 'event' as const,
        title: event.title || 'Untitled Event',
        description: event.description || `${event.eventType} event${event.startTime ? ` on ${new Date(event.startTime).toLocaleDateString()}` : ''}`,
        projectId: event.projectId || undefined,
        projectName: event.projectId ? projectMap.get(event.projectId) : undefined,
        date: event.startTime || undefined,
        relevanceScore: 1.0,
        metadata: {
          eventType: event.eventType,
          status: event.status,
          startTime: event.startTime,
          endTime: event.endTime,
        },
        url: `/shows/${event.projectId}/calendar/${event.id}`,
      }));
      
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  }

  /**
   * Search contacts
   */
  private async searchContacts(processedQuery: any, filters: any[], projectFilter?: any): Promise<SearchResult[]> {
    try {
      const conditions = [projectFilter].filter(Boolean);
      
      if (processedQuery.keywords?.length > 0) {
        const textConditions = processedQuery.keywords.map((keyword: string) => 
          or(
            ilike(contacts.firstName, `%${keyword}%`),
            ilike(contacts.lastName, `%${keyword}%`),
            ilike(contacts.role, `%${keyword}%`),
            ilike(contacts.email, `%${keyword}%`)
          )
        );
        conditions.push(or(...textConditions));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const contactResults = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          role: contacts.role,
          category: contacts.category,
          projectId: contacts.projectId,
          phone: contacts.phone,
        })
        .from(contacts)
        .where(whereClause)
        .limit(20);

      // Get project names
      const projectIds = [...new Set(contactResults.map(c => c.projectId).filter(Boolean))];
      const projectData = projectIds.length > 0 ? await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds)) : [];
      
      const projectMap = new Map(projectData.map(p => [p.id, p.name]));

      return contactResults.map(contact => ({
        id: `contact-${contact.id}`,
        type: 'contact' as const,
        title: `${contact.firstName} ${contact.lastName}`,
        description: `${contact.role || contact.category} ${contact.email ? `• ${contact.email}` : ''}${contact.phone ? ` • ${contact.phone}` : ''}`,
        projectId: contact.projectId || undefined,
        projectName: contact.projectId ? projectMap.get(contact.projectId) : undefined,
        relevanceScore: 1.0,
        metadata: {
          role: contact.role,
          category: contact.category,
          email: contact.email,
          phone: contact.phone,
        },
        url: `/shows/${contact.projectId}/personnel/${contact.id}`,
      }));
      
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }

  /**
   * Search reports
   */
  private async searchReports(processedQuery: any, filters: any[], projectFilter?: any): Promise<SearchResult[]> {
    try {
      const conditions = [projectFilter].filter(Boolean);
      
      if (processedQuery.keywords?.length > 0) {
        const textConditions = processedQuery.keywords.map((keyword: string) => 
          or(
            ilike(reports.title, `%${keyword}%`),
            sql`${reports.content}::text ILIKE ${`%${keyword}%`}`
          )
        );
        conditions.push(or(...textConditions));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const reportResults = await db
        .select({
          id: reports.id,
          title: reports.title,
          type: reports.type,
          content: reports.content,
          date: reports.date,
          status: reports.status,
          projectId: reports.projectId,
        })
        .from(reports)
        .where(whereClause)
        .orderBy(desc(reports.date))
        .limit(20);

      // Get project names
      const projectIds = [...new Set(reportResults.map(r => r.projectId))];
      const projectData = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds));
      
      const projectMap = new Map(projectData.map(p => [p.id, p.name]));

      return reportResults.map(report => ({
        id: `report-${report.id}`,
        type: 'report' as const,
        title: report.title,
        description: `${report.type} report from ${new Date(report.date).toLocaleDateString()}`,
        projectId: report.projectId,
        projectName: projectMap.get(report.projectId),
        date: report.date,
        relevanceScore: 1.0,
        metadata: {
          type: report.type,
          status: report.status,
        },
        url: `/shows/${report.projectId}/reports/${report.id}`,
      }));
      
    } catch (error) {
      console.error('Error searching reports:', error);
      return [];
    }
  }

  /**
   * Search props
   */
  private async searchProps(processedQuery: any, filters: any[], projectFilter?: any): Promise<SearchResult[]> {
    try {
      const conditions = [projectFilter].filter(Boolean);
      
      if (processedQuery.keywords?.length > 0) {
        const textConditions = processedQuery.keywords.map((keyword: string) => 
          or(
            ilike(props.name, `%${keyword}%`),
            ilike(props.description, `%${keyword}%`),
            ilike(props.character, `%${keyword}%`)
          )
        );
        conditions.push(or(...textConditions));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const propResults = await db
        .select({
          id: props.id,
          name: props.name,
          description: props.description,
          character: props.character,
          act: props.act,
          scene: props.scene,
          status: props.status,
          projectId: props.projectId,
        })
        .from(props)
        .where(whereClause)
        .limit(20);

      // Get project names
      const projectIds = [...new Set(propResults.map(p => p.projectId))];
      const projectData = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds));
      
      const projectMap = new Map(projectData.map(p => [p.id, p.name]));

      return propResults.map(prop => ({
        id: `prop-${prop.id}`,
        type: 'prop' as const,
        title: prop.name,
        description: `${prop.description || 'Prop'}${prop.character ? ` for ${prop.character}` : ''}${prop.act && prop.scene ? ` (Act ${prop.act}, Scene ${prop.scene})` : ''}`,
        projectId: prop.projectId,
        projectName: projectMap.get(prop.projectId),
        relevanceScore: 1.0,
        metadata: {
          character: prop.character,
          act: prop.act,
          scene: prop.scene,
          status: prop.status,
        },
        url: `/shows/${prop.projectId}/props/${prop.id}`,
      }));
      
    } catch (error) {
      console.error('Error searching props:', error);
      return [];
    }
  }

  /**
   * Search costumes
   */
  private async searchCostumes(processedQuery: any, filters: any[], projectFilter?: any): Promise<SearchResult[]> {
    try {
      const conditions = [projectFilter].filter(Boolean);
      
      if (processedQuery.keywords?.length > 0) {
        const textConditions = processedQuery.keywords.map((keyword: string) => 
          or(
            ilike(costumes.character, `%${keyword}%`),
            ilike(costumes.piece, `%${keyword}%`),
            ilike(costumes.notes, `%${keyword}%`)
          )
        );
        conditions.push(or(...textConditions));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const costumeResults = await db
        .select({
          id: costumes.id,
          character: costumes.character,
          piece: costumes.piece,
          scene: costumes.scene,
          status: costumes.status,
          notes: costumes.notes,
          projectId: costumes.projectId,
        })
        .from(costumes)
        .where(whereClause)
        .limit(20);

      // Get project names
      const projectIds = [...new Set(costumeResults.map(c => c.projectId))];
      const projectData = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds));
      
      const projectMap = new Map(projectData.map(p => [p.id, p.name]));

      return costumeResults.map(costume => ({
        id: `costume-${costume.id}`,
        type: 'costume' as const,
        title: `${costume.piece} - ${costume.character}`,
        description: `${costume.piece} for ${costume.character}${costume.scene ? ` in ${costume.scene}` : ''}${costume.notes ? ` • ${costume.notes}` : ''}`,
        projectId: costume.projectId,
        projectName: projectMap.get(costume.projectId),
        relevanceScore: 1.0,
        metadata: {
          character: costume.character,
          scene: costume.scene,
          status: costume.status,
        },
        url: `/shows/${costume.projectId}/costumes/${costume.id}`,
      }));
      
    } catch (error) {
      console.error('Error searching costumes:', error);
      return [];
    }
  }

  /**
   * Search scripts
   */
  private async searchScripts(processedQuery: any, filters: any[], projectFilter?: any): Promise<SearchResult[]> {
    try {
      const conditions = [projectFilter].filter(Boolean);
      
      if (processedQuery.keywords?.length > 0) {
        const textConditions = processedQuery.keywords.map((keyword: string) => 
          or(
            ilike(scripts.title, `%${keyword}%`),
            sql`${scripts.content}::text ILIKE ${`%${keyword}%`}`
          )
        );
        conditions.push(or(...textConditions));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const scriptResults = await db
        .select({
          id: scripts.id,
          title: scripts.title,
          version: scripts.version,
          status: scripts.status,
          projectId: scripts.projectId,
        })
        .from(scripts)
        .where(whereClause)
        .limit(20);

      // Get project names
      const projectIds = [...new Set(scriptResults.map(s => s.projectId))];
      const projectData = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds));
      
      const projectMap = new Map(projectData.map(p => [p.id, p.name]));

      return scriptResults.map(script => ({
        id: `script-${script.id}`,
        type: 'script' as const,
        title: script.title,
        description: `Script version ${script.version} (${script.status})`,
        projectId: script.projectId,
        projectName: projectMap.get(script.projectId),
        relevanceScore: 1.0,
        metadata: {
          version: script.version,
          status: script.status,
        },
        url: `/shows/${script.projectId}/script/${script.id}`,
      }));
      
    } catch (error) {
      console.error('Error searching scripts:', error);
      return [];
    }
  }

  /**
   * Search emails
   */
  private async searchEmails(processedQuery: any, filters: any[], userId: number): Promise<SearchResult[]> {
    try {
      console.log('🔍 Starting email search for userId:', userId, 'keywords:', processedQuery.keywords);
      
      // First get user's email accounts
      const userAccounts = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, userId));
      
      console.log('🔍 Found email accounts:', userAccounts.length);
      
      if (userAccounts.length === 0) {
        return []; // No email accounts for this user
      }
      
      const accountIds = userAccounts.map(acc => acc.id);
      const conditions = [inArray(emailThreads.accountId, accountIds)];
      
      if (processedQuery.keywords?.length > 0) {
        const textConditions = processedQuery.keywords.map((keyword: string) => 
          or(
            ilike(emailThreads.subject, `%${keyword}%`),
            sql`EXISTS (
              SELECT 1 FROM ${emailMessages} em 
              WHERE em.thread_id = ${emailThreads.id} 
              AND (em.content ILIKE ${`%${keyword}%`} OR em.from_address ILIKE ${`%${keyword}%`})
            )`
          )
        );
        conditions.push(or(...textConditions));
      }

      const whereClause = and(...conditions);
      
      const emailResults = await db
        .select({
          id: emailThreads.id,
          subject: emailThreads.subject,
          messageCount: emailThreads.messageCount,
          lastMessageAt: emailThreads.lastMessageAt,
          isRead: emailThreads.isRead,
          projectId: emailThreads.projectId,
        })
        .from(emailThreads)
        .where(whereClause)
        .orderBy(desc(emailThreads.lastMessageAt))
        .limit(20);

      console.log('🔍 Email search results found:', emailResults.length);

      // Get project names
      const projectIds = [...new Set(emailResults.map(e => e.projectId).filter(Boolean))];
      const projectData = projectIds.length > 0 ? await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds)) : [];
      
      const projectMap = new Map(projectData.map(p => [p.id, p.name]));

      return emailResults.map(email => ({
        id: `email-${email.id}`,
        type: 'email' as const,
        title: email.subject || 'No Subject',
        description: `Email conversation with ${email.messageCount} messages`,
        projectId: email.projectId || undefined,
        projectName: email.projectId ? projectMap.get(email.projectId) : undefined,
        date: email.lastMessageAt || undefined,
        relevanceScore: 1.0,
        metadata: {
          messageCount: email.messageCount,
          isRead: email.isRead,
        },
        url: `/email/thread/${email.id}`,
      }));
      
    } catch (error) {
      console.error('Error searching emails:', error);
      return [];
    }
  }

  /**
   * Search notes
   */
  private async searchNotes(processedQuery: any, filters: any[], projectFilter?: any): Promise<SearchResult[]> {
    try {
      const conditions = [projectFilter].filter(Boolean);
      
      if (processedQuery.keywords?.length > 0) {
        const textConditions = processedQuery.keywords.map((keyword: string) => 
          or(
            ilike(notes.title, `%${keyword}%`),
            sql`${notes.content}::text ILIKE ${`%${keyword}%`}`
          )
        );
        conditions.push(or(...textConditions));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const noteResults = await db
        .select({
          id: notes.id,
          title: notes.title,
          content: notes.content,
          projectId: notes.projectId,
          createdAt: notes.createdAt,
        })
        .from(notes)
        .where(whereClause)
        .orderBy(desc(notes.createdAt))
        .limit(20);

      // Get project names
      const projectIds = [...new Set(noteResults.map(n => n.projectId).filter(Boolean))];
      const projectData = projectIds.length > 0 ? await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds)) : [];
      
      const projectMap = new Map(projectData.map(p => [p.id, p.name]));

      return noteResults.map(note => ({
        id: `note-${note.id}`,
        type: 'note' as const,
        title: note.title || 'Untitled Note',
        description: typeof note.content === 'string' ? 
          note.content.substring(0, 200) + (note.content.length > 200 ? '...' : '') :
          'Note content',
        projectId: note.projectId || undefined,
        projectName: note.projectId ? projectMap.get(note.projectId) : undefined,
        date: note.createdAt || undefined,
        relevanceScore: 1.0,
        metadata: {},
        url: `/notes/${note.id}`,
      }));
      
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  /**
   * Fallback basic text search
   */
  private async performBasicTextSearch({ query, filters, userId, projectId }: SearchQuery): Promise<{ results: SearchResult[]; processedQuery: null }> {
    if (!query?.trim()) {
      return { results: [], processedQuery: null };
    }

    const keywords = query.trim().split(' ').filter(word => word.length > 2);
    const mockProcessedQuery = { keywords, entityTypes: ['event', 'contact', 'report', 'prop', 'costume', 'script', 'email', 'note'] };
    
    const results = await this.executeMultiTableSearch(mockProcessedQuery, filters, userId, projectId);
    return { results: results.slice(0, 20), processedQuery: null };
  }

  /**
   * Execute filtered search without natural language processing
   */
  private async executeFilteredSearch(filters: any[], userId: number, projectId?: number): Promise<SearchResult[]> {
    // This would implement advanced filtering logic
    // For now, return empty results - this can be expanded later
    return [];
  }

  /**
   * Record search in history for analytics
   */
  private async recordSearchHistory(userId: number, query: string, queryType: string, filters: any[], resultCount: number, responseTime: number): Promise<void> {
    try {
      await db.insert(searchHistory).values({
        userId,
        query,
        queryType,
        filters: JSON.stringify(filters),
        resultCount,
        responseTime,
      });
    } catch (error) {
      console.error('Error recording search history:', error);
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(input: string, userId: number, projectId?: number): Promise<{ suggestions: any[] }> {
    if (input.length < 2) {
      return { suggestions: [] };
    }

    try {
      // Get recent searches from history
      const recentSearches = await db
        .select({ query: searchHistory.query })
        .from(searchHistory)
        .where(eq(searchHistory.userId, userId))
        .orderBy(desc(searchHistory.createdAt))
        .limit(3);

      const suggestions = [
        ...recentSearches.map(s => ({
          text: s.query,
          type: 'recent',
        })),
        // Add some contextual suggestions based on common queries
        { text: "When is our next rehearsal?", type: 'contextual', category: 'event' },
        { text: "Who plays the lead role?", type: 'contextual', category: 'contact' },
        { text: "What props do we need for Act 2?", type: 'contextual', category: 'prop' },
        { text: "Show me this week's schedule", type: 'contextual', category: 'event' },
      ].filter(s => s.text.toLowerCase().includes(input.toLowerCase()));

      return { suggestions };
      
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return { suggestions: [] };
    }
  }
}

export const searchEngine = new SearchEngine();

// Test the search engine directly
console.log('🔍 Search engine initialized successfully');