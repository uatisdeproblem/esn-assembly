import { Component } from '@angular/core';

import { AppService } from '@app/app.service';

@Component({
  selector: 'archive',
  templateUrl: 'archive.page.html',
  styleUrls: ['archive.page.scss']
})
export class ArchivePage {
  constructor(public app: AppService) {}
}
