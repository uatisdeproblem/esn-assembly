import { Component } from '@angular/core';

import { AppService } from '@app/app.service';

import { Topic } from '@models/topic.model';
import { Question } from '@models/question.model';

@Component({
  selector: 'topic',
  templateUrl: 'topic.page.html',
  styleUrls: ['topic.page.scss']
})
export class TopicPage {
  topic: Topic = new Topic({
    topicId: 't1',
    name: 'GA Secretary: Matteo Carbone',
    description:
      'ESN Moderna, Italy\n\nCiao, beautiful people!\n\nFollowing a magical Erasmus experience in Sweden, I joined ESN Modena (<3) in 2016 and have enjoyed volunteering throughout the three levels of our Network since then. I’m a proud nerd, and my love for technology is only comparable to the cherishing of travelling and experiencing new things. In fact, it’s easier to find me working with my computer — Rock music in my earphones — all around Europe rather than at home or my office.\n\nI adore ESN because it brings us together and pushes us towards our better selves while doing something valuable for others. For this reason, even after several years of local, national and international events and roles, I’m still boosted with energy whenever I have the chance to work or meet with old and new volunteers to grow together and create a positive impact.\n\nHugs!',
    event: { eventId: 'e1', name: 'GA Spring 2022' },
    category: { categoryId: 'c2', name: 'Chairing Team', color: 'ESNdarkBlue' },
    subjects: [
      {
        username: 'mc',
        name: 'Matteo Carbone',
        section: 'ESN Modena',
        country: 'ESN Italy',
        avatarURL: 'https://matteocarbone.com/media/MC.png'
      }
    ],
    numOfQuestions: 2,
    attachments: [
      { name: 'Motivation letter', format: 'pdf' },
      { name: 'CV', format: 'pdf' }
    ]
  });
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

  constructor(public app: AppService) {}
  selectQuestion(question: Question): void {
    this.currentQuestion = question;
  }

  manageTopic(): void {
    this.app.goToInTabs(['topics', this.topic.topicId, 'manage']);
  }
}
