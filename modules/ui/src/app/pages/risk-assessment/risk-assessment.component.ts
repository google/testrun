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
  ViewContainerRef,
} from '@angular/core';
import { RiskAssessmentStore } from './risk-assessment.store';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { Subject, takeUntil, timer } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Profile, ProfileStatus } from '../../model/profile';
import { Observable } from 'rxjs/internal/Observable';
import { DeviceValidators } from '../devices/components/device-form/device.validators';
import { SuccessDialogComponent } from './components/success-dialog/success-dialog.component';

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
    private liveAnnouncer: LiveAnnouncer,
    public element: ViewContainerRef
  ) {}

  ngOnInit() {
    this.store.getProfilesFormat();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  async profileClicked(profile: Profile | null = null) {
    if (profile === null || profile.status !== ProfileStatus.EXPIRED) {
      await this.openForm(profile);
    }
  }

  async openForm(profile: Profile | null = null) {
    this.isOpenProfileForm = true;
    this.store.updateSelectedProfile(profile);
    await this.liveAnnouncer.announce('Risk assessment questionnaire');
    this.store.setFocusOnProfileForm();
  }

  async copyProfileAndOpenForm(profile: Profile) {
    await this.openForm(this.getCopyOfProfile(profile));
  }

  getCopyOfProfile(profile: Profile): Profile {
    const copyOfProfile = { ...profile };
    copyOfProfile.name = this.getCopiedProfileName(profile.name);
    delete copyOfProfile.created; // new profile is not create yet
    return copyOfProfile;
  }

  private getCopiedProfileName(name: string): string {
    name = `Copy of ${name}`;
    if (name.length > DeviceValidators.STRING_FORMAT_MAX_LENGTH) {
      name =
        name.substring(0, DeviceValidators.STRING_FORMAT_MAX_LENGTH - 3) +
        '...';
    }
    return name;
  }

  deleteProfile(
    profileName: string,
    index: number,
    selectedProfile: Profile | null
  ): void {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      data: {
        title: 'Delete risk profile?',
        content: `You are about to delete ${profileName}. Are you sure?`,
      },
      autoFocus: 'dialog',
      hasBackdrop: true,
      disableClose: true,
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(deleteProfile => {
        if (deleteProfile) {
          this.store.deleteProfile(profileName);
          this.closeFormAfterDelete(profileName, selectedProfile);
          this.setFocus(index);
        } else {
          this.store.setFocusOnSelectedProfile();
        }
      });
  }

  saveProfileClicked(profile: Profile, selectedProfile: Profile | null): void {
    this.liveAnnouncer.clear();
    if (!selectedProfile) {
      this.saveProfile(profile, this.store.setFocusOnCreateButton);
    } else if (this.compareProfiles(profile, selectedProfile)) {
      this.saveProfile(profile, this.store.setFocusOnSelectedProfile);
    } else {
      this.openSaveDialog(
        selectedProfile.name,
        profile.status === ProfileStatus.DRAFT
      )
        .pipe(takeUntil(this.destroy$))
        .subscribe(saveProfile => {
          if (saveProfile) {
            this.saveProfile(profile, this.store.setFocusOnSelectedProfile);
          }
        });
    }
  }

  private compareProfiles(profile1: Profile, profile2: Profile) {
    if (profile1.name !== profile2.name) {
      return false;
    }
    if (
      profile1.rename &&
      (profile1.rename !== profile1.name || profile1.rename !== profile2.name)
    ) {
      return false;
    }
    if (profile1.status !== profile2.status) {
      return false;
    }

    for (const question of profile1.questions) {
      const answer1 = question.answer;
      const answer2 = profile2.questions?.find(
        question2 => question2.question === question.question
      )?.answer;
      if (answer1 !== undefined && answer2 !== undefined) {
        if (typeof question.answer === 'string') {
          if (answer1 !== answer2) {
            return false;
          }
        } else {
          //the type of answer is array
          if (answer1?.length !== answer2?.length) {
            return false;
          }
          if (
            (answer1 as number[]).some(
              answer => !(answer2 as number[]).includes(answer)
            )
          )
            return false;
        }
      } else {
        return !!answer1 == !!answer2;
      }
    }

    return true;
  }

  discard(selectedProfile: Profile | null) {
    this.liveAnnouncer.clear();
    this.isOpenProfileForm = false;
    if (selectedProfile) {
      timer(100).subscribe(() => {
        this.store.setFocusOnSelectedProfile();
        this.store.updateSelectedProfile(null);
      });
    } else {
      this.store.setFocusOnCreateButton();
    }
  }

  trackByName = (index: number, item: Profile): string => {
    return item.name;
  };

  private closeFormAfterDelete(name: string, selectedProfile: Profile | null) {
    if (selectedProfile?.name === name) {
      this.isOpenProfileForm = false;
      this.store.updateSelectedProfile(null);
    }
  }

  private saveProfile(profile: Profile, focusElement: () => void) {
    this.store.saveProfile({
      profile,
      onSave: (profile: Profile) => {
        if (profile.status === ProfileStatus.VALID) {
          this.openSuccessDialog(profile, focusElement);
        } else {
          focusElement();
        }
      },
    });
    this.isOpenProfileForm = false;
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

  private openSaveDialog(
    profileName: string,
    draft: boolean = false
  ): Observable<boolean> {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      data: {
        title: `Save ${draft ? 'draft profile' : 'profile'}`,
        content: `You are about to save changes in ${profileName}. Are you sure?`,
      },
      autoFocus: 'dialog',
      hasBackdrop: true,
      disableClose: true,
    });

    return dialogRef?.afterClosed();
  }

  private openSuccessDialog(profile: Profile, focusElement: () => void): void {
    const dialogRef = this.dialog.open(SuccessDialogComponent, {
      ariaLabel: 'Risk Assessment Profile Completed',
      data: {
        profile,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'simple-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        focusElement();
      });
  }
}
