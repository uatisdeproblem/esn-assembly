import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { UsefulLink } from '@models/usefulLink.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule],
  selector: 'app-useful-link',
  template: `
    <ion-item [color]="color" *ngIf="!link">
      <ion-label><ion-skeleton-text animated></ion-skeleton-text></ion-label>
    </ion-item>
    <ion-item [color]="color" *ngIf="link" [button]="button" (click)="select.emit()">
      <ion-icon slot="start" icon="link" color="primary" size="small"></ion-icon>
      <ion-label class="ion-text-wrap">{{ link.name }}</ion-label>
      <ng-content></ng-content>
    </ion-item>
  `,
  styles: [
    `
      ion-item ion-badge[slot='start'] {
        width: 100px;
      }
    `
  ]
})
export class UsefulLinkComponent {
  /**
   * The useful link to show; if not set, shows a skeleton instead.
   */
  @Input() link: UsefulLink;
  /**
   * The color for the component.
   */
  @Input() color = 'white';
  /**
   * Whether the component should act like a button.
   */
  @Input() button = false;
  /**
   * Trigger when selected.
   */
  @Output() select = new EventEmitter<void>();

  constructor() {}
}
