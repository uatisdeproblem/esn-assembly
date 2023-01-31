import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Browser } from '@capacitor/browser';
import { IDEALoadingService, IDEAMessageService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { TopicsService } from './topics.service';
import { AttachmentsService } from 'src/app/common/attachments.service';

import { Topic } from '@models/topic.model';
import { Question } from '@models/question.model';
import { Attachment } from 'idea-toolbox';

@Component({
  selector: 'topic',
  templateUrl: 'topic.page.html',
  styleUrls: ['topic.page.scss']
})
export class TopicPage {
  topic: Topic;
  questions: Question[] = [
    {
      topicId: 't1',
      questionId: 'q1',
      summary: 'What do you think about the budget',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sed erat et nulla hendrerit lacinia ac eu metus. Mauris at sapien urna. Sed dictum risus ipsum, id tempus diam molestie elementum. Curabitur quis augue blandit nibh posuere semper. Proin condimentum sagittis hendrerit. Duis ut magna a lectus euismod gravida et eget nisl. Curabitur sed odio non lorem rhoncus vestibulum in non massa.',
      creator: {
        username: 'mc',
        name: 'Giovanni Telesca',
        country: 'ESN Italy',
        section: 'ESN Chieti Pescara',
        avatarURL: null
      },
      createdAt: Date.now(),
      numOfMessages: 0,
      numOfUpvotes: 0
    },
    {
      topicId: 't1',
      questionId: 'q2',
      summary: 'A silly question',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sed erat et nulla hendrerit lacinia ac eu metus. Mauris at sapien urna. Sed dictum risus ipsum, id tempus diam molestie elementum. Curabitur quis augue blandit nibh posuere semper. Proin condimentum sagittis hendrerit. Duis ut magna a lectus euismod gravida et eget nisl. Curabitur sed odio non lorem rhoncus vestibulum in non massa.',
      creator: {
        username: 'mc',
        name: 'Random Dude',
        country: 'ESN Italy',
        section: 'ESN Canicattì',
        avatarURL: null
      },
      createdAt: Date.now(),
      numOfMessages: 1,
      numOfUpvotes: 2
    }
  ].map(x => new Question(x));

  currentQuestion: Question;

  constructor(
    private route: ActivatedRoute,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _topics: TopicsService,
    private _attachments: AttachmentsService,
    public app: AppService
  ) {}
  async ionViewWillEnter(): Promise<void> {
    const topicId = this.route.snapshot.paramMap.get('topicId');
    try {
      await this.loading.show();
      this.topic = await this._topics.getById(topicId);
    } catch (error) {
      this.message.error('COMMON.NOT_FOUND');
    } finally {
      this.loading.hide();
    }
  }

  selectQuestion(question: Question): void {
    this.currentQuestion = question;
  }

  manageTopic(): void {
    this.app.goToInTabs(['topics', this.topic.topicId, 'manage']);
  }

  async downloadAttachment(attachment: Attachment): Promise<void> {
    try {
      await this.loading.show();
      const url = await this._attachments.download(attachment);
      await Browser.open({ url });
    } catch (error) {
      this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      this.loading.hide();
    }
  }
}
