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
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestRunService } from '../../services/test-run.service';
import { Version } from '../../model/version';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UpdateDialogComponent } from './update-dialog/update-dialog.component';

@Component({
  selector: 'app-version',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './version.component.html',
  styleUrls: ['./version.component.scss'],
})
export class VersionComponent implements OnInit {
  version$: BehaviorSubject<Version | null>;

  constructor(
    private testRunService: TestRunService,
    public dialog: MatDialog
  ) {
    this.version$ = testRunService.getVersion();
  }

  ngOnInit() {
    this.testRunService.fetchVersion();
  }

  openUpdateWindow() {
    this.dialog.open(UpdateDialogComponent, {
      ariaLabel: 'Update version dialog',
      data: this.version$.value,
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'version-update-dialog',
    });
  }
}
