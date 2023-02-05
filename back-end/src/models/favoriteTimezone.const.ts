import { epochISODateString } from 'idea-toolbox';

export const FAVORITE_TIMEZONE = 'Europe/Brussels';

export const parseDateInputHTML = (dateInputFormat: string): epochISODateString =>
  new Date(
    Date.UTC(
      Number(dateInputFormat.slice(0, 4)),
      Number(dateInputFormat.slice(5, 7)) - 1,
      Number(dateInputFormat.slice(8, 10)),
      Number(dateInputFormat.slice(11, 13)),
      Number(dateInputFormat.slice(14, 16))
    )
  ).toISOString();

export const fromISOStringToDateInputHTML = (isoString: epochISODateString): string => isoString.slice(0, 16);
