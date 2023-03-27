/**
 * We need to strip weird characters to build a valid ID to open the entity on ESN Accounts.
 */
export const cleanESNAccountsIdForURL = (id: string): string => id.replace(/[._]/gm, '').replace(/\s/gm, '-');
