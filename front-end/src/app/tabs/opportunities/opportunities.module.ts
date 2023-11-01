import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEADateTimeModule, IDEATranslationsModule } from '@idea-ionic/common';

import { OpportunitiesRoutingModule } from './opportunities.routing.module';
import { OpportunitiesPage } from './opportunities.page';
import { ManageOpportunityPage } from './manageOpportunity.page';
import { OpportunityPage } from './opportunity.page';

import { OpportunityModule } from './opportunity.module';
import { EditModeButtonsModule } from 'src/app/common/editModeButtons.module';
import { AttachmentsModule } from 'src/app/common/attachments.module';
import { HTMLEditorModule } from 'src/app/common/htmlEditor.module';
import { StatisticsModule } from '@app/common/statistics.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    IDEADateTimeModule,
    OpportunitiesRoutingModule,
    OpportunityModule,
    EditModeButtonsModule,
    AttachmentsModule,
    HTMLEditorModule,
    StatisticsModule
  ],
  declarations: [OpportunitiesPage, ManageOpportunityPage, OpportunityPage]
})
export class OpportunitiesModule {}
