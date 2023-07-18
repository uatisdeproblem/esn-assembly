import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { UsefulLink } from '@models/usefulLink.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule],
  selector: 'app-useful-link',
  template: `
    <ion-item [color]="color" *ngIf="!link">
      <ion-label><ion-skeleton-text animated></ion-skeleton-text></ion-label>
    </ion-item>
    <ion-item [color]="color" *ngIf="link" button (click)="openLink()">
      <ion-icon slot="start" icon="open-outline" color="primary" size="small"></ion-icon>
      <ion-label>{{ link.name }}</ion-label>
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

  constructor(public app: AppService) {}

  async openLink(): Promise<void> {
    await this.app.openURL(this.link.url);
  }
}
