import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule],
  selector: 'app-voting-majority-type',
  template: `
    <ion-content class="ion-padding">
      <p>
        {{ 'VOTING.MAJORITY_TYPES.' + majorityType + '_I' | translate }}
      </p>
    </ion-content>
  `,
  styles: [
    `
      p {
        font-size: 0.9em;
      }
    `
  ]
})
export class MajorityTypeStandaloneComponent {
  /**
   * The majority type to show.
   */
  @Input() majorityType: string;
}
