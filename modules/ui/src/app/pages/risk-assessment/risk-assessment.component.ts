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
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { RiskAssessmentStore } from './risk-assessment.store';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import {
  combineLatest,
  Observable,
  of,
  skip,
  Subject,
  takeUntil,
  timer,
} from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Profile, ProfileAction, ProfileStatus } from '../../model/profile';
import { DeviceValidators } from '../devices/components/device-form/device.validators';
import { SuccessDialogComponent } from './components/success-dialog/success-dialog.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ProfileItemComponent } from './profile-item/profile-item.component';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ProfileFormComponent } from './profile-form/profile-form.component';
import { MatIconModule } from '@angular/material/icon';
import { EmptyPageComponent } from '../../components/empty-page/empty-page.component';
import { ListLayoutComponent } from '../../components/list-layout/list-layout.component';
import { LayoutType } from '../../model/layout-type';
import { NoEntitySelectedComponent } from '../../components/no-entity-selected/no-entity-selected.component';
import { EntityAction, EntityActionResult } from '../../model/entity-action';
import { CanComponentDeactivate } from '../../guards/can-deactivate.guard';

const matFormFieldDefaultOptions: MatFormFieldDefaultOptions = {
  hideRequiredMarker: true,
};

@Component({
  selector: 'app-risk-assessment',
  templateUrl: './risk-assessment.component.html',
  styleUrl: './risk-assessment.component.scss',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSidenavModule,
    EmptyPageComponent,
    ListLayoutComponent,
    ProfileFormComponent,
    ProfileItemComponent,
    NoEntitySelectedComponent,
  ],
  providers: [
    RiskAssessmentStore,
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: matFormFieldDefaultOptions,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskAssessmentComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  readonly LayoutType = LayoutType;
  readonly ProfileStatus = ProfileStatus;
  readonly form = viewChild<ProfileFormComponent>('profileFormComponent');
  private store = inject(RiskAssessmentStore);
  private liveAnnouncer = inject(LiveAnnouncer);
  cd = inject(ChangeDetectorRef);
  private elementRef = inject(ElementRef);
  private destroy$: Subject<boolean> = new Subject<boolean>();
  dialog = inject(MatDialog);
  element = inject(ViewContainerRef);

  viewModel$ = this.store.viewModel$;
  isOpenProfileForm = false;
  isCopyProfile = false;

  canDeactivate(): Observable<boolean> {
    const form = this.form();
    if (form) {
      return form.close();
    } else {
      return of(true);
    }
  }

  ngOnInit() {
    this.store.getProfilesFormat();

    combineLatest([
      this.store.isOpenCreateProfile$,
      this.store.profileFormat$.pipe(skip(1)),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isOpenCreateProfile]) => {
        if (isOpenCreateProfile) {
          this.openForm();
        }
      });
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
    this.cd.detectChanges();
  }

  async copyProfileAndOpenForm(profile: Profile, profiles: Profile[]) {
    this.isCopyProfile = true;
    const copyOfProfile = this.getCopyOfProfile(profile);
    this.store.updateProfiles([copyOfProfile, ...profiles]);
    await this.openForm(copyOfProfile);
  }

  getCopyOfProfile(profile: Profile): Profile {
    const copyOfProfile = { ...profile };
    copyOfProfile.name = this.getCopiedProfileName(profile.name);
    delete copyOfProfile.created; // new profile is not create yet
    delete copyOfProfile.risk;
    copyOfProfile.status = ProfileStatus.DRAFT;
    return copyOfProfile;
  }

  deleteProfile(
    profile: Profile,
    profiles: Profile[],
    selectedProfile: Profile | null
  ): void {
    const profileName = profile.name;
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      data: {
        title: 'Delete risk profile?',
        content: `You are about to delete ${profileName}. Are you sure?`,
      },
      autoFocus: 'dialog',
      hasBackdrop: true,
      disableClose: true,
      panelClass: ['simple-dialog', 'delete-dialog'],
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(deleteProfile => {
        if (deleteProfile) {
          if (
            profile &&
            profile.status === ProfileStatus.DRAFT &&
            !profile.created
          ) {
            this.deleteCopy(profile, profiles);
            this.closeFormAfterDelete(profile.name, selectedProfile);
            this.focusAddButton();
            return;
          } else {
            this.store.deleteProfile({
              name: profileName,
              onDelete: (idx = 0) => {
                this.closeFormAfterDelete(profileName, selectedProfile);
                timer(100).subscribe(() => {
                  this.setFocus(idx);
                });
              },
            });
          }
        } else {
          this.store.setFocusOnSelectedProfile();
        }
      });
  }

  saveProfileClicked(profile: Profile, selectedProfile: Profile | null): void {
    this.liveAnnouncer.clear();
    if (!selectedProfile) {
      this.saveProfile(profile, () => {
        this.store.setFocusOnCreateButton();
        this.store.scrollToSelectedProfile();
      });
    } else if (
      this.compareProfiles(profile, selectedProfile) ||
      this.isCopyProfile
    ) {
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

  discard(selectedProfile: Profile | null, profiles: Profile[]) {
    this.liveAnnouncer.clear();
    this.openCloseDialog(selectedProfile, profiles);
  }

  private openCloseDialog(
    selectedProfile: Profile | null,
    profiles: Profile[]
  ) {
    this.form()
      ?.openCloseDialog()
      .pipe(takeUntil(this.destroy$))
      .subscribe(close => {
        if (close) {
          if (selectedProfile && this.isCopyProfile) {
            this.deleteCopy(selectedProfile, profiles);
          }
          this.isCopyProfile = false;
          this.isOpenProfileForm = false;
          this.store.updateSelectedProfile(null);
          this.cd.markForCheck();
          timer(100).subscribe(() => {
            this.focusSelectedButton();
          });
        }
      });
  }

  private focusSelectedButton() {
    const selectedButton = this.elementRef.nativeElement.querySelector(
      'app-profile-item.selected .profile-item-container'
    );
    if (selectedButton) {
      selectedButton.focus();
    } else {
      this.focusAddButton();
    }
  }

  private focusAddButton(): void {
    const addButton =
      this.elementRef.nativeElement.querySelector('.add-entity-button');
    addButton?.focus();
  }

  deleteCopy(copyOfProfile: Profile, profiles: Profile[]) {
    this.isCopyProfile = false;
    this.store.removeProfile(copyOfProfile.name, profiles);
  }

  actions(actions: EntityAction[]) {
    return (profile: Profile) => {
      // expired profiles or unsaved copy of profile can only be removed
      if (
        profile.status === ProfileStatus.EXPIRED ||
        (profile.status === ProfileStatus.DRAFT && !profile.created)
      ) {
        return [{ action: ProfileAction.Delete, icon: 'delete' }];
      }
      return actions;
    };
  }

  menuItemClicked(
    { action, entity }: EntityActionResult<Profile>,
    profiles: Profile[],
    selectedProfile: Profile | null
  ) {
    switch (action) {
      case ProfileAction.Copy:
        this.copyProfileAndOpenForm(entity, profiles);
        break;
      case ProfileAction.Delete:
        this.deleteProfile(entity, profiles, selectedProfile);
        break;
    }
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
        this.store.updateSelectedProfile(profile);
      },
    });
    this.isCopyProfile = false;
  }

  private setFocus(index: number): void {
    const nextItem = this.elementRef.nativeElement.querySelectorAll(
      'app-profile-item .profile-item-info'
    )[index];

    if (nextItem) {
      nextItem.focus();
    } else {
      this.focusAddButton();
    }
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
      panelClass: ['simple-dialog', 'small-dialog'],
    });

    return dialogRef?.afterClosed();
  }

  private openSuccessDialog(profile: Profile, focusElement: () => void): void {
    const dialogRef = this.dialog.open(SuccessDialogComponent, {
      ariaLabel: 'Risk assessment completed',
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
