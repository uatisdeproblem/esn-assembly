import { Component } from '@angular/core';

import { AppService } from '@app/app.service';

@Component({
  selector: 'configurations',
  templateUrl: 'configurations.page.html',
  styleUrls: ['configurations.page.scss']
})
export class ConfigurationsPage {
  constructor(public app: AppService) {}
}
