import { Component, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ColumnMode, DatatableComponent, SelectionType, TableColumn } from '@swimlane/ngx-datatable';
import { AlertController, IonSearchbar, ModalController } from '@ionic/angular';
import {
  IDEAActionSheetController,
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsService
} from '@idea-ionic/common';

import { ManageBallotStandaloneComponent } from './ballots/manageBallot.component';
import { ManageVoterStandaloneComponent } from './voters/manageVoter.component';

import { AppService } from '@app/app.service';
import { VotingService } from './voting.service';

import { VotingMajorityTypes, VotingBallot, VotingSession, Voter } from '@models/votingSession.model';

@Component({
  selector: 'manage-voting-session',
  templateUrl: 'manageSession.page.html',
  styleUrls: ['manageSession.page.scss']
})
export class ManageVotingSessionPage {
  @Input() sessionId = 'new-standard';
  votingSession: VotingSession;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: VotingSession;

  hasDeadlineForQuestions = false;
  hasDeadlineForAnswers = false;

  publishingOption = PublishingOptions.DRAFT;
  PublishingOptions = PublishingOptions;

  pageSection = PageSections.GENERAL;
  PageSections = PageSections;

  @ViewChild('votersSearchbar') searchbar: IonSearchbar;
  @ViewChild('votersTable') table: DatatableComponent;

  col: TableColumn[];
  selectionType = SelectionType.single;
  trackByProp = 'id';
  columnMode = ColumnMode.force;
  limit = 10;
  rowHeight = 42;
  headerHeight = 56;
  footerHeight = 80;

  filteredVoters: Voter[];
  missingEmails: number;
  numDuplicatedNames: number;
  numDuplicatedEmails: number;
  totalWeights: number;

  sessionReady = false;
  timezones = (Intl as any).supportedValuesOf('timeZone');

