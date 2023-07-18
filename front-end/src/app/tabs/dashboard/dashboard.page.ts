import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { DeadlinesComponent } from './deadlines/deadlines.component';

import { AppService } from '@app/app.service';

import { Communication } from '@models/communication.model';
import { Deadline } from '@models/deadline.model';
import { UsefulLink } from '@models/usefulLink.model';
import { FAVORITE_TIMEZONE } from '@models/favoriteTimezone.const';

@Component({
  selector: 'dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss']
})
export class DashboardPage {
  communications: Communication[] = [
    new Communication({
      name: 'Ex. GA August 2023 - Timeline',
      brief: 'Timeline and contents of the Extraordinary GA',
      date: '2023-07-18',
      imageURL: 'https://ionicframework.com/docs/img/demos/card-media.png',
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    }),
    new Communication({
      name: 'GA Autumn 2023 - Registrations',
      brief: 'Registrations are open',
      date: '2023-07-17',
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    }),
    new Communication({
      name: 'GA Spring 2023 - Report and minutes',
      date: '2023-06-20',
      imageURL: 'https://i.ibb.co/h7CF4xt/gaminho.png',
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    })
  ];
  nextDeadlines: Deadline[] = [
    new Deadline({ name: 'Travel Fund applications', at: new Date() }),
    new Deadline({ name: 'Registrations close', at: new Date('2023-07-19') }),
    new Deadline({ name: 'Topics proposal', at: new Date('2023-08-10') })
  ];
  deadlines: Deadline[] = [
    new Deadline({ name: 'Travel Fund applications', at: new Date() }),
    new Deadline({ name: 'Registrations close', at: new Date('2023-07-19') }),
    new Deadline({ name: 'Topics proposal', at: new Date('2023-08-10') }),
    new Deadline({ name: 'Test 123', at: new Date('2023-08-14') }),
    new Deadline({ name: 'Important date', at: new Date('2023-08-22') })
  ];
  usefulLinks: UsefulLink[] = [
    new UsefulLink({
      name: 'GA Autumn 2023 documents',
      url: 'https://wiki.esn.org/display/EV/Extraordinary+GA+August+2023+Documents'
    }),
    new UsefulLink({ name: 'Travel Fund form', url: 'https://forms.esn.org/travel-fund' })
  ];

  segment = MobileSegments.NEWS;
  MobileSegments = MobileSegments;

  FAVORITE_TIMEZONE = FAVORITE_TIMEZONE;

  constructor(private modalCtrl: ModalController, public app: AppService) {}

  async openAllDeadlines(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: DeadlinesComponent,
      componentProps: { deadlines: this.deadlines }
    });
    await modal.present();
  }
}

enum MobileSegments {
  NEWS = 'NEWS',
  DEADLINES = 'DEADLINES',
  LINKS = 'LINKS'
}
