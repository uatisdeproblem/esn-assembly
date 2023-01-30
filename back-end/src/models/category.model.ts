import { epochISOString, Resource } from 'idea-toolbox';

/**
 * A category to classify topics.
 */
export class TopicCategory extends Resource {
  /**
   * The ID of the category.
   */
  categoryId: string;
  /**
   * The name of the category.
   */
  name: string;
  /**
   * The color associated to the category.
   */
  color: string;
  /**
   * The timestamp when the topic was archived.
   */
  archivedAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.categoryId = this.clean(x.categoryId, String);
    this.name = this.clean(x.name, String);
    this.color = this.clean(x.color, String);
    if (x.archivedAt) this.archivedAt = this.clean(x.archivedAt, d => new Date(d).toISOString());
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.categoryId = safeData.categoryId;
    if (safeData.archivedAt) this.archivedAt = safeData.archivedAt;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    if (!CATEGORY_COLORS.includes(this.color)) e.push('color');
    return e;
  }
}

/**
 * A brief representation of a topic's category.
 */
export class TopicCategoryAttached extends Resource {
  /**
   * The ID of the category.
   */
  categoryId: string;
  /**
   * The name of the category.
   */
  name: string;
  /**
   * The color associated to the category.
   */
  color: string;

  load(x: any): void {
    super.load(x);
    this.categoryId = this.clean(x.categoryId, String);
    this.name = this.clean(x.name, String);
    this.color = this.clean(x.color, String);
  }
}

/**
 * The possible colors for a category.
 */
export const CATEGORY_COLORS = [
  'ESNcyan',
  'ESNdarkBlue',
  'ESNorange',
  'ESNpink',
  'ESNgreen',
  'medium',
  'light',
  'dark',
  'white'
];
