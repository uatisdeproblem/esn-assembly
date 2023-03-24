import { epochISODateString } from 'idea-toolbox';

export const FAVORITE_TIMEZONE = 'Europe/Brussels';
export const GMT_0_TIMEZONE = 'Europe/Dublin';

export const getDateStringInFavoriteTimezone = (date: Date | epochISODateString, timezone: string): string => {
  const sortableFormattingLocale = 'sv-SE';
  const formatter = new Intl.DateTimeFormat(sortableFormattingLocale, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: timezone
  });
  return formatter.format(new Date(date));
};

export const dateStringIsFuture = (dateString: epochISODateString, timezone: string): boolean => {
  const now = getDateStringInFavoriteTimezone(new Date(), timezone);
  return !dateString || now < getDateStringInFavoriteTimezone(dateString, timezone);
};

export const dateStringIsPast = (dateString: epochISODateString, timezone: string): boolean => {
  const now = getDateStringInFavoriteTimezone(new Date(), timezone);
  return !dateString || now > getDateStringInFavoriteTimezone(dateString, timezone);
};
