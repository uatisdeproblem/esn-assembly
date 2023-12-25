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
    if (!value) return null;
    const d = new Date(value);
    const lang = this.t.getCurrentLang();
    const options = { timeZone: timezone ?? this.app.configurations.timezone };
    if (pattern === 'datetime')
      return d.toLocaleString(lang, {
        ...options,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
    if (pattern === 'time')
      return d.toLocaleTimeString(lang, { ...options, hour: 'numeric', minute: 'numeric', hour12: false });
    else return d.toLocaleDateString(lang, { ...options, year: 'numeric', month: 'short', day: '2-digit' });
  }
}
