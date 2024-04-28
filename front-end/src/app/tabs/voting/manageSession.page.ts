import { Component, HostListener, Input, OnDestroy, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ColumnMode, DatatableComponent, SelectionType, TableColumn } from '@swimlane/ngx-datatable';
import { AlertController, IonAccordionGroup, IonSearchbar, ModalController } from '@ionic/angular';
import { epochISOString } from 'idea-toolbox';
import {
  IDEAActionSheetController,
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslationsService,
  IDEAWebSocketApiService
} from '@idea-ionic/common';

import { ManageBallotStandaloneComponent } from './ballots/manageBallot.component';
import { ManageVoterStandaloneComponent } from './voters/manageVoter.component';
import { ImportVotersStandaloneComponent } from './voters/importVoters.component';

import { AppService } from '@app/app.service';
import { VotingService } from './voting.service';

import {
  VotingMajorityTypes,
  VotingBallot,
  VotingSession,
  Voter,
  VotingSessionTypes
} from '@models/votingSession.model';
import { VotingTicket } from '@models/votingTicket.model';
import { WebSocketConnectionTypes, WebSocketMessage } from '@models/webSocket.model';
import { VotingResults } from '@models/votingResult.model';

@Component({
  selector: 'manage-voting-session',
  templateUrl: 'manageSession.page.html',
  styleUrls: ['manageSession.page.scss']
})
export class ManageVotingSessionPage implements OnDestroy {
  @Input() sessionId = VotingSessionTypes.FORM_PUBLIC;
  votingSession: VotingSession;

  editMode = UXMode.VIEW;
  UXMode = UXMode;
  errors = new Set<string>();
  entityBeforeChange: VotingSession;

  publishingOption = PublishingOptions.DRAFT;
  PublishingOptions = PublishingOptions;
  VotingSessionTypes = VotingSessionTypes;

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
  numMissingEmails: number;
  numDuplicatedNames: number;
  numDuplicatedEmails: number;
  totalWeights: number;

  sessionReady = false;
  timezones = (Intl as any).supportedValuesOf('timeZone');
  extendDurationAt: epochISOString;
  extendDurationTimezone: string;

  votingTickets: VotingTicket[];
  results: VotingResults;
  showRawResults = true;

  rollCallInProgress = false;
  rollCall: Record<string, boolean> = {};

  immediateInProgress = false;
  immediateByBallot: Record<string, number>[] = [];
  @ViewChild('immediateAccordion') immediateAccordion: IonAccordionGroup;

