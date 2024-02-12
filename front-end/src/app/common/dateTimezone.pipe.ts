import { Pipe, PipeTransform } from '@angular/core';
import { IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

/**
 * Handle dates with the timezone preference loaded from the configurations.
 */
@Pipe({ name: 'dateTz', pure: false, standalone: true })
export class DateTimezonePipe implements PipeTransform {
  constructor(private t: IDEATranslationsService, private app: AppService) {}

  transform(value: any, pattern: 'date' | 'datetime' | 'time' = 'date', timezone?: string): string | null {
    return formatDateWithLocaleAndTimeZone(
      value,
      this.t.getCurrentLang(),
      timezone ?? this.app.configurations.timezone,
      pattern
    );
  }
}

/**
 * Transform a date with a locale and a timezone in the app's standard.
 */
export const formatDateWithLocaleAndTimeZone = (
  value: any,
  locale: string,
  timeZone: string,
  pattern: 'date' | 'datetime' | 'time' = 'date'
): string | null => {
  if (!value) return null;
  const d = new Date(value);
  const options = { timeZone };
  if (pattern === 'datetime')
    return d.toLocaleString(locale, {
      ...options,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
  if (pattern === 'time')
    return d.toLocaleTimeString(locale, { ...options, hour: 'numeric', minute: 'numeric', hour12: false });
  return d.toLocaleDateString(locale, { ...options, year: 'numeric', month: 'short', day: '2-digit' });
};
