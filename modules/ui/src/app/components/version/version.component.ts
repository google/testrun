/*
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
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  TestRunService,
  UNAVAILABLE_VERSION,
} from '../../services/test-run.service';
import { Version } from '../../model/version';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { tap } from 'rxjs/internal/operators/tap';

import { Observable } from 'rxjs/internal/Observable';
import { Subject } from 'rxjs/internal/Subject';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { filter } from 'rxjs';
import { ConsentDialogComponent } from './consent-dialog/consent-dialog.component';

// eslint-disable-next-line @typescript-eslint/ban-types
declare const gtag: Function;
@Component({
  selector: 'app-version',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './version.component.html',
  styleUrls: ['./version.component.scss'],
})
export class VersionComponent implements OnInit, OnDestroy {
  @Input() consentShown!: boolean;
  @Output() consentShownEvent = new EventEmitter<void>();
  version$!: Observable<Version | null>;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private testRunService: TestRunService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.testRunService.fetchVersion();

    this.version$ = this.testRunService.getVersion().pipe(
      filter(version => version !== null),
      tap(version => {
        if (!this.consentShown) {
          // @ts-expect-error null is filtered
          this.openConsentDialog(version);
          this.consentShownEvent.emit();
        }
      })
    );
  }

  getVersionButtonLabel(installedVersion: string): string {
    return installedVersion === UNAVAILABLE_VERSION.installed_version
      ? 'Version temporarily unavailable. Click to open the Welcome modal'
      : `${installedVersion} New version is available. Click to update`;
  }

  openConsentDialog(version: Version) {
    const dialogRef = this.dialog.open(ConsentDialogComponent, {
      ariaLabel: 'Welcome to Testrun modal window',
      data: version,
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'consent-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((grant: boolean) => {
        if (grant === null) {
          return;
        }
        gtag('consent', 'update', {
          analytics_storage: grant ? 'granted' : 'denied',
        });
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
