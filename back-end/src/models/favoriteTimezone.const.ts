import { epochISODateString } from 'idea-toolbox';

export const FAVORITE_TIMEZONE = 'Europe/Brussels';
export const GMT_0_TIMEZONE = 'Europe/Dublin';

/**
 * Convert the date string in the favorite timezone (granularity: minutes).
 */
export const getDateStringInFavoriteTimezone = (
  date: Date | epochISODateString,
  timezone: string,
  withSeconds = false
): string => {
  const sortableFormattingLocale = 'sv-SE';
  const formatter = new Intl.DateTimeFormat(sortableFormattingLocale, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    timeZone: timezone
  });
  return formatter.format(new Date(date));
};

/**
 * Whether the date is in the future (granularity: minutes).
 */
export const dateStringIsFuture = (dateString: epochISODateString, timezone: string): boolean => {
  const now = getDateStringInFavoriteTimezone(new Date(), timezone);
  return !dateString || now < getDateStringInFavoriteTimezone(dateString, timezone);
};

/**
 * Whether the date is in the past (granularity: minutes).
 */
export const dateStringIsPast = (dateString: epochISODateString, timezone: string): boolean => {
  const now = getDateStringInFavoriteTimezone(new Date(), timezone);
  return !dateString || now > getDateStringInFavoriteTimezone(dateString, timezone);
};

/**
 * Whether the date equals today (granularity: day).
 */
export const dateStringIsToday = (dateString: epochISODateString, timezone: string): boolean => {
  const sortableFormattingLocale = 'sv-SE';
  const formatter = new Intl.DateTimeFormat(sortableFormattingLocale, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone
  });
  return formatter.format(new Date()) === formatter.format(new Date(dateString));
};
