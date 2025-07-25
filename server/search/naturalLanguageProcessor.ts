import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProcessedQuery {
  intent: string;
  keywords: string[];
  entityTypes: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  filters: Record<string, any>;
  parameters: Record<string, any>;
  confidence: number;
}

class NaturalLanguageProcessor {
  /**
   * Process natural language query using OpenAI to extract intent and entities
   */
  async processQuery(query: string, userId: number, projectId?: number): Promise<ProcessedQuery> {
    try {
      const systemPrompt = `You are an AI assistant that helps parse natural language queries for a theater production management system called BackstageOS.

The system manages:
- EVENTS: Rehearsals, performances, meetings, tech rehearsals, dress rehearsals
- CONTACTS: Cast members, crew, creative team, theater staff, vendors
- REPORTS: Rehearsal reports, tech reports, performance reports, meeting notes
- PROPS: Stage props, consumables, character-specific items
- COSTUMES: Character costumes, quick changes, alterations
- SCRIPTS: Script content, cues, versions, annotations
- EMAILS: Communications between team members
- NOTES: General notes, production documentation

Parse the user's query and return a JSON object with:
- intent: The main goal (search, count, filter, schedule, status, etc.)
- keywords: Important search terms extracted from the query
- entityTypes: Array of relevant entity types to search
- dateRange: If mentioned, extract start/end dates in ISO format
- filters: Any specific filters mentioned (status, type, person, etc.)
- parameters: Additional query parameters (limit, sort, etc.)
- confidence: How confident you are in the parsing (0-1)

Examples:
"How many rehearsals have we had?" -> {"intent": "count", "keywords": ["rehearsals"], "entityTypes": ["event"], "filters": {"eventType": "rehearsal"}, "confidence": 0.9}

"When is John available on Tuesday?" -> {"intent": "availability", "keywords": ["John", "Tuesday"], "entityTypes": ["contact"], "dateRange": {"start": "next-tuesday"}, "confidence": 0.8}

"What props do we need for Act 2?" -> {"intent": "search", "keywords": ["props", "Act 2"], "entityTypes": ["prop"], "filters": {"act": "2"}, "confidence": 0.9}

"Show me this week's schedule" -> {"intent": "schedule", "keywords": ["schedule", "this week"], "entityTypes": ["event"], "dateRange": {"start": "this-week-start", "end": "this-week-end"}, "confidence": 0.95}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      let parsedQuery: ProcessedQuery;
      try {
        parsedQuery = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', content);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Post-process the parsed query
      parsedQuery = await this.postProcessQuery(parsedQuery, query);
      
      return parsedQuery;

    } catch (error) {
      console.error('Error processing natural language query:', error);
      
      // Fallback to basic keyword extraction
      return this.fallbackProcessing(query);
    }
  }

  /**
   * Post-process the parsed query to normalize and enhance it
   */
  private async postProcessQuery(parsedQuery: ProcessedQuery, originalQuery: string): Promise<ProcessedQuery> {
    // Normalize date ranges
    if (parsedQuery.dateRange) {
      parsedQuery.dateRange = this.normalizeDateRange(parsedQuery.dateRange);
    }

    // Ensure entity types are valid
    const validEntityTypes = ['event', 'contact', 'report', 'prop', 'costume', 'script', 'email', 'note', 'document'];
    parsedQuery.entityTypes = parsedQuery.entityTypes.filter(type => validEntityTypes.includes(type));
    
    // If no entity types specified, include all relevant ones based on keywords
    if (parsedQuery.entityTypes.length === 0) {
      parsedQuery.entityTypes = this.inferEntityTypes(parsedQuery.keywords);
    }

    // Enhance keywords with synonyms and variations
    parsedQuery.keywords = this.enhanceKeywords(parsedQuery.keywords);

    return parsedQuery;
  }

  /**
   * Normalize date range expressions to actual dates
   */
  private normalizeDateRange(dateRange: { start?: string; end?: string }): { start?: string; end?: string } {
    const now = new Date();
    const normalized: { start?: string; end?: string } = {};

    if (dateRange.start) {
      switch (dateRange.start.toLowerCase()) {
        case 'today':
          normalized.start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'tomorrow':
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          normalized.start = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'this-week-start':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          normalized.start = new Date(weekStart.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'this-month-start':
          normalized.start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          break;
        case 'next-tuesday':
          const nextTuesday = new Date(now);
          const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
          nextTuesday.setDate(now.getDate() + daysUntilTuesday);
          normalized.start = new Date(nextTuesday.setHours(0, 0, 0, 0)).toISOString();
          break;
        default:
          // Try to parse as ISO date
          try {
            normalized.start = new Date(dateRange.start).toISOString();
          } catch {
            // If parsing fails, use original value
            normalized.start = dateRange.start;
          }
      }
    }

    if (dateRange.end) {
      switch (dateRange.end.toLowerCase()) {
        case 'today':
          normalized.end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
          break;
        case 'this-week-end':
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() + (6 - now.getDay()));
          normalized.end = new Date(weekEnd.setHours(23, 59, 59, 999)).toISOString();
          break;
        case 'this-month-end':
          normalized.end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
          break;
        default:
          try {
            normalized.end = new Date(dateRange.end).toISOString();
          } catch {
            normalized.end = dateRange.end;
          }
      }
    }

    return normalized;
  }

  /**
   * Infer entity types based on keywords
   */
  private inferEntityTypes(keywords: string[]): string[] {
    const entityMap: Record<string, string[]> = {
      event: ['rehearsal', 'performance', 'meeting', 'tech', 'dress', 'preview', 'opening', 'schedule', 'calendar'],
      contact: ['cast', 'crew', 'actor', 'director', 'designer', 'person', 'people', 'team', 'member'],
      report: ['report', 'notes', 'meeting', 'tech', 'rehearsal', 'performance'],
      prop: ['prop', 'props', 'item', 'object', 'furniture', 'weapon'],
      costume: ['costume', 'costumes', 'wardrobe', 'outfit', 'dress', 'clothing'],
      script: ['script', 'lines', 'dialogue', 'cue', 'cues', 'scene', 'act'],
      email: ['email', 'message', 'communication', 'conversation'],
      note: ['note', 'notes', 'documentation', 'memo'],
    };

    const inferredTypes = new Set<string>();
    const keywordStr = keywords.join(' ').toLowerCase();

    for (const [entityType, entityKeywords] of Object.entries(entityMap)) {
      if (entityKeywords.some(keyword => keywordStr.includes(keyword))) {
        inferredTypes.add(entityType);
      }
    }

    return Array.from(inferredTypes);
  }

  /**
   * Enhance keywords with synonyms and variations
   */
  private enhanceKeywords(keywords: string[]): string[] {
    const synonymMap: Record<string, string[]> = {
      'rehearsal': ['rehearse', 'practice', 'run-through'],
      'performance': ['show', 'performance', 'production'],
      'tech': ['technical', 'tech rehearsal', 'technical rehearsal'],
      'dress': ['dress rehearsal', 'full dress'],
      'cast': ['actors', 'performers', 'talent'],
      'crew': ['staff', 'technicians', 'workers'],
      'props': ['properties', 'items', 'objects'],
      'costumes': ['wardrobe', 'clothing', 'outfits'],
      'script': ['text', 'dialogue', 'lines'],
    };

    const enhanced = new Set(keywords);

    keywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      if (synonymMap[lowerKeyword]) {
        synonymMap[lowerKeyword].forEach(synonym => enhanced.add(synonym));
      }
    });

    return Array.from(enhanced);
  }

  /**
   * Fallback processing when OpenAI fails
   */
  private fallbackProcessing(query: string): ProcessedQuery {
    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));

    const entityTypes = this.inferEntityTypes(keywords);

    return {
      intent: 'search',
      keywords,
      entityTypes: entityTypes.length > 0 ? entityTypes : ['event', 'contact', 'report', 'prop', 'costume', 'script', 'email', 'note'],
      filters: {},
      parameters: {},
      confidence: 0.3, // Low confidence for fallback
    };
  }

  /**
   * Generate contextual suggestions based on user's query pattern
   */
  async generateSuggestions(partialQuery: string, userId: number, projectId?: number): Promise<string[]> {
    if (partialQuery.length < 3) {
      return [
        "When is our next rehearsal?",
        "Who plays the lead role?",
        "What props do we need for Act 2?",
        "Show me this week's schedule",
        "Which costumes need alterations?",
      ];
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are helping users complete their search queries for a theater production management system. Suggest 5 relevant completions for their partial query. Focus on common theater production questions about schedules, cast, crew, props, costumes, scripts, and reports.'
          },
          {
            role: 'user',
            content: `Complete this query: "${partialQuery}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const suggestions = response.choices[0]?.message?.content
        ?.split('\n')
        .map(s => s.replace(/^\d+\.\s*/, '').trim())
        .filter(s => s.length > 0)
        .slice(0, 5) || [];

      return suggestions;

    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }
}

export const naturalLanguageProcessor = new NaturalLanguageProcessor();