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
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  Injector,
  Input,
  inject,
  QueryList,
  viewChild,
  ViewChildren,
  AfterViewInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  ResultOfTestrun,
  TestrunStatus,
} from '../../../../model/testrun-status';
import { DownloadReportZipComponent } from '../../../../components/download-report-zip/download-report-zip.component';
import { Profile } from '../../../../model/profile';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { _IdGenerator, FocusKeyManager } from '@angular/cdk/a11y';
import { Directive, ElementRef } from '@angular/core';
import { FocusableOption } from '@angular/cdk/a11y';

@Directive({
  selector: '[appMenuItem]',
  standalone: true,
})
export class MenuItemDirective implements FocusableOption {
  constructor(public element: ElementRef) {}
  focus() {
    this.element.nativeElement.focus();
  }
}

export enum DownloadOption {
  PDF = 'PDF Report',
  ZIP = 'ZIP File',
}
@Component({
  selector: 'app-download-options',
  templateUrl: './download-options.component.html',
  styleUrl: './download-options.component.scss',
  imports: [
    MatButtonModule,
    MatIconModule,
    DownloadReportZipComponent,
    MenuItemDirective,
  ],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadOptionsComponent implements AfterViewInit {
  @ViewChildren(MenuItemDirective) items!: QueryList<MenuItemDirective>;

  private datePipe = inject(DatePipe);
  private injector = inject(Injector);
  private keyManager!: FocusKeyManager<MenuItemDirective>;
  /** The "Download" menu trigger. */
  private downloadButton = viewChild<MatButton>('downloadButton');

  isOpenDownloadOptions: boolean = false;
  @Input() profiles: Profile[] = [];
  @Input() data!: TestrunStatus;
  DownloadOption = DownloadOption;
  /** Names the menu via `aria-labelledby`. */
  readonly triggerId = inject(_IdGenerator).getId(
    'app-download-options-trigger-'
  );
  /** Referenced by the trigger's `aria-controls` while the menu is open. */
  readonly menuId = inject(_IdGenerator).getId('app-download-options-menu-');

  downloadPdf(data: TestrunStatus) {
    this.createLink(data);
    this.sendGAEvent(data);
  }

  createLink(data: TestrunStatus) {
    if (!data.report) {
      return;
    }
    const link = document.createElement('a');
    link.href = data.report;
    link.target = '_blank';
    link.download = this.getReportTitle(data);
    link.dispatchEvent(new MouseEvent('click'));
  }

  getReportTitle(data: TestrunStatus) {
    if (!data.device) {
      return '';
    }
    return `${data.device.manufacturer} ${data.device.model} ${
      data.device.firmware
    } ${data.status} ${this.getFormattedDateString(data.started)}`
      .replace(/ /g, '_')
      .toLowerCase();
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }

  sendGAEvent(data: TestrunStatus) {
    let event = 'download_report_pdf';
    if (data.result === ResultOfTestrun.Compliant) {
      event += '_compliant';
    } else if (data.result === ResultOfTestrun.NonCompliant) {
      event += '_non_compliant';
    }
    // @ts-expect-error data layer is not null
    window.dataLayer.push({
      event: event,
    });
  }

  openDownloadOptions(): void {
    if (this.isOpenDownloadOptions) {
      this.closeDownloadOptions();
      return;
    }
    this.isOpenDownloadOptions = true;
    // Like a native menu, move focus to the first item once it renders.
    afterNextRender(() => this.keyManager.setFirstItemActive(), {
      injector: this.injector,
    });
  }

  /**
   * Closes the menu and focuses "Download" first, so focus is not lost when
   * the focused menu item is removed.
   */
  closeDownloadOptions(): void {
    this.isOpenDownloadOptions = false;
    this.downloadButton()?.focus();
  }

  ngAfterViewInit() {
    this.keyManager = new FocusKeyManager(this.items)
      .withWrap()
      .withVerticalOrientation(true)
      .withHomeAndEnd();
  }

  handleKeydown(event: KeyboardEvent) {
    if (this.isOpenDownloadOptions) {
      this.keyManager.onKeydown(event);

      if (event.key === 'Tab' || event.key === 'Escape') {
        // Tab keeps its default action: focus moves on from "Download".
        this.closeDownloadOptions();
      }
    }
  }
}
