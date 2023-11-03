import { Resource } from 'idea-toolbox';

/**
 * The list of interesting roles on which to assign permissions in the platform.
 */
export enum UserRoles {
  INTERNATIONAL_BOARD = 'INTERNATIONAL_BOARD',
  INTERNATIONAL_SECRETARIAT = 'INTERNATIONAL_SECRETARIAT',
  INTERNATIONAL_LEVEL = 'INTERNATIONAL_LEVEL',
  INTERNATIONAL_GA_CT = 'INTERNATIONAL_GA_CT',
  INTERNATIONAL_AB = 'INTERNATIONAL_AB',
  INTERNATIONAL_AC = 'INTERNATIONAL_AC',
  NATIONAL_BOARD = 'NATIONAL_BOARD',
  NATIONAL_LEVEL = 'NATIONAL_LEVEL',
  LOCAL_BOARD = 'LOCAL_BOARD',
  LOCAL_LEVEL = 'LOCAL_LEVEL'
}

/**
 * The map between the platform's roles with the (known) interesting roles on ESN Accounts.
 * Roles that ends with "*" are intended to be: "any role with that prefix".
 * Note: all roles are lower-cased (since they will be handled with a case-insensitive logic).
 */
export const ESN_ACCOUNTS_ROLES_MAP: { [userRole: string]: string[] } = {
  INTERNATIONAL_BOARD: [
    'international.president',
    'international.vicepresident',
    'international.treasurer',
    'international.webprojectadministrator',
    'international.externalrelations'
  ],
  INTERNATIONAL_SECRETARIAT: ['international.officestaff'],
  INTERNATIONAL_GA_CT: ['international.cnrsecretary', 'international.agmchair', 'international.cnradmin'],
  INTERNATIONAL_AB: ['international.ab.*'],
  INTERNATIONAL_AC: ['international.ac.*'],
  INTERNATIONAL_LEVEL: ['international.*'],
  NATIONAL_BOARD: ['national.regularboardmember'],
  NATIONAL_LEVEL: ['national.*'],
  LOCAL_BOARD: ['local.regularboardmember'],
  LOCAL_LEVEL: ['local.*']
};

export class User extends Resource {
  /**
   * Username in ESN Accounts (lowercase).
   */
  userId: string;
  /**
   * Email address.
   */
  email: string;
  /**
   * First name.
   */
  firstName: string;
  /**
   * Last name.
   */
  lastName: string;
  /**
   * Section code in ESN Accounts.
   */
  roles: string[];
  /**
   * Section code in ESN Accounts.
   */
  sectionCode: string;
  /**
   * ESN Section.
   */
  section: string;
  /**
   * ESN Country.
   */
  country: string;
  /**
   * The URL to the user's avatar.
   */
  avatarURL: string;
  /**
   * Whether the user is administrator, based on the platform's configurations.
   * A change in this permission will require a new sign-in to take full place.
   */
  isAdministrator: boolean;
  /**
   * Whether the user can manage opportunities, based on the platform's configurations.
   * A change in this permission will require a new sign-in to take full place.
   */
  canManageOpportunities: boolean;

  /**
   * Whether the user has one of the allowed roles.
   */
  static isAllowedBasedOnRoles = (user: User, allowedRoles: UserRoles[]): boolean => {
    const allowedESNAccountsRoles: string[] = [];
    for (const role of allowedRoles) allowedESNAccountsRoles.push(...ESN_ACCOUNTS_ROLES_MAP[role]);

    return user.roles
      .map(userRole => userRole.toLowerCase())
      .some(userRole =>
        allowedESNAccountsRoles.some(allowedRole =>
          allowedRole.endsWith('*')
            ? userRole.startsWith(allowedRole.slice(0, allowedRole.length - 1))
            : allowedRole === userRole
        )
      );
  };

  load(x: any): void {
    super.load(x);
    this.userId = this.clean(x.userId, String)?.toLowerCase();
    this.email = this.clean(x.email, String);
    this.firstName = this.clean(x.firstName, String);
    this.lastName = this.clean(x.lastName, String);
    this.roles = this.cleanArray(x.roles, String);
    this.sectionCode = this.clean(x.sectionCode, String);
    this.section = this.clean(x.section, String);
    this.country = this.clean(x.country, String);
    this.avatarURL = this.clean(x.avatarURL, String);
    this.isAdministrator = this.clean(x.isAdministrator, Boolean);
    this.canManageOpportunities = this.clean(x.canManageOpportunities, Boolean);
  }

  /**
   * Get a string representing the ESN Section and Country of the subject.
   */
  getSectionCountry(): string {
    if (this.country === this.section) return this.section;
    return [this.country, this.section].filter(x => x).join(' - ');
  }
}
