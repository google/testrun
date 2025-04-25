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
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  TestRunService,
  UNAVAILABLE_VERSION,
} from '../../services/test-run.service';
import { ConsentDialogResult, Version } from '../../model/version';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { tap } from 'rxjs/internal/operators/tap';

import { Observable } from 'rxjs/internal/Observable';
import { Subject } from 'rxjs/internal/Subject';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { filter, timer } from 'rxjs';
import { ConsentDialogComponent } from './consent-dialog/consent-dialog.component';
import { LocalStorageService } from '../../services/local-storage.service';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
declare const gtag: Function;
@Component({
  selector: 'app-version',

  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './version.component.html',
  styleUrls: ['./version.component.scss'],
})
export class VersionComponent implements OnInit, OnDestroy {
  private testRunService = inject(TestRunService);
  private localStorageService = inject(LocalStorageService);
  dialog = inject(MatDialog);

  @Input() consentShown!: boolean;
  @Output() consentShownEvent = new EventEmitter<void>();
  version$!: Observable<Version | null>;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  ngOnInit() {
    this.testRunService.fetchVersion();

    this.version$ = this.testRunService.getVersion().pipe(
      filter(version => version !== null),
      tap(version => {
        if (!this.consentShown) {
          timer(2000).subscribe(() => {
            this.openConsentDialog(version);
            this.consentShownEvent.emit();
          });
        }
        // @ts-expect-error data layer is not null
        window.dataLayer.push({
          event: 'testrun_version',
          testrunVersion: version?.installed_version,
        });
      })
    );
  }

  getVersionButtonLabel(installedVersion: Version): string {
    if (
      installedVersion.installed_version ===
      UNAVAILABLE_VERSION.installed_version
    ) {
      return 'Version temporarily unavailable. Click to open the Welcome modal';
    }
    if (installedVersion.update_available) {
      return `${installedVersion.installed_version} New version is available. Click to update`;
    }
    return `${installedVersion.installed_version}. Click to open the Welcome modal`;
  }

  openConsentDialog(version: Version) {
    const dialogData = {
      version,
      optOut: !this.localStorageService.getGAConsent(),
    };
    const dialogRef = this.dialog.open(ConsentDialogComponent, {
      ariaLabel: 'Welcome to Testrun modal window',
      data: dialogData,
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'consent-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((dialogResult: ConsentDialogResult) => {
        if (dialogResult.grant === null) {
          return;
        }
        gtag('consent', 'update', {
          analytics_storage: dialogResult.grant ? 'granted' : 'denied',
        });
        this.localStorageService.setGAConsent(dialogResult.grant);
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
