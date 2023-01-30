import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AppService } from '../app.service';

/**
 * Standard header for the pages, to handle the difference between mobile and desktop UI.
 */
@Component({
  selector: 'app-edit-mode-buttons',
  templateUrl: 'editModeButtons.component.html',
  styleUrls: ['editModeButtons.component.scss']
})
export class EditModeButtonsComponent {
  /**
   * Whether the parent page is in editMode or not (simplified).
   */
  @Input() editMode = false;
  /**
   * A title to show.
   */
  @Input() title: string;
  /**
   * Trigger for entering in edit mode.
   */
  @Output() enter = new EventEmitter<void>();
  /**
   * Trigger for exiting the edit mode without saving.
   */
  @Output() exit = new EventEmitter<void>();
  /**
   * Trigger for save and exiting the edit mode.
   */
  @Output() save = new EventEmitter<void>();

  constructor(public app: AppService) {}
}
