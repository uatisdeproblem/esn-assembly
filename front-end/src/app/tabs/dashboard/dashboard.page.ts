import { Component } from '@angular/core';
import { PopoverController } from '@ionic/angular';

import { AppService } from '@app/app.service';

@Component({
  selector: 'dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss']
})
export class DashboardPage {
  constructor(private popoverCtrl: PopoverController, public app: AppService) {}

  async openCommunication(event: Event): Promise<void> {
    const cssClass = 'largePopover';
    const popover = await this.popoverCtrl.create({ component: CommunicationsComponent, event, cssClass });
    await popover.present();
  }
}

@Component({
  selector: 'communications',
  template: `
    <ion-content>
      <ion-card color="white">
        <ion-card-header>
          <ion-card-title>Ex. GA August 2023 - Timeline</ion-card-title>
          <ion-card-subtitle>Timeline and contents of the Extraordinary GA.</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Orci dapibus ultrices in iaculis nunc sed augue. Facilisis sed odio morbi quis commodo
            odio. Dignissim enim sit amet venenatis urna cursus. Ut lectus arcu bibendum at varius. Ullamcorper sit amet
            risus nullam eget. Nisi porta lorem mollis aliquam ut porttitor leo a diam. Tellus cras adipiscing enim eu
            turpis egestas. Id diam vel quam elementum pulvinar etiam non. Cursus vitae congue mauris rhoncus aenean
            vel. Dictum varius duis at consectetur lorem donec massa sapien. Volutpat commodo sed egestas egestas
            fringilla phasellus faucibus.
          </p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [
    `
      ion-card {
        margin: 0;
        padding: 20px;
        width: 100%;
        box-shadow: none;
      }
    `
  ]
})
export class CommunicationsComponent {
  constructor(public app: AppService) {}
}
