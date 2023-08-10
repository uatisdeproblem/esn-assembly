import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { GAEventsService } from '@tabs/configurations/events/events.service';

import { GAEvent, GAEventAttached } from '@models/event.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslationsModule],
  selector: 'app-events-picker',
  template: `
    <ion-item [lines]="lines" [color]="color">
      <ion-label position="stacked">
        {{ 'EVENTS.EVENT' | translate }} <ion-text class="obligatoryDot" *ngIf="obligatory"></ion-text>
      </ion-label>
      <ion-select
        interface="popover"
        [compareWith]="compareWithEvent"
        [(ngModel)]="event"
        (ngModelChange)="eventChange.emit($event)"
        [disabled]="!editMode || !events"
      >
        <ion-select-option *ngIf="!obligatory" [value]="null"></ion-select-option>
        <ion-select-option *ngFor="let event of events" [value]="event">{{ event.name }}</ion-select-option>
      </ion-select>
    </ion-item>
  `,
  styles: []
})
export class EventsPickerComponent implements OnInit {
  /**
   * The event picked.
   */
  @Input() event: GAEventAttached;
  @Output() eventChange = new EventEmitter<GAEventAttached>();
  /**
   * The color of the item.
   */
  @Input() color: string;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: string;
  /**
   * Whether the component is editable.
   */
  @Input() editMode = false;
  /**
   * Whether picking the event is obligatory.
   */
  @Input() obligatory = false;

  events: GAEvent[];

  constructor(private _events: GAEventsService) {}
  async ngOnInit(): Promise<void> {
    this.events = await this._events.getList();
  }

  compareWithEvent(e1: GAEventAttached, e2: GAEventAttached): boolean {
    return e1 && e2 ? e1.eventId === e2.eventId : e1 === e2;
  }
}
