import { Component, OnInit } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { IDEAApiService, IDEAMessageService } from '@idea-ionic/common';

import { AppService } from '../app.service';

@Component({
  selector: 'dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss']
})
export class DashboardPage implements OnInit {
  apiToken: string;

  constructor(private api: IDEAApiService, private message: IDEAMessageService, public app: AppService) {}
  async ngOnInit(): Promise<void> {
    this.apiToken = this.api.authToken;
  }

  async copyHTMLInputText(ionInput: IonInput): Promise<void> {
    if (!ionInput) return;

    const inputEl = await ionInput.getInputElement();
    inputEl.select();
    inputEl.setSelectionRange(0, 99999); // for mobile devices
    navigator.clipboard.writeText(inputEl.value);

    this.message.success('COMMON.DONE');
  }
}
