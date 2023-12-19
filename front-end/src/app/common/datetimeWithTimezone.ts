import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
import { epochISOString } from 'idea-toolbox';

import { AppService } from '@app/app.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  selector: 'app-datetime-timezone',
  template: `
    <ion-item [lines]="lines" [color]="color">
      <ion-label position="stacked">{{ label }} <ion-text class="obligatoryDot" *ngIf="obligatory" /></ion-label>
      <input
        type="datetime-local"
        [disabled]="disabled"
        [value]="initialValue"
        (change)="dateChange.emit(zonedTimeStringToUTC($event.target.value))"
      />
    </ion-item>
  `
})
export class DatetimeWithTimezoneStandaloneComponent implements OnInit {
  /**
   * @todo
   */
  @Input() date: epochISOString;
  @Output() dateChange = new EventEmitter<epochISOString>();
  /**
   * A label for the item.
   */
  @Input() label: string;
  /**
   * The color of the item.
   */
  @Input() color: string;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: string;
  /**
   * Whether the component is disabled or editable.
   */
  @Input() disabled = false;
  /**
   * Whether the date is obligatory.
   */
  @Input() obligatory = false;

  initialValue: epochISOString;

  constructor(public app: AppService) {}
  async ngOnInit(): Promise<void> {
    this.initialValue = this.utcToZonedTimeString(this.date);
  }

  utcToZonedTimeString(isoString: epochISOString, timezone = this.app.configurations.timezone): string {
    return formatInTimeZone(isoString, timezone, "yyyy-MM-dd'T'HH:mm");
  }
  zonedTimeStringToUTC(dateLocale: string, timezone = this.app.configurations.timezone): epochISOString {
    return zonedTimeToUtc(new Date(dateLocale), timezone).toISOString();
  }
}
