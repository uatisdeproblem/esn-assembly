import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
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
        #dateTime
        type="datetime-local"
        [disabled]="disabled"
        [value]="initialValue"
        (change)="dateChange.emit(zonedTimeStringToUTC($event.target.value))"
      />
    </ion-item>
  `
})
export class DatetimeWithTimezoneStandaloneComponent implements OnInit, OnChanges {
  /**
   * The date to manage.
   */
  @Input() date: epochISOString;
  @Output() dateChange = new EventEmitter<epochISOString>();
  /**
   * The timezone to consider.
   * Fallback to the default value set in the configurations.
   */
  @Input() timezone: string;
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

  @ViewChild('dateTime') dateTime: ElementRef;

  constructor(public app: AppService) {}
  async ngOnInit(): Promise<void> {
    this.timezone = this.timezone ?? this.app.configurations.timezone;
    this.initialValue = this.utcToZonedTimeString(this.date);
  }
  ngOnChanges(changes: SimpleChanges): void {
    // fix the date if the linked timezone changes
    if (changes.timezone?.currentValue && this.dateTime) {
      setTimeout((): void => {
        this.dateChange.emit(this.zonedTimeStringToUTC(this.dateTime.nativeElement.value));
      }, 100);
    }
  }

  utcToZonedTimeString(isoString: epochISOString): string {
    return formatInTimeZone(isoString, this.timezone, "yyyy-MM-dd'T'HH:mm");
  }
  zonedTimeStringToUTC(dateLocale: string): epochISOString {
    return zonedTimeToUtc(new Date(dateLocale), this.timezone).toISOString();
  }
}
