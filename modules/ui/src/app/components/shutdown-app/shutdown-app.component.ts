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
  Input,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { TestRunService } from '../../services/test-run.service';
import { WINDOW } from '../../providers/window.provider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SimpleDialogComponent } from '../simple-dialog/simple-dialog.component';

@Component({
  selector: 'app-shutdown-app',

  imports: [CommonModule, MatButtonModule, MatIcon, MatTooltipModule],
  templateUrl: './shutdown-app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShutdownAppComponent implements OnDestroy {
  dialog = inject(MatDialog);
  private testRunService = inject(TestRunService);
  private window = inject<Window>(WINDOW);

  @Input() disable: boolean = false;

  private destroy$: Subject<boolean> = new Subject<boolean>();

  openShutdownModal() {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: 'Shutdown Testrun',
      data: {
        icon: 'power_settings_new',
        title: 'Shutdown Testrun?',
        content:
          'Testrun will shutdown and all testing processes will be stopped.',
        confirmName: 'Stop Server & Quit',
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: ['simple-dialog', 'shutdown-app-dialog'],
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shutdownApp => {
        if (shutdownApp) {
          this.shutdownApp();
        }
      });
  }

  private shutdownApp(): void {
    this.testRunService
      .shutdownTestrun()
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.reloadPage();
        }
      });
  }

  private reloadPage(): void {
    this.window.location.reload();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
