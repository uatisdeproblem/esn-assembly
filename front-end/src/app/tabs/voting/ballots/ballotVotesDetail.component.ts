import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { IDEATranslationsModule } from '@idea-ionic/common';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, IDEATranslationsModule],
  selector: 'app-voting-ballot-detail',
  template: `
    <ion-content>
      <ion-list class="ion-padding">
        <ion-list-header>
          <ion-label class="ion-margin-bottom">
            <p>{{ 'VOTING.VOTERS_FOR' | translate }}</p>
            <h3>{{ ballotOption }}</h3>
            <p>
              <ion-badge color="medium">{{ resultValue }}</ion-badge>
            </p>
          </ion-label>
        </ion-list-header>
        <ion-item *ngIf="resultValue === 0">
          <ion-label class="ion-padding-start">
            <i>{{ 'VOTING.NO_ONE' | translate }}</i>
          </ion-label>
        </ion-item>
        <ion-item *ngFor="let voter of votersNames">
          <ion-label class="ion-text-wrap ion-padding-start">{{ voter }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      ion-item {
        --min-height: auto;
      }
      ion-item ion-label {
        margin: 6px 0;
        font-size: 0.9em;
      }
      ion-item ion-label h3 {
        font-weight: 500;
      }
      ion-item ion-label p {
        margin-top: 4px;
      }
    `
  ]
})
export class BallotVotesDetailStandaloneComponent implements OnInit {
  /**
   * The ballot option to show.
   */
  @Input() ballotOption: string;
  /**
   * The result (numeric value) of the ballot option.
   */
  @Input() resultValue = 0;
  /**
   * If applicable, the list of voters' names for this ballot option.
   */
  @Input() votersNames: string[] = [];

  ngOnInit(): void {
    this.votersNames = this.votersNames.sort((a, b): number => a.localeCompare(b));
  }
}
