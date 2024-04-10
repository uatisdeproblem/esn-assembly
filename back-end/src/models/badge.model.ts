import { epochISOString, Resource } from 'idea-toolbox';

/**
 * A badge earnable in the platform.
 */
export class Badge extends Resource {
  /**
   * The ID of the badge.
   */
  badgeId: string;
  /**
   * The name of the badge.
   */
  name: string;
  /**
   * A description of the badge.
   */
  description: string;
  /**
   * The URI to the image representing the badge.
   */
  imageURI: string;

  load(x: any): void {
    super.load(x);
    this.badgeId = this.clean(x.badgeId, String);
    this.name = this.clean(x.name, String);
    this.description = this.clean(x.description, String);
    this.imageURI = this.clean(x.imageURI, String);
  }

  safeLoad(newData: any, safeData: any): void {
    super.safeLoad(newData, safeData);
    this.badgeId = safeData.badgeId;
  }

  validate(): string[] {
    const e = super.validate();
    if (this.iE(this.name)) e.push('name');
    if (this.iE(this.description)) e.push('description');
    if (this.iE(this.imageURI)) e.push('imageURI');
    return e;
  }

  isSpecial(): boolean {
    return SpecialBadges.includes(this.badgeId);
  }
}

/**
 * The special badges to earn automatically while performing actions in the platform.
 */
export const SpecialBadges = [
  'NEWCOMER',
  'FIRST_QUESTION',
  'QUESTIONS_MASTER',
  'LOVE_GIVER',
  'CHEERGIVER',
  'RISING_STAR'
];

/**
 * The badge earned by a user.
 */
export class UserBadge extends Resource {
  /**
   * The ID of the user who have earned the badge.
   */
  userId: string;
  /**
   * The ID of the badge earned.
   */
  badge: string;
  /**
   * When the badge was earned.
   */
  earnedAt: epochISOString;
  /**
   * Whether and when the badge was first seen.
   */
  firstSeenAt?: epochISOString;

  load(x: any): void {
    super.load(x);
    this.userId = this.clean(x.userId, String);
    this.badge = this.clean(x.badge, String);
    this.earnedAt = this.clean(x.earnedAt, d => new Date(d).toISOString(), new Date().toISOString());
    if (x.firstSeenAt) this.firstSeenAt = this.clean(x.firstSeenAt, d => new Date(d).toISOString());
  }
}
