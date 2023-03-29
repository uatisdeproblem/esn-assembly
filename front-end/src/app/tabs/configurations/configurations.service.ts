import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Configurations } from '@models/configurations.model';

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
   * Set a new email template.
   */
  async setEmailTemplate(template: EmailTemplates, subject: string, content: string): Promise<void> {
    const action = 'SET_EMAIL_TEMPLATE_'.concat(template);
    await this.api.patchResource('configurations', { body: { action, subject, content } });
  }
  /**
   * Reset the email template.
   */
  async resetEmailTemplate(template: EmailTemplates): Promise<void> {
    const action = 'RESET_EMAIL_TEMPLATE_'.concat(template);
    await this.api.patchResource('configurations', { body: { action } });
  }
  /**
   * Get the email template.
   */
  async getEmailTemplate(template: EmailTemplates): Promise<{ subject: string; content: string }> {
    const action = 'GET_EMAIL_TEMPLATE_'.concat(template);
    return await this.api.patchResource('configurations', { body: { action } });
  }
  /**
   * Test the email template.
   */
  async testEmaiTemplate(template: EmailTemplates): Promise<void> {
    const action = 'TEST_EMAIL_TEMPLATE_'.concat(template);
    return await this.api.patchResource('configurations', { body: { action } });
  }
}

/**
 * The possible email templates.
 */
export enum EmailTemplates {
  QUESTIONS = 'QUESTIONS',
  ANSWERS = 'ANSWERS'
}