  constructor(
    private location: Location,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private actionsCtrl: IDEAActionSheetController,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private t: IDEATranslationsService,
    private webSocket: IDEAWebSocketApiService,
    private _voting: VotingService,
    public app: AppService
  ) {}
  ngOnDestroy(): void {
    if (this.webSocket) this.webSocket.close();
  }
  async ionViewWillEnter(): Promise<void> {
    try {
      await this.loading.show();
      const isNew = Object.keys(VotingSessionTypes).includes(this.sessionId);
      if (!isNew) {
        this.votingSession = await this._voting.getById(this.sessionId);
        if (!this.votingSession.canUserManage(this.app.user)) return this.app.closePage('COMMON.UNAUTHORIZED');
        if (this.votingSession.hasStarted()) {
          this.votingTickets = await this._voting.getVotingTicketsStatus(this.votingSession);
          if (this.votingSession.isInProgress()) {
            this.checkWhetherSessionShouldEndEarly();
            this.openWebSocketForVotingTicketsStatus();
          }
        }
        if (this.votingSession.results) this.results = this.votingSession.results;
        this.setUIHelpersForComplexFields();
        this.editMode = UXMode.VIEW;
      } else {
        if (!this.app.user.isAdministrator) return this.app.closePage('COMMON.UNAUTHORIZED');
        this.votingSession = new VotingSession({ type: this.sessionId });
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
    if (this.pageSection === PageSections.ANALYTICS) {
      this.extendDurationAt = this.votingSession.endsAt;
      this.extendDurationTimezone = this.votingSession.timezone;
    }
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
      this.location.replaceState(
        this.location.path().replace('/'.concat(this.votingSession.type), '/'.concat(this.votingSession.sessionId))
      );
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
    if ([PageSections.START, PageSections.IMMEDIATE, PageSections.ROLL_CALL].includes(this.pageSection))
      this.pageSection = PageSections.GENERAL;
  }
  async exitEditMode(): Promise<void> {
    const doExit = (): void => {
      if (this.editMode === UXMode.INSERT) this.app.goToInTabs(['voting'], { back: true });
      else {
        this.votingSession = this.entityBeforeChange;
        this.errors = new Set<string>();
        this.editMode = UXMode.VIEW;
        this.setUIHelpersForComplexFields();
        this.filterVoters(this.searchbar?.value);
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

  //
  // GENERAL
  //

  private setUIHelpersForComplexFields(): void {
    if (this.votingSession.publishedSince) {
      if (this.votingSession.publishedSince > new Date().toISOString())
        this.publishingOption = PublishingOptions.SCHEDULE;
      else this.publishingOption = PublishingOptions.PUBLISH;
    } else this.publishingOption = PublishingOptions.DRAFT;
    if (this.votingSession.type === VotingSessionTypes.ROLL_CALL)
      this.setRollCallFromParticipantVoters(this.votingSession.participantVoters);
    if (this.votingSession.type === VotingSessionTypes.IMMEDIATE) this.setImmediateFromResults(this.results);
  }

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
  async duplicateSession(): Promise<void> {
    const doDuplicate = async (): Promise<void> => {
      try {
        await this.loading.show();
        const copy = new VotingSession(this.votingSession);
        copy.name = `${copy.name} - ${this.t._('COMMON.COPY')}`;
        delete copy.publishedSince;
        delete copy.archivedAt;
        copy.load(await this._voting.insert(copy));
        this.message.success('COMMON.OPERATION_COMPLETED');
        this.app.goToInTabs(['voting', copy.sessionId, 'manage'], { root: true });
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DUPLICATE'), handler: doDuplicate }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
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
        text: this.t._('VOTING.BALLOT_TEMPLATES.YES_NO'),
        handler: (): Promise<void> => this.addBallotFromTemplate('yes-no')
      },
      {
        text: this.t._('VOTING.BALLOT_TEMPLATES.CANDIDATES_NONE'),
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
        options: [this.t._('COMMON.YES'), this.t._('COMMON.NO')]
      },
      candidates: {
        text: this.t._('VOTING.WHO_DO_YOU_ELECT_FOR_XYZ'),
        majorityType: VotingMajorityTypes.SIMPLE,
        options: [this.t._('VOTING.CANDIDATE_A'), this.t._('VOTING.CANDIDATE_B'), this.t._('VOTING.NONE_OF_THE_ABOVE')]
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
      if (!data) return;
      ballot.load(data);
      if (isNew) this.votingSession.ballots.push(ballot);
    });
    modal.present();
  }
  async removeBallot(ballot: VotingBallot): Promise<void> {
    const doRemove = (): void => {
      const index = this.votingSession.ballots.indexOf(ballot);
      if (index !== -1) this.votingSession.ballots.splice(index, 1);
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
    this.col = [];
    if (this.votingSession.hasStarted()) {
      this.col.push({
        prop: 'id',
        name: this.t._('VOTING.STARTED_VOTING').split(' ')[0],
        maxWidth: 100,
        pipe: { transform: id => (this.votingTickets?.find(v => id === v.voterId).signedInAt ? '✔️' : '') }
      });
      this.col.push({
        prop: 'id',
        name: this.t._('VOTING.VOTED'),
        maxWidth: 100,
        pipe: { transform: id => (this.votingTickets?.find(v => id === v.voterId).votedAt ? '✔️' : '') }
      });
    }
    this.col.push({ prop: 'id', name: this.t._('VOTING.VOTER_ID'), maxWidth: 150 });
    this.col.push({ prop: 'name', name: this.t._('VOTING.VOTER_NAME') });
    if (this.votingSession.isForm()) this.col.push({ prop: 'email', name: this.t._('VOTING.VOTER_EMAIL') });
    if (this.votingSession.isWeighted)
      this.col.push({ prop: 'voteWeight', name: this.t._('VOTING.VOTE_WEIGHT'), maxWidth: 150 });

    this.filterVoters(this.searchbar?.value);
    this.setVotersTableHeight();
  }

  @HostListener('window:resize', ['$event'])
  setVotersTableHeight(event?: Event): void {
    const toolbarBottom = document.getElementById('votersTableToolbar')?.getBoundingClientRect().bottom;
    const currentPageHeight = event?.target ? (event.target as Window).innerHeight : window.innerHeight;
    const heightAvailableInPx = currentPageHeight - toolbarBottom - this.headerHeight - this.footerHeight;
    this.limit = Math.floor(heightAvailableInPx / this.rowHeight);
  }

  filterVoters(searchText?: string, stayInPage = false): void {
    searchText = (searchText ?? '').toLowerCase();

    this.filteredVoters = this.votingSession.voters.filter(x =>
      [x.id, x.name, x.email, x.voteWeight].filter(f => f).some(f => String(f).toLowerCase().includes(searchText))
    );

    this.calcVotersFooterTotals();

    if (this.table && !stayInPage) this.table.offset = 0;
  }
  calcVotersFooterTotals(): void {
    const votersNames = this.votingSession.voters.map(x => x.name);
    this.numDuplicatedNames = votersNames.length - new Set(votersNames).size;
    const votersEmails = this.votingSession.voters.map(x => x.email?.toLowerCase()).filter(x => x);
    this.numDuplicatedEmails = votersEmails.length - new Set(votersEmails).size;
    this.numMissingEmails = this.votingSession.voters.filter(x => !x.email).length;
    this.totalWeights = this.votingSession.getTotWeights();
  }

  async manageVoter(voter: Voter, isNew = false): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ManageVoterStandaloneComponent,
      componentProps: { voter, votingSession: this.votingSession, editMode: this.editMode }
    });
    modal.onDidDismiss().then(({ data }): void => {
      if (!data) return;
      voter.load(data, this.votingSession);
      if (voter.id === 'DELETE' && !isNew) {
        const index = this.votingSession.voters.indexOf(voter);
        if (index !== -1) this.votingSession.voters.splice(index, 1);
      } else if (voter.id !== 'DELETE' && isNew && !this.votingSession.voters.some(x => x.id === voter.id))
        this.votingSession.voters.push(voter);
      this.filterVoters(this.searchbar?.value, true);
    });
    modal.present();
  }
  async addVoter(): Promise<void> {
    await this.manageVoter(new Voter(null, this.votingSession), true);
  }

  async actionsOnVoters(): Promise<void> {
    const header = this.t._('COMMON.ACTIONS');
    const buttons = [];
    if (this.editMode)
      buttons.push({
        text: this.t._('VOTING.IMPORT_VOTERS'),
        icon: 'cloud-upload',
        handler: (): Promise<void> => this.importVoters()
      });
    buttons.push({
      text: this.t._('VOTING.EXPORT_VOTERS'),
      icon: 'cloud-download',
      handler: (): void => this.exportVoters()
    });
    if (this.editMode)
      buttons.push({
        text: this.t._('VOTING.REMOVE_ALL_VOTERS'),
        icon: 'trash',
        role: 'destructive',
        handler: (): Promise<void> => this.removeAllVoters()
      });
    buttons.push({ text: this.t._('COMMON.CANCEL'), role: 'cancel', icon: 'arrow-undo' });

    const actions = await this.actionsCtrl.create({ header, buttons });
    actions.present();
  }
  private async importVoters(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ImportVotersStandaloneComponent,
      componentProps: { votingSession: this.votingSession }
    });
    modal.onDidDismiss().then(({ data: voters }): void => {
      if (!voters) return;
      this.votingSession.voters = voters;
      this.filterVoters();
    });
    modal.present();
  }
  private exportVoters(): void {
    const sessionName = this.votingSession.name.replace(/[^\w\s]/g, '');
    const filename = `${sessionName} - ${this.t._('VOTING.VOTERS')}.xlsx`;
    this._voting.downloadVotersSpreadsheet(filename, this.votingSession);
  }
  private async removeAllVoters(): Promise<void> {
    const doRemove = (): void => {
      this.votingSession.voters = [];
      this.filterVoters();
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.REMOVE'), handler: doRemove }
    ];
    const alert = await this.alertCtrl.create({ header, buttons });
    alert.present();
  }

  //
  // START
  //

  private getDuplicatesOfList(list: string[], includeEmptyElements = false): string[] {
    if (!includeEmptyElements) list = list.filter(x => x);
    const uniqueStack = new Set(list);
    return Array.from(
      new Set(
        list.filter(x => {
          if (uniqueStack.has(x)) uniqueStack.delete(x);
          else return true;
        })
      )
    );
  }
  getVotersDuplicatedIds(): string[] {
    return this.getDuplicatesOfList(this.votingSession.voters.map(x => x.id?.trim()));
  }
  getVotersDuplicatedNames(): string[] {
    return this.getDuplicatesOfList(this.votingSession.voters.map(x => x.name?.trim().toLowerCase()));
  }
  getVotersDuplicatedEmails(): string[] {
    return this.getDuplicatesOfList(this.votingSession.voters.map(x => x.email?.trim().toLowerCase()));
  }
  getNameOfVotersWithoutEmail(): string[] {
    return this.votingSession.voters.filter(x => !x.email).map(x => x.name);
  }
  async startSession(): Promise<void> {
    const session = new VotingSession(this.votingSession);
    if (this.votingSession.isForm()) session.startsAt = new Date().toISOString();

    this.errors = new Set(session.validate());
    if (this.errors.size) return this.message.warning('COMMON.FORM_HAS_ERROR_TO_CHECK');

    if (this.votingSession.type === VotingSessionTypes.IMMEDIATE) {
      this.pageSection = PageSections.IMMEDIATE;
      this.immediateInProgress = true;
    } else if (this.votingSession.type === VotingSessionTypes.ROLL_CALL) {
      this.pageSection = PageSections.ROLL_CALL;
      this.rollCallInProgress = true;
    } else {
      const doStart = async (): Promise<void> => {
        try {
          await this.loading.show();
          this.votingSession.load(await this._voting.start(session));
          this.message.success('VOTING.VOTE_IS_STARTING');
          this.pageSection = PageSections.ANALYTICS;
          this.votingTickets = await this._voting.getVotingTicketsStatus(this.votingSession);
          this.openWebSocketForVotingTicketsStatus();
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
  }
  canSessionStart(): boolean {
    this.errors = new Set(this.votingSession.validate(true));

    if (this.votingSession.isForm()) {
      if (!this.votingSession.endsAt) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        this.votingSession.endsAt = now.toISOString();
      }
      if (!this.votingSession.timezone) this.votingSession.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    return this.errors.size === 0;
  }

  //
  // ANALYTICS
  //

  async extendDuration(): Promise<void> {
    if (!this.votingSession.isInProgress()) return;

    this.errors = new Set();
    if (!this.votingSession.endsAt || this.extendDurationAt < this.votingSession.endsAt)
      this.errors.add('extendDurationAt');
    if (!this.votingSession.timezone) this.errors.add('extendDurationTimezone');

    if (this.errors.size) return this.message.warning('COMMON.FORM_HAS_ERROR_TO_CHECK');

    const doExtend = async (): Promise<void> => {
      try {
        await this.loading.show();
        const session = new VotingSession(this.votingSession);
        session.endsAt = this.extendDurationAt;
        session.timezone = this.extendDurationTimezone;
        this.votingSession.load(await this._voting.extendDuration(session));
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('VOTING.EXTEND_DURATION');
    const message = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), handler: doExtend }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  async stopSessionPrematurely(): Promise<void> {
    if (!this.votingSession.isInProgress()) return;

    const doEnd = async (): Promise<void> => {
      try {
        await this.loading.show();
        this.votingSession.load(await this._voting.stopPrematurely(this.votingSession));
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };

    const header = this.t._('VOTING.STOP_PREMATURELY');
    const message = this.t._('COMMON.ARE_YOU_SURE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), handler: doEnd }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  private openWebSocketForVotingTicketsStatus(): void {
    if (!this.webSocket.isOpen())
      this.webSocket.open({
        openParams: { type: WebSocketConnectionTypes.VOTING_TICKETS, referenceId: this.sessionId },
        onMessage: message => this.handleMessageFromWebSocket(message)
      });
  }
  private handleMessageFromWebSocket(webSocketMessage: WebSocketMessage): void {
    const votingTicket = new VotingTicket(webSocketMessage.item);
    this.votingTickets.find(x => x.voterId === votingTicket.voterId)?.load(votingTicket);
    this.checkWhetherSessionShouldEndEarly();
  }
  getNumVotersWhoSignedIn(): number {
    return this.votingTickets?.filter(x => x.signedInAt).length;
  }
  getNumVotersWhoVoted(): number {
    return this.votingTickets?.filter(x => x.votedAt).length;
  }
  private async checkWhetherSessionShouldEndEarly(): Promise<void> {
    if (!this.votingTickets || !this.votingSession.isInProgress()) return;
    const everyoneVoted = this.votingTickets.filter(x => x.votedAt).length === this.votingSession.voters.length;
    if (everyoneVoted)
      this.votingSession.load(await this._voting.checkWhetherSessionShouldEndEarly(this.votingSession));
  }
  async showResults(): Promise<void> {
    if (!this.votingSession.hasEnded() || this.results) return;
    try {
      await this.loading.show();
      this.results = await this._voting.getVotesBeforeTheyArePublished(this.votingSession);
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
  async publishResults(): Promise<void> {
    const doPublish = async (): Promise<void> => {
      try {
        await this.loading.show();
        this.votingSession.load(await this._voting.publishVotingFormResults(this.votingSession));
        this.results = this.votingSession.results;
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const message = this.t._('VOTING.PUBLISH_RESULTS_I');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), handler: doPublish }
    ];
    const alert = await this.alertCtrl.create({ header, message, buttons });
    alert.present();
  }
  downloadResults(): void {
    if (!this.results) return;

    const sessionName = this.votingSession.name.replace(/[^\w\s]/g, '');
    const filename = `${sessionName} - ${this.t._('VOTING.RESULTS')}.xlsx`;
    this._voting.downloadResultsSpreadsheet(filename, this.votingSession, this.results);
  }
  downloadVotersAudit(): void {
    if (!this.votingTickets) return;

    const sessionName = this.votingSession.name.replace(/[^\w\s]/g, '');
    const filename = `${sessionName} - ${this.t._('VOTING.VOTERS_AUDIT')}.xlsx`;
    this._voting.downloadVotersAuditSpreadsheet(filename, this.votingTickets);
  }

  //
  // IMMEDIATE
  //

  getImmediateOfBallot(bIndex: number): Record<string, number> {
    if (!this.immediateByBallot[bIndex]) this.immediateByBallot[bIndex] = {};
    return this.immediateByBallot[bIndex];
  }
  getNumVotersPresentToImmediateBallotByIndex(bIndex: number): number {
    const immediateOfBallot = this.getImmediateOfBallot(bIndex);
    const absentIndex = this.votingSession.ballots[bIndex].options.length + 1;
    return this.votingSession.voters.filter(
      x => immediateOfBallot[x.id] !== undefined && Number(immediateOfBallot[x.id]) !== absentIndex
    ).length;
  }
  getResultsAndParticipantsFromImmediate(): { results: VotingResults; participantVoters: string[] } {
    const results: VotingResults = [];
    const participantVoters = new Set<string>();
    const sumOfWeights = this.votingSession.getTotWeights();
    const balancedWeights: Record<string, number> = {};
    this.votingSession.voters.forEach(
      voter => (balancedWeights[voter.id] = (this.votingSession.isWeighted ? voter.voteWeight : 1) / sumOfWeights)
    );
    this.votingSession.ballots.forEach((_, bIndex): void => {
      results[bIndex] = [];
      [...this.votingSession.ballots[bIndex].options, 'Abstain', 'Absent'].forEach((_, oIndex): void => {
        results[bIndex][oIndex] = { value: 0, voters: [] };
      });
      const immediateOfBallot = this.getImmediateOfBallot(bIndex);
      const absentIndex = this.votingSession.ballots[bIndex].options.length + 1;
      this.votingSession.voters.forEach(voter => {
        const oResult = immediateOfBallot[voter.id] ?? absentIndex;
        const vRes = results[bIndex][oResult];
        vRes.value += balancedWeights[voter.id];
        vRes.voters.push(voter.name);
        if (oResult !== absentIndex) participantVoters.add(voter.name);
      });
    });
    return { results, participantVoters: Array.from(participantVoters) };
  }
  setImmediateFromResults(results: VotingResults): void {
    this.immediateByBallot = [];
    if (!results) return;
    results.forEach((bResult, bIndex): void => {
      this.immediateByBallot[bIndex] = {};
      bResult.forEach((oResult, oIndex): void => {
        oResult.voters.forEach(voterName => {
          const voter = this.votingSession.voters.find(x => x.name === voterName);
          if (voter) this.immediateByBallot[bIndex][voter.id] = oIndex;
        });
      });
    });
  }
  async cancelImmediate(): Promise<void> {
    const doCancel = (): void => {
      this.immediateInProgress = false;
      this.setImmediateFromResults(this.results);
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const subHeader = this.t._('COMMON.ALL_CHANGES_WILL_BE_LOST');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doCancel }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, buttons });
    alert.present();
  }
  async saveImmediate(publish = false, nextIndex?: number): Promise<void> {
    const doSave = async (): Promise<void> => {
      try {
        await this.loading.show();
        const { results, participantVoters } = this.getResultsAndParticipantsFromImmediate();
        const votingSession = new VotingSession({ ...this.votingSession, results, participantVoters });
        this.votingSession.load(await this._voting.setImmediateResults(votingSession, publish));
        this.results = this.votingSession.results;
        if (nextIndex !== undefined) {
          if (this.immediateAccordion) this.immediateAccordion.value = String(nextIndex);
        } else {
          this.immediateInProgress = false;
          this.setImmediateFromResults(this.results);
          this.message.success('COMMON.OPERATION_COMPLETED');
        }
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._(publish ? 'VOTING.PUBLISH_RESULTS' : 'COMMON.SAVE');
    const subHeader = this.t._(publish ? 'COMMON.ARE_YOU_DONE' : 'COMMON.ARE_YOU_SURE');
    const message =
      nextIndex !== undefined ? undefined : this.t._('VOTING.YOU_CAN_CHANGE_CONTENTS_STARTING_SESSION_AGAIN');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._(publish ? 'VOTING.PUBLISH_RESULTS' : 'COMMON.SAVE'), handler: doSave }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, message, buttons });
    alert.present();
  }

  //
  // ROLL CALL
  //

  getNumVotersPresentToRollCall(): number {
    return this.votingSession.voters.filter(x => this.rollCall[x.id]).length;
  }
  getResultsAndParticipantsFromRollCall(): { results: VotingResults; participantVoters: string[] } {
    const increment = 1 / this.votingSession.voters.length;
    // roll calls have a static 1-ballot 1-option in terms of data structure
    const results: VotingResults = [[{ value: 0, voters: [] }]];
    const participantVoters = [];
    this.votingSession.voters
      .filter(x => this.rollCall[x.id])
      .forEach(x => {
        participantVoters.push(x.name);
        results[0][0].value += increment;
      });
    return { results, participantVoters };
  }
  setRollCallFromParticipantVoters(participantVoters: string[]): void {
    this.rollCall = {};
    if (!participantVoters) return;
    participantVoters.forEach(voterName => {
      const voter = this.votingSession.voters.find(x => x.name === voterName);
      if (voter) this.rollCall[voter.id] = true;
    });
  }
  async cancelRollCall(): Promise<void> {
    const doCancel = (): void => {
      this.rollCallInProgress = false;
      this.setRollCallFromParticipantVoters(this.votingSession.participantVoters);
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const subHeader = this.t._('COMMON.ALL_CHANGES_WILL_BE_LOST');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.CONFIRM'), role: 'destructive', handler: doCancel }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, buttons });
    alert.present();
  }
  async saveRollCall(publish = false): Promise<void> {
    const doSave = async (): Promise<void> => {
      try {
        await this.loading.show();
        const { results, participantVoters } = this.getResultsAndParticipantsFromRollCall();
        const votingSession = new VotingSession({ ...this.votingSession, results, participantVoters });
        this.votingSession.load(await this._voting.setImmediateResults(votingSession, publish));
        this.results = this.votingSession.results;
        this.rollCallInProgress = false;
        this.setRollCallFromParticipantVoters(this.votingSession.participantVoters);
        this.message.success('COMMON.OPERATION_COMPLETED');
      } catch (error) {
        this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        this.loading.hide();
      }
    };
    const header = this.t._(publish ? 'VOTING.PUBLISH_RESULTS' : 'COMMON.SAVE');
    const subHeader = this.t._(publish ? 'COMMON.ARE_YOU_DONE' : 'COMMON.ARE_YOU_SURE');
    const message = this.t._('VOTING.YOU_CAN_CHANGE_CONTENTS_STARTING_SESSION_AGAIN');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._(publish ? 'VOTING.PUBLISH_RESULTS' : 'COMMON.SAVE'), handler: doSave }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, message, buttons });
    alert.present();
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
  START = 'START',
  ANALYTICS = 'ANALYTICS',
  IMMEDIATE = 'IMMEDIATE',
  ROLL_CALL = 'ROLL_CALL'
}
