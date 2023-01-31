import { Component } from '@angular/core';

import { AppService } from '@app/app.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.component.html',
  styleUrls: ['tabs.component.scss']
})
export class TabsComponent {
  tabs: { id: string; icon: string; titleKey: string }[] = [
    { id: 'topics', icon: 'home', titleKey: 'TABS.TOPICS' },
    { id: 'archive', icon: 'archive', titleKey: 'TABS.ARCHIVE' },
    { id: 'configurations', icon: 'settings', titleKey: 'TABS.CONFIGURATIONS' }
  ];

  constructor(public app: AppService) {}
}
