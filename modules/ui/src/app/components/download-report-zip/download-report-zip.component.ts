/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Profile } from '../../model/profile';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DownloadZipModalComponent } from '../download-zip-modal/download-zip-modal.component';
import { ReportActionComponent } from '../report-action/report-action.component';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { TestingType } from '../../model/device';

@Component({
  selector: 'app-download-report-zip',
  templateUrl: './download-report-zip.component.html',
  styleUrl: './download-report-zip.component.scss',

  imports: [MatTooltipModule],
  providers: [DatePipe, MatTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadReportZipComponent
  extends ReportActionComponent
  implements OnInit
{
  dialog = inject(MatDialog);
  tooltip = inject(MatTooltip);

  @Input() profiles: Profile[] = [];
  @Input() report: string | null | undefined = null;
  @Input() export: string | null | undefined = null;
  /**
   * Where focus goes when the ZIP dialog closes. By default, the element that
   * had focus when it opened; a menu passes its trigger instead, because it
   * removes this item when it closes.
   */
  @Input() restoreFocus: MatDialogConfig['restoreFocus'] = true;

  @HostListener('click', ['$event'])
  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    this.dialog.open(DownloadZipModalComponent, {
      // Named by its `mat-dialog-title`, "Download ZIP file", which an
      // `ariaLabel` would override. Exposes the page behind as inert;
      // `mat-select` keeps its options reachable via the dialog's `aria-owns`.
      ariaModal: true,
      data: {
        profiles: this.profiles,
        report: this.report,
        export: this.export,
        isPilot: this.data?.device.test_pack === TestingType.Pilot,
        device: this.data?.device,
        started: this.data?.started,
      },
      autoFocus: true,
      restoreFocus: this.restoreFocus,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });
  }

  @HostBinding('tabIndex')
  readonly tabIndex = 0;

  /** A button by default; `menuitem` inside a menu. */
  @HostBinding('attr.role')
  @Input()
  role = 'button';

  @HostBinding('attr.aria-label')
  get ariaLabel(): string {
    return this.data
      ? `Download zip for Testrun # ${this.getTestRunId(this.data)}`
      : 'Download ZIP file';
  }

  @HostListener('mouseenter')
  @HostListener('keyup')
  onEvent(): void {
    this.tooltip.show();
  }

  @HostListener('mouseleave')
  @HostListener('keydown')
  outEvent(): void {
    this.tooltip.hide();
  }

  ngOnInit() {
    if (this.data) {
      this.tooltip.message = `Download zip for Testrun # ${this.getTestRunId(this.data)}`;
    }
  }

  constructor() {
    super();
  }
}