  constructor(
    private location: Location,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private actionsCtrl: IDEAActionSheetController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private _voting: VotingService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    try {
      await this.loading.show();
      if (this.sessionId !== 'new') {
        this.votingSession = await this._voting.getById(this.sessionId);
        if (!this.votingSession.canUserManage(this.app.user)) return this.app.closePage('COMMON.UNAUTHORIZED');
        this.setUIHelpersForComplexFields();
        this.editMode = UXMode.VIEW;
      } else {
        if (!this.app.user.isAdministrator) return this.app.closePage('COMMON.UNAUTHORIZED');
        this.votingSession = new VotingSession();
        this.editMode = UXMode.INSERT;
      }
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  handleChangePageSection(): void {
    if (this.pageSection === PageSections.VOTERS) setTimeout((): void => this.initVotersTable(), 300);
    if (this.pageSection === PageSections.START) this.sessionReady = this.canSessionStart();
  }

  async save(): Promise<void> {
    this.errors = new Set(this.votingSession.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: VotingSession;
      if (this.editMode === UXMode.INSERT) result = await this._voting.insert(this.votingSession);
      else result = await this._voting.update(this.votingSession);
      this.votingSession.load(result);
      this.location.replaceState(this.location.path().replace('/new', '/'.concat(this.votingSession.sessionId)));
      this.editMode = UXMode.VIEW;
      this.message.success('COMMON.OPERATION_COMPLETED');
    } catch (err) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  enterEditMode(): void {
    this.entityBeforeChange = new VotingSession(this.votingSession);
    this.editMode = UXMode.EDIT;
    if (this.pageSection === PageSections.START) this.pageSection = PageSections.GENERAL;
  }
  async exitEditMode(): Promise<void> {
    const doExit = (): void => {
      if (this.editMode === UXMode.INSERT) this.app.goToInTabs(['voting'], { back: true });
      else {
        this.votingSession = this.entityBeforeChange;
        this.errors = new Set<string>();
        this.editMode = UXMode.VIEW;
        this.setUIHelpersForComplexFields();
      }
    };

    if (JSON.stringify(this.votingSession) === JSON.stringify(this.entityBeforeChange)) return doExit();

    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('COMMON.UNSAVED_CHANGES_WILL_BE_LOST');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doExit }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }

  private setUIHelpersForComplexFields(): void {
    if (this.votingSession.publishedSince) {
      if (this.votingSession.publishedSince > new Date().toISOString())
        this.publishingOption = PublishingOptions.SCHEDULE;
      else this.publishingOption = PublishingOptions.PUBLISH;
    } else this.publishingOption = PublishingOptions.DRAFT;
  }

  //
  // GENERAL
  //

  handleChangeOfPublishingOption(): void {
    if (this.publishingOption === PublishingOptions.DRAFT) delete this.votingSession.publishedSince;
    if (this.publishingOption === PublishingOptions.PUBLISH)
      this.votingSession.publishedSince = new Date().toISOString();
  }

  async archiveSession(archive = true): Promise<void> {
    const doArchive = async (): Promise<void> => {
      try {
        await this.loading.show();
        if (archive) await this._voting.archive(this.votingSession);
        else await this._voting.unarchive(this.votingSession);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.goToInTabs(['voting', this.votingSession.sessionId], { back: true });
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doArchive }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }
  async deleteSession(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._voting.delete(this.votingSession);
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.goToInTabs(['voting'], { back: true });
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  duplicateSession(): void {
    // @todo
  }

  async addScrutineer(): Promise<void> {
    const doAdd = async ({ userId }): Promise<void> => {
      if (!userId) return;
      userId = userId.toLowerCase();
      if (this.votingSession.scrutineersIds.includes(userId)) return;
      this.votingSession.scrutineersIds.push(userId);
    };

    const header = this.t._('VOTING.ADD_SCRUTINEER');
    const message = this.t._('CONFIGURATIONS.ADD_USERS_BY_THEIR_USERNAME');
    const inputs: any = [{ name: 'userId', type: 'text' }];
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.ADD'), handler: doAdd }
    ];

    const alert = await this.alertCtrl.create({ header, message, inputs, buttons });
    await alert.present();
  }
  async removeScrutineerById(userId: string): Promise<void> {
    const index = this.votingSession.scrutineersIds.indexOf(userId);
    if (index !== -1) this.votingSession.scrutineersIds.splice(index, 1);
  }

  //
  // BALLOTS
  //

  async addBallot(): Promise<void> {
    const header = this.t._('BALLOTS.CHOOSE_BALLOT_TEMPLATE');
    const buttons = [
      {
        text: this.t._('VOTING.BALLOT_TEMPLATES.BLANK'),
        handler: (): Promise<void> => this.addBallotFromTemplate('blank')
      },
      {
        text: this.t._('VOTING.BALLOT_TEMPLATES.YES_NO_ABSTAIN'),
        handler: (): Promise<void> => this.addBallotFromTemplate('yes-no')
      },
      {
        text: this.t._('VOTING.BALLOT_TEMPLATES.CANDIDATES_NONE_ABSTAIN'),
        handler: (): Promise<void> => this.addBallotFromTemplate('candidates')
      },
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' }
    ];

    const actions = await this.actionsCtrl.create({ header, buttons });
    actions.present();
  }
  private async addBallotFromTemplate(template: 'blank' | 'yes-no' | 'candidates'): Promise<void> {
    const templates = {
      blank: {},
      'yes-no': {
        text: this.t._('VOTING.DO_YOU_APPROVE_XYZ'),
        majorityType: VotingMajorityTypes.RELATIVE,
        options: [this.t._('COMMON.YES'), this.t._('COMMON.NO'), this.t._('VOTING.ABSTAIN')]
      },
      candidates: {
        text: this.t._('VOTING.WHO_DO_YOU_ELECT_FOR_XYZ'),
        majorityType: VotingMajorityTypes.SIMPLE,
        options: [
          this.t._('VOTING.CANDIDATE_A'),
          this.t._('VOTING.CANDIDATE_B'),
          this.t._('VOTING.NONE_OF_THE_ABOVE'),
          this.t._('VOTING.ABSTAIN')
        ]
      }
    };
    await this.manageBallot(new VotingBallot(templates[template]), true);
  }
  async manageBallot(ballot: VotingBallot, isNew = false): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ManageBallotStandaloneComponent,
      componentProps: { ballot }
    });
    modal.onDidDismiss().then(({ data }): void => {
      ballot.load(data);
      if (isNew) this.votingSession.ballots.push(ballot);
    });
    modal.present();
  }
  handleBallotReorder({ detail }): void {
    const toReposition = this.votingSession.ballots.splice(detail.from, 1)[0];
    this.votingSession.ballots.splice(detail.to, 0, toReposition);
    detail.complete();
  }
  async removeBallot(ballot: VotingBallot): Promise<void> {
    const doRemove = (): void => {
      this.votingSession.ballots.splice(this.votingSession.ballots.indexOf(ballot), 1);
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.REMOVE'), role: 'destructive', handler: doRemove }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }

  //
  // VOTERS
  //

  initVotersTable(): void {
    this.col = [
      { prop: 'id', name: this.t._('VOTING.VOTER_ID'), maxWidth: 150 },
      { prop: 'name', name: this.t._('VOTING.VOTER_NAME') },
      { prop: 'email', name: this.t._('VOTING.VOTER_EMAIL') }
    ];
    if (this.votingSession.isWeighted)
      this.col.push({ prop: 'voteWeight', name: this.t._('VOTING.VOTE_WEIGHT'), maxWidth: 150 });
    this.filter(this.searchbar?.value);
    this.setTableHeight();
  }

  @HostListener('window:resize', ['$event'])
  setTableHeight(event?: Event): void {
    const toolbarBottom = document.getElementById('votersTableToolbar')?.getBoundingClientRect().bottom;
    const currentPageHeight = event?.target ? (event.target as Window).innerHeight : window.innerHeight;
    const heightAvailableInPx = currentPageHeight - toolbarBottom - this.headerHeight - this.footerHeight;
    this.limit = Math.floor(heightAvailableInPx / this.rowHeight);
  }

  filter(searchText?: string): void {
    searchText = (searchText ?? '').toLowerCase();

    this.filteredVoters = this.votingSession.voters.filter(x =>
      [x.id, x.name, x.email, x.voteWeight].filter(f => f).some(f => String(f).toLowerCase().includes(searchText))
    );

    this.calcFooterTotals();

    // whenever the filter changes, always go back to the first page
    if (this.table) this.table.offset = 0;
  }
  calcFooterTotals(): void {
    const votersNames = this.votingSession.voters.map(x => x.name);
    this.numDuplicatedNames = votersNames.length - new Set(votersNames).size;
    const votersEmails = this.votingSession.voters.map(x => x.email).filter(x => x);
    this.numDuplicatedEmails = votersEmails.length - new Set(votersEmails).size;
    this.missingEmails = this.votingSession.voters.filter(x => !x.email).length;
    this.totalWeights = this.votingSession.getTotWeights();
  }

  async manageVoter(voter: Voter, isNew = false): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ManageVoterStandaloneComponent,
      componentProps: { voter, votingSession: this.votingSession }
    });
    modal.onDidDismiss().then(({ data }): void => {
      if (!data) return;
      voter.load(data, this.votingSession);
      if (voter.id === 'DELETE' && !isNew)
        this.votingSession.voters.splice(this.votingSession.voters.indexOf(voter), 1);
      else if (voter.id !== 'DELETE' && isNew && !this.votingSession.voters.some(x => x.id === voter.id))
        this.votingSession.voters.push(voter);
      this.filter(this.searchbar?.value);
    });
    modal.present();
  }
  async addVoter(): Promise<void> {
    await this.manageVoter(new Voter(null, this.votingSession), true);
  }

  async actionsOnVoters(): Promise<void> {
    const header = this.t._('COMMON.ACTIONS');
    const buttons = [
      {
        text: this.t._('VOTING.IMPORT_VOTERS'),
        icon: 'cloud-upload',
        handler: (): void => this.importVoters()
      },
      {
        text: this.t._('VOTING.EXPORT_VOTERS'),
        icon: 'cloud-download',
        handler: (): void => this.exportVoters()
      },
      {
        text: this.t._('VOTING.REMOVE_ALL_VOTERS'),
        icon: 'trash',
        role: 'destructive',
        handler: (): void => this.removeAllVoters()
      },
      { text: this.t._('COMMON.CANCEL'), role: 'cancel', icon: 'arrow-undo' }
    ];

    const actions = await this.actionsCtrl.create({ header, buttons });
    actions.present();
  }
  private importVoters(): void {
    // @todo
  }
  private exportVoters(): void {
    // @todo
  }
  private removeAllVoters(): void {
    // @todo
  }

  //
  // START
  //

  async startSession(): Promise<void> {
    const session = new VotingSession(this.votingSession);
    session.startsAt = new Date().toISOString();

    this.errors = new Set(session.validate());
    if (this.errors.size) return this.message.warning('COMMON.FORM_HAS_ERROR_TO_CHECK');

    const doStart = async (): Promise<void> => {
      try {
        await this.loading.show();
        this.votingSession.load(await this._voting.start(session));
        this.message.success('COMMON.OPERATION_COMPLETED');
        // @todo improve messaging and consequences
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('VOTING.START_SESSION_I');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), handler: doStart }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  canSessionStart(): boolean {
    this.errors = new Set(this.votingSession.validate(true));

    if (!this.votingSession.endsAt) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      this.votingSession.endsAt = now.toISOString();
    }
    if (!this.votingSession.timezone) this.votingSession.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return this.errors.size === 0;
  }
}

enum UXMode {
  VIEW,
  INSERT,
  EDIT
}

enum PublishingOptions {
  DRAFT = 'DRAFT',
  PUBLISH = 'PUBLISH',
  SCHEDULE = 'SCHEDULE'
}

enum PageSections {
  GENERAL = 'GENERAL',
  BALLOTS = 'BALLOTS',
  VOTERS = 'VOTERS',
  START = 'START'
}
