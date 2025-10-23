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
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnInit,
  Output,
  viewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {
  Profile,
  ProfileFormat,
  ProfileStatus,
  Question,
} from '../../../model/profile';
import { FormControlType } from '../../../model/question';
import { ProfileValidators } from './profile.validators';
import { DynamicFormComponent } from '../../../components/dynamic-form/dynamic-form.component';
import { Observable } from 'rxjs/internal/Observable';
import { of } from 'rxjs/internal/observable/of';
import { map } from 'rxjs/internal/operators/map';
import { SimpleDialogComponent } from '../../../components/simple-dialog/simple-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { RiskAssessmentStore } from '../risk-assessment.store';
import { tap } from 'rxjs/internal/operators/tap';

@Component({
  selector: 'app-profile-form',
  imports: [
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatError,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    TextFieldModule,
    DynamicFormComponent,
  ],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent implements OnInit, AfterViewInit {
  private profileValidators = inject(ProfileValidators);
  private fb = inject(FormBuilder);
  private store = inject(RiskAssessmentStore);
  cd = inject(ChangeDetectorRef);
  private profile: Profile | null = null;
  private copyProfile: Profile | null = null;
  private profileList!: Profile[];
  private injector = inject(Injector);
  private nameValidator!: ValidatorFn;
  private changeProfile = true;
  public readonly ProfileStatus = ProfileStatus;
  profileForm: FormGroup = this.fb.group({});
  dialog = inject(MatDialog);
  readonly autosize = viewChildren(CdkTextareaAutosize);
  @Input() profileFormat!: ProfileFormat[];
  @Input()
  set profiles(profiles: Profile[]) {
    this.profileList = profiles;
    if (this.nameControl && this.profile) {
      this.updateNameValidator(this.profile);
    }
  }
  get profiles() {
    return this.profileList;
  }
  @Input()
  set selectedProfile(profile: Profile | null) {
    if (this.changeProfile || this.profileHasNoChanges()) {
      this.changeProfile = false;
      this.profile = profile;
      if (profile && this.nameControl) {
        this.updateNameValidator(profile);
        this.fillProfileForm(this.profileFormat, profile);
      } else {
        this.profileForm.reset();
      }
    } else if (this.profile != profile) {
      // prevent select profile before user confirmation
      this.store.updateSelectedProfile(this.profile);
      this.openCloseDialogToChangeProfile(profile);
    }
    if (
      profile?.status === ProfileStatus.COPY &&
      this.copyProfile !== profile // check if copy already set
    ) {
      this.copyProfile = profile;
      this.setCopy.emit(this.copyProfile);
    } else if (profile?.status !== ProfileStatus.COPY) {
      this.copyProfile = null;
    }
  }

  get selectedProfile() {
    return this.profile;
  }

  @Output() saveProfile = new EventEmitter<Profile>();
  @Output() deleteCopy = new EventEmitter<Profile>();
  @Output() setCopy = new EventEmitter<Profile>();
  @Output() discard = new EventEmitter();
  ngOnInit() {
    this.profileForm = this.createProfileForm();
  }

  ngAfterViewInit(): void {
    if (this.selectedProfile) {
      this.fillProfileForm(this.profileFormat, this.selectedProfile!);
    }
  }

  get isDraftDisabled(): boolean | null {
    return (
      !this.nameControl.valid ||
      this.fieldsHasError ||
      this.profileHasNoChanges()
    );
  }

  get isDiscardDisabled(): boolean {
    return (
      (this.profileHasNoChanges() || this.profileForm.pristine) &&
      !this.copyProfile
    );
  }

  profileHasNoChanges() {
    const oldProfile = this.profile;
    const newProfile = oldProfile
      ? this.buildResponseFromForm(
          oldProfile.status as ProfileStatus,
          oldProfile
        )
      : this.buildResponseFromForm('', oldProfile);
    return (
      (oldProfile === null && this.profileIsEmpty(newProfile)) ||
      (oldProfile && this.compareProfiles(oldProfile, newProfile))
    );
  }

  private profileIsEmpty(profile: Profile) {
    if (profile.name && profile.name !== '') {
      return false;
    }

    if (profile.questions) {
      for (const question of profile.questions) {
        if (this.isAnswerFilled(question)) {
          return false;
        }
      }
    } else {
      return false;
    }
    return true;
  }

  private isAnswerFilled(question: Question): boolean {
    if (
      !question.answer ||
      (Array.isArray(question.answer) && question.answer.length === 0)
    ) {
      return false;
    }

    if (typeof question.answer === 'string') {
      return (
        question.answer.trim() !== '' && question.answer !== question.default
      );
    }

    if (Array.isArray(question.answer)) {
      if (!Array.isArray(question.default) && question.answer.length === 0) {
        return true;
      }

      return (
        question.answer.length > 0 &&
        JSON.stringify(question.answer) !== JSON.stringify(question.default)
      );
    }

    return true;
  }

  private compareProfiles(profile1: Profile, profile2: Profile) {
    if (profile1.name !== profile2.name || this.copyProfile) {
      return false;
    }
    if (
      (!profile1.rename &&
        profile2.rename &&
        profile2.rename !== profile1.name) ||
      (profile1.rename &&
        profile2.rename &&
        profile1.rename !== profile2.rename)
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

  private get fieldsHasError(): boolean {
    return this.profileFormat.some((field, index) => {
      return (
        this.getControl(index).hasError('invalid_format') ||
        this.getControl(index).hasError('maxlength')
      );
    });
  }

  get nameControl() {
    return this.getControl('name');
  }

  getControl(name: string | number) {
    return this.profileForm.get(name.toString()) as AbstractControl;
  }

  createProfileForm(): FormGroup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group: any = {};

    this.nameValidator = this.profileValidators.differentProfileName(
      this.profiles,
      this.profile
    );

    group['name'] = new FormControl('', [
      this.profileValidators.textRequired(),
      this.profileValidators.profileNameFormat(),
      this.nameValidator,
    ]);

    return new FormGroup(group);
  }

  getFormGroup(name: string | number): FormGroup {
    return this.profileForm?.controls[name] as FormGroup;
  }

  fillProfileForm(profileFormat: ProfileFormat[], profile: Profile): void {
    const profileName = profile.rename ? profile.rename : profile.name;
    this.nameControl.setValue(profileName);
    profileFormat.forEach((question, index) => {
      const answer = profile.questions.find(
        answers => answers.question === question.question
      );
      if (question.type === FormControlType.SELECT_MULTIPLE) {
        question.options?.forEach((item, idx) => {
          if ((answer?.answer as number[])?.includes(idx)) {
            this.getFormGroup(index).controls[idx].setValue(true);
          } else {
            this.getFormGroup(index).controls[idx].setValue(false);
          }
        });
      } else {
        this.getControl(index).setValue(answer?.answer || '');
      }
    });
    this.nameControl.markAsTouched();
    this.triggerResize();
  }

  onSaveClick(status: ProfileStatus) {
    const response = this.buildResponseFromForm(status, this.selectedProfile);
    this.saveProfile.emit(response);
    this.changeProfile = true;
  }

  onDiscardClick() {
    this.discard.emit(this.selectedProfile!);
  }

  close(): Observable<boolean> {
    if (
      (this.profileHasNoChanges() || this.profileForm.pristine) &&
      !this.copyProfile
    ) {
      this.store.setIsOpenProfile(false);
      return of(true);
    }
    return this.openCloseDialog().pipe(
      tap(res => {
        if (res) {
          if (this.copyProfile) {
            this.deleteCopy.emit(this.copyProfile);
          }
          this.store.setIsOpenProfile(false);
        }
      }),
      map(res => !!res)
    );
  }

  openCloseDialog() {
    const profileName = this.profile?.name || 'New risk profile';
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: 'Discard the Risk Assessment changes',
      data: {
        title: 'Discard changes?',
        content: `You have unsaved changes in the ${profileName} that would be permanently lost.`,
        confirmName: 'Discard',
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: ['simple-dialog', 'discard-dialog'],
    });

    return dialogRef?.afterClosed();
  }

  private openCloseDialogToChangeProfile(profile: Profile | null) {
    this.openCloseDialog().subscribe(close => {
      if (close) {
        if (this.copyProfile) {
          this.deleteCopy.emit(this.copyProfile);
          this.copyProfile = null;
        }
        this.changeProfile = true;
        this.store.updateSelectedProfile(profile);
      } else {
        if (this.copyProfile?.name !== this.profile?.name) {
          this.copyProfile = null;
          this.cd.detectChanges();
        }
      }
    });
  }

  private buildResponseFromForm(
    status: ProfileStatus | '',
    profile: Profile | null
  ): Profile {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const request: any = {
      questions: [],
    };
    if (profile && profile.status !== ProfileStatus.COPY) {
      request.name = profile.name;
      request.rename = this.nameControl?.value?.trim();
    } else {
      request.name = this.nameControl?.value?.trim();
    }
    const questions: Question[] = [];

    this.profileFormat?.forEach((initialQuestion, index) => {
      const question: Question = {};
      question.question = initialQuestion.question;
      if (initialQuestion.default) {
        question.default = initialQuestion.default;
      }
      if (initialQuestion.type === FormControlType.SELECT_MULTIPLE) {
        const answer: number[] = [];
        initialQuestion.options?.forEach((_, idx) => {
          const value = this.profileForm.value[index][idx];
          if (value) {
            answer.push(idx);
          }
        });
        question.answer = answer;
      } else {
        question.answer = this.profileForm.value[index]?.trim() || '';
      }
      questions.push(question);
    });
    request.questions = questions;
    request.status = status;
    return request;
  }

  private triggerResize() {
    // Wait for content to render, then trigger textarea resize.
    afterNextRender(
      () => {
        this.autosize()?.forEach(item => item.resizeToFitContent(true));
      },
      {
        injector: this.injector,
      }
    );
  }

  private updateNameValidator(profile: Profile) {
    this.nameControl.removeValidators([this.nameValidator]);
    this.nameValidator = this.profileValidators.differentProfileName(
      this.profileList,
      profile
    );
    this.nameControl.addValidators(this.nameValidator);
    this.nameControl.updateValueAndValidity();
  }
}
