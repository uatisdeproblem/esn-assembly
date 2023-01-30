import { Component } from '@angular/core';

import { AppService } from '@app/app.service';

import { Topic } from '@models/topic.model';

@Component({
  selector: 'topics',
  templateUrl: 'topics.page.html',
  styleUrls: ['topics.page.scss']
})
export class TopicsPage {
  topics: Topic[] = [
    {
      topicId: 't1',
      name: 'GA Secretary: Matteo Carbone',
      description:
        'ESN Moderna, Italy\n\nCiao, beautiful people!\n\nFollowing a magical Erasmus experience in Sweden, I joined ESN Modena (<3) in 2016 and have enjoyed volunteering throughout the three levels of our Network since then. I’m a proud nerd, and my love for technology is only comparable to the cherishing of travelling and experiencing new things. In fact, it’s easier to find me working with my computer — Rock music in my earphones — all around Europe rather than at home or my office.\n\nI adore ESN because it brings us together and pushes us towards our better selves while doing something valuable for others. For this reason, even after several years of local, national and international events and roles, I’m still boosted with energy whenever I have the chance to work or meet with old and new volunteers to grow together and create a positive impact.\n\nHugs!',
      event: { eventId: 'e1', name: 'GA Spring 2023' },
      category: { categoryId: 'c2', name: 'Chairing Team', color: 'ESNdarkBlue' },
      subjects: [{ username: 'mc', name: 'Matteo Carbone', avatarURL: 'https://matteocarbone.com/media/MC.png' }],
      numOfQuestions: 2
    },
    {
      topicId: 't2',
      name: 'IB President: Juan Rayon',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sed erat et nulla hendrerit lacinia ac eu metus. Mauris at sapien urna. Sed dictum risus ipsum, id tempus diam molestie elementum. Curabitur quis augue blandit nibh posuere semper. Proin condimentum sagittis hendrerit. Duis ut magna a lectus euismod gravida et eget nisl. Curabitur sed odio non lorem rhoncus vestibulum in non massa.',
      event: { eventId: 'e1', name: 'GA Spring 2023' },
      category: { categoryId: 'c1', name: 'International Board', color: 'ESNpink' },
      subjects: [{ username: 'mc', name: 'Juan Rayon', avatarURL: null }],
      numOfQuestions: 2
    },
    {
      topicId: 't3',
      name: 'OC EGM 2024',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sed erat et nulla hendrerit lacinia ac eu metus. Mauris at sapien urna. Sed dictum risus ipsum, id tempus diam molestie elementum. Curabitur quis augue blandit nibh posuere semper. Proin condimentum sagittis hendrerit. Duis ut magna a lectus euismod gravida et eget nisl. Curabitur sed odio non lorem rhoncus vestibulum in non massa.',
      event: { eventId: 'e1', name: 'GA Spring 2023' },
      category: { categoryId: 'c1', name: 'Event', color: 'ESNorange' },
      subjects: [
        { username: 'mc', name: 'Juan Rayon', avatarURL: null },
        { username: 'mc', name: 'MC', avatarURL: null }
      ],
      numOfQuestions: 2,
      closedAt: Date.now()
    }
  ].map(x => new Topic(x));

  constructor(public app: AppService) {}
  ionViewDidEnter(): void {
    console.log(this.app.user);
  }

  openTopic(topic: Topic): void {
    this.app.goToInTabs(['topics', topic.topicId]);
  }
  addTopic(): void {
    this.app.goToInTabs(['topics', 'new', 'manage']);
  }
}
