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
  OnDestroy,
  OnInit,
} from '@angular/core';
import { RiskAssessmentStore } from './risk-assessment.store';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { FocusManagerService } from '../../services/focus-manager.service';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-risk-assessment',
  templateUrl: './risk-assessment.component.html',
  styleUrl: './risk-assessment.component.scss',
  providers: [RiskAssessmentStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskAssessmentComponent implements OnInit, OnDestroy {
  viewModel$ = this.store.viewModel$;
  isOpenProfileForm = false;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  constructor(
    private store: RiskAssessmentStore,
    public dialog: MatDialog,
    private focusManagerService: FocusManagerService,
    private liveAnnouncer: LiveAnnouncer
  ) {}

  ngOnInit() {
    this.store.getProfilesFormat();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  async openForm() {
    this.isOpenProfileForm = true;
    await this.liveAnnouncer.announce('Risk assessment questionnaire');
    this.focusManagerService.focusFirstElementInContainer();
  }

  deleteProfile(profileName: string, index: number): void {
    const dialogRef = this.dialog.open(DeleteFormComponent, {
      ariaLabel: 'Delete risk profile',
      data: {
        title: 'Delete risk profile',
        content: `You are about to delete ${profileName}. Are you sure?`,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'delete-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(deleteProfile => {
        if (deleteProfile) {
          this.store.deleteProfile(profileName);
          this.setFocus(index);
        }
      });
  }

  private setFocus(index: number): void {
    const nextItem = window.document.querySelector(
      `.profile-item-${index + 1}`
    ) as HTMLElement;
    const firstItem = window.document.querySelector(
      `.profile-item-0`
    ) as HTMLElement;

    this.store.setFocus({ nextItem, firstItem });
  }
}
