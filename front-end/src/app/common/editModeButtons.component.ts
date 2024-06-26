import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AppService } from '../app.service';

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
   * If set, no buttons are shown.
   */
  @Input() noInteraction = false;
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
