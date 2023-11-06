import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Configurations, EmailTemplates } from '@models/configurations.model';

@Injectable({ providedIn: 'root' })
export class ConfigurationsService {
  constructor(private api: IDEAApiService) {}

  /**
   * Load the platform's configurations from the back-end.
   */
  async get(): Promise<Configurations> {
    return new Configurations(await this.api.getResource('configurations'));
  }

  /**
   * Update the configurations.
   */
  async update(configurations: Configurations): Promise<Configurations> {
    return new Configurations(await this.api.putResource('configurations', { body: configurations }));
  }
  /**
   * Ban a user by its ID.
   */
  async banUserByID(userId: string): Promise<void> {
    const config = await this.get();
    if (config.bannedUsersIds.includes(userId)) return;
    config.bannedUsersIds.push(userId);
    await this.update(config);
  }

  /**
   * Set a new email template.
   */
  async setEmailTemplate(template: EmailTemplates, subject: string, content: string): Promise<void> {
    const action = 'SET_EMAIL_TEMPLATE';
    await this.api.patchResource('configurations', { body: { action, template, subject, content } });
  }
  /**
   * Reset the email template.
   */
  async resetEmailTemplate(template: EmailTemplates): Promise<void> {
    const action = 'RESET_EMAIL_TEMPLATE';
    await this.api.patchResource('configurations', { body: { action, template } });
  }
  /**
   * Get the email template.
   */
  async getEmailTemplate(template: EmailTemplates): Promise<{ subject: string; content: string }> {
    const action = 'GET_EMAIL_TEMPLATE';
    return await this.api.patchResource('configurations', { body: { action, template } });
  }
  /**
   * Test the email template.
   */
  async testEmaiTemplate(template: EmailTemplates): Promise<void> {
    const action = 'TEST_EMAIL_TEMPLATE';
    return await this.api.patchResource('configurations', { body: { action, template } });
  }
}
