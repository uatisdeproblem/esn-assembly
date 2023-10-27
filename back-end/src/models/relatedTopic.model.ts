/**
 * A link between two topics. Note: there are always two rows representing the relation (two-way).
 */
export interface RelatedTopic {
  topicA: string;
  topicB: string;
  relation: RelatedTopicRelations;
}

/**
 * The possible relations between topics.
 */
export enum RelatedTopicRelations {
  LINK = 'LINK'
}
