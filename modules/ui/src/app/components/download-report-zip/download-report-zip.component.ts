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
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Profile } from '../../model/profile';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { Routes } from '../../model/routes';
import { DownloadZipModalComponent } from '../download-zip-modal/download-zip-modal.component';
import { TestRunService } from '../../services/test-run.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-download-report-zip',
  templateUrl: './download-report-zip.component.html',
  styleUrl: './download-report-zip.component.scss',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadReportZipComponent implements OnDestroy {
  private destroy$: Subject<boolean> = new Subject<boolean>();
  @Input() hasProfiles: boolean = false;
  @Input() profiles: Profile[] = [];
  @Input() url: string | null | undefined = null;

  @HostListener('click', ['$event'])
  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const dialogRef = this.dialog.open(DownloadZipModalComponent, {
      ariaLabel: 'Download zip',
      data: {
        hasProfiles: this.hasProfiles,
        profiles: this.profiles,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        if (profile === undefined) {
          return;
        }
        if (profile === null) {
          this.route.navigate([Routes.RiskAssessment]);
        }

        if (this.url != null) {
          this.testrunService
            .downloadZip(this.getZipLink(this.url), profile)
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        }
      });
  }

  @HostBinding('tabIndex')
  readonly tabIndex = 0;

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  constructor(
    public dialog: MatDialog,
    private testrunService: TestRunService,
    private route: Router
  ) {}

  private getZipLink(reportURL: string): string {
    return reportURL.replace('report', 'export');
  }
}
