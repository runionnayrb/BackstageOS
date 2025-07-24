interface SearchResult {
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

class ResultRanker {
  /**
   * Rank search results based on relevance to the query
   */
  async rankResults(results: SearchResult[], originalQuery: string, processedQuery: ProcessedQuery | null): Promise<SearchResult[]> {
    if (results.length === 0) {
      return results;
    }

    // Calculate relevance scores for each result
    const scoredResults = results.map(result => ({
      ...result,
      relevanceScore: this.calculateRelevanceScore(result, originalQuery, processedQuery),
    }));

    // Sort by relevance score (descending)
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply result diversity to avoid too many results of the same type
    const diversifiedResults = this.applyResultDiversity(scoredResults);

    // Apply recency boost for time-sensitive queries
    const finalResults = this.applyRecencyBoost(diversifiedResults, processedQuery);

    return finalResults;
  }

  /**
   * Calculate relevance score for a single result
   */
  private calculateRelevanceScore(result: SearchResult, originalQuery: string, processedQuery: ProcessedQuery | null): number {
    let score = 0;

    // Base score
    score = result.relevanceScore || 1.0;

    // Title match boost
    const titleMatchScore = this.calculateTextMatchScore(result.title, originalQuery);
    score += titleMatchScore * 2.0; // Title matches are more important

    // Description match boost
    const descriptionMatchScore = this.calculateTextMatchScore(result.description, originalQuery);
    score += descriptionMatchScore * 1.0;

    // Entity type relevance boost
    if (processedQuery?.entityTypes.includes(result.type)) {
      score *= 1.5;
    }

    // Intent-specific boosts
    if (processedQuery?.intent) {
      score *= this.getIntentBoost(result, processedQuery.intent);
    }

    // Status-based boosts
    score *= this.getStatusBoost(result);

    // Date relevance boost
    score *= this.getDateRelevanceBoost(result, processedQuery);

    // Project context boost (if searching within a specific project)
    if (result.projectId && processedQuery?.parameters?.projectId === result.projectId) {
      score *= 1.3;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate text match score using basic string similarity
   */
  private calculateTextMatchScore(text: string, query: string): number {
    if (!text || !query) return 0;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

    let matchScore = 0;
    let totalWords = queryWords.length;

    queryWords.forEach(word => {
      if (textLower.includes(word)) {
        // Exact match
        matchScore += 1.0;
      } else {
        // Partial match
        const partialMatch = this.calculatePartialMatch(textLower, word);
        matchScore += partialMatch * 0.5;
      }
    });

    return totalWords > 0 ? matchScore / totalWords : 0;
  }

  /**
   * Calculate partial string match using simple character overlap
   */
  private calculatePartialMatch(text: string, word: string): number {
    if (word.length < 3) return 0;

    let maxMatch = 0;
    for (let i = 0; i <= text.length - word.length; i++) {
      const substring = text.substring(i, i + word.length);
      const matchChars = this.countMatchingChars(substring, word);
      const matchRatio = matchChars / word.length;
      maxMatch = Math.max(maxMatch, matchRatio);
    }

    return maxMatch > 0.7 ? maxMatch : 0; // Only consider good partial matches
  }

  /**
   * Count matching characters between two strings
   */
  private countMatchingChars(str1: string, str2: string): number {
    let matches = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) {
        matches++;
      }
    }
    
    return matches;
  }

  /**
   * Get intent-specific boost factor
   */
  private getIntentBoost(result: SearchResult, intent: string): number {
    switch (intent) {
      case 'count':
        // For count queries, prioritize results that can be counted
        return result.type === 'event' ? 1.5 : 1.0;
      
      case 'schedule':
        // For schedule queries, prioritize events
        return result.type === 'event' ? 2.0 : 0.5;
      
      case 'availability':
        // For availability queries, prioritize contacts and events
        return ['contact', 'event'].includes(result.type) ? 1.8 : 0.8;
      
      case 'status':
        // For status queries, prioritize items with status metadata
        return result.metadata.status ? 1.6 : 1.0;
      
      case 'search':
      default:
        return 1.0;
    }
  }

  /**
   * Get status-based boost factor
   */
  private getStatusBoost(result: SearchResult): number {
    const status = result.metadata.status;
    
    if (!status) return 1.0;

    // Boost active/current items
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
      case 'current':
      case 'scheduled':
        return 1.3;
      
      case 'completed':
      case 'done':
        return 1.1;
      
      case 'cancelled':
      case 'archived':
      case 'deleted':
        return 0.7;
      
      default:
        return 1.0;
    }
  }

  /**
   * Get date relevance boost factor
   */
  private getDateRelevanceBoost(result: SearchResult, processedQuery: ProcessedQuery | null): number {
    if (!result.date || !processedQuery?.dateRange) {
      return 1.0;
    }

    const resultDate = new Date(result.date);
    const now = new Date();
    
    // If query has specific date range, prioritize results in that range
    if (processedQuery.dateRange.start || processedQuery.dateRange.end) {
      const startDate = processedQuery.dateRange.start ? new Date(processedQuery.dateRange.start) : new Date(0);
      const endDate = processedQuery.dateRange.end ? new Date(processedQuery.dateRange.end) : new Date('2099-12-31');
      
      if (resultDate >= startDate && resultDate <= endDate) {
        return 1.5; // In date range
      } else {
        return 0.8; // Outside date range
      }
    }

    // General recency boost - more recent items are more relevant
    const daysDiff = Math.abs(now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) return 1.4; // Today or yesterday
    if (daysDiff <= 7) return 1.2; // This week
    if (daysDiff <= 30) return 1.1; // This month
    if (daysDiff <= 90) return 1.0; // Last 3 months
    
    return 0.9; // Older items
  }

  /**
   * Apply result diversity to ensure balanced result types
   */
  private applyResultDiversity(results: SearchResult[]): SearchResult[] {
    if (results.length <= 10) {
      return results; // No need for diversity with few results
    }

    const diversifiedResults: SearchResult[] = [];
    const typeGroups = new Map<string, SearchResult[]>();
    
    // Group results by type
    results.forEach(result => {
      if (!typeGroups.has(result.type)) {
        typeGroups.set(result.type, []);
      }
      typeGroups.get(result.type)!.push(result);
    });

    // Take top results from each type in round-robin fashion
    const maxPerType = Math.max(3, Math.floor(20 / typeGroups.size));
    const typeIterators = new Map<string, number>();
    
    // Initialize iterators
    typeGroups.forEach((_, type) => {
      typeIterators.set(type, 0);
    });

    // Round-robin selection
    for (let round = 0; round < maxPerType && diversifiedResults.length < 20; round++) {
      typeGroups.forEach((typeResults, type) => {
        const iterator = typeIterators.get(type)!;
        if (iterator < typeResults.length && diversifiedResults.length < 20) {
          diversifiedResults.push(typeResults[iterator]);
          typeIterators.set(type, iterator + 1);
        }
      });
    }

    // Fill remaining slots with highest-scoring results
    const remainingResults = results.filter(r => !diversifiedResults.includes(r));
    diversifiedResults.push(...remainingResults.slice(0, 20 - diversifiedResults.length));

    return diversifiedResults;
  }

  /**
   * Apply recency boost for time-sensitive queries
   */
  private applyRecencyBoost(results: SearchResult[], processedQuery: ProcessedQuery | null): SearchResult[] {
    if (!processedQuery) return results;

    // Queries that benefit from recency boost
    const timeSensitiveIntents = ['schedule', 'availability', 'status', 'next', 'upcoming'];
    const isTimeSensitive = timeSensitiveIntents.some(intent => 
      processedQuery.intent.includes(intent) || 
      processedQuery.keywords.some(keyword => keyword.includes(intent))
    );

    if (!isTimeSensitive) return results;

    // Apply additional recency boost
    return results.map(result => {
      if (result.date) {
        const date = new Date(result.date);
        const now = new Date();
        const daysDiff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        // Boost future events more than past events for schedule queries
        if (daysDiff >= 0 && daysDiff <= 30) {
          result.relevanceScore *= 1.3; // Upcoming events
        } else if (daysDiff >= -7 && daysDiff < 0) {
          result.relevanceScore *= 1.1; // Recent past events
        }
      }
      
      return result;
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

export const resultRanker = new ResultRanker();