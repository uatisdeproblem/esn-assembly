import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { AngularEditorConfig } from '@kolkov/angular-editor';

@Component({
  selector: 'app-html-editor',
  templateUrl: 'htmlEditor.component.html',
  styleUrls: ['htmlEditor.component.scss']
})
export class HTMLEditorComponent implements OnInit, OnChanges {
  /**
   * Whether the parent page is in editMode or not (simplified).
   */
  @Input() editMode = false;
  /**
   * The HTML content.
   */
  @Input() content: string;
  /**
   * Trigger when the HTML content changes.
   */
  @Output() contentChange = new EventEmitter<string>();

  text: string;

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: false,
    sanitize: true,
    rawPaste: false, // @todo temporarily disabled to allow candidates to copy/past their answers; let's see how it goes
    minHeight: '300px',
    toolbarHiddenButtons: [
      [
        'subscript',
        'superscript',
        'justifyLeft',
        'justifyCenter',
        'justifyRight',
        'justifyFull',
        'heading',
        'fontName'
      ],
      [
        'fontSize',
        'textColor',
        'backgroundColor',
        'customClasses',
        'insertImage',
        'insertVideo',
        'insertHorizontalRule',
        'toggleEditorMode'
      ]
    ]
  };

  sanitizedHtml: string;

  constructor(private sanitizer: DomSanitizer) {}
  ngOnInit(): void {
    this.text = this.content;
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.editMode) this.sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, this.content);
  }
}
