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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestRunService } from '../../services/test-run.service';
import { Version } from '../../model/version';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UpdateDialogComponent } from './update-dialog/update-dialog.component';
import { tap } from 'rxjs/internal/operators/tap';

import { Observable } from 'rxjs/internal/Observable';
import { Subject } from 'rxjs/internal/Subject';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';

@Component({
  selector: 'app-version',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './version.component.html',
  styleUrls: ['./version.component.scss'],
})
export class VersionComponent implements OnInit, OnDestroy {
  version$!: Observable<Version | null>;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  private isDialogClosed = false;

  constructor(
    private testRunService: TestRunService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.testRunService.fetchVersion();

    this.version$ = this.testRunService.getVersion().pipe(
      tap(version => {
        if (version?.update_available && !this.isDialogClosed) {
          this.openUpdateWindow(version);
        }
      })
    );
  }

  openUpdateWindow(version: Version) {
    const dialogRef = this.dialog.open(UpdateDialogComponent, {
      ariaLabel: 'Update version',
      data: version,
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'version-update-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => (this.isDialogClosed = true));
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
