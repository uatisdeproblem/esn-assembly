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
import { ApplicationStandaloneComponent } from './applications/application.component';
import { ReviewApplicationStandaloneComponent } from './applications/reviewApplication.component';
import { EditModeButtonsModule } from '@common/editModeButtons.module';
import { AttachmentsModule } from '@common/attachments.module';
import { HTMLEditorModule } from '@common/htmlEditor.module';
import { SubjectModule } from '@common/subject.module';
import { StatisticsModule } from '@common/statistics.module';
import { AppDateTimezonePipe } from '@common/dateTimezone.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IDEATranslationsModule,
    IDEADateTimeModule,
    OpportunitiesRoutingModule,
    OpportunityModule,
    ApplicationStandaloneComponent,
    ReviewApplicationStandaloneComponent,
    EditModeButtonsModule,
    AttachmentsModule,
    HTMLEditorModule,
    SubjectModule,
    StatisticsModule,
    AppDateTimezonePipe
  ],
  declarations: [OpportunitiesPage, ManageOpportunityPage, OpportunityPage]
})
export class OpportunitiesModule {}
