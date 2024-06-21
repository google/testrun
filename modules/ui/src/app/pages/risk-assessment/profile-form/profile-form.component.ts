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
  OnInit,
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
import { DeviceValidators } from '../../devices/components/device-form/device.validators';
import {
  FormControlType,
  Profile,
  ProfileFormat,
  Validation,
} from '../../../model/profile';
import { ProfileValidators } from './profile.validators';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatError,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent implements OnInit {
  public readonly FormControlType = FormControlType;
  @Input() profileFormat!: ProfileFormat[];
  profileForm: FormGroup = this.fb.group({});
  @Input() profiles!: Profile[];
  constructor(
    private deviceValidators: DeviceValidators,
    private profileValidators: ProfileValidators,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.profileForm = this.createProfileForm(this.profileFormat);
  }

  get nameControl() {
    return this.getControl('name');
  }

  getControl(name: string | number) {
    return this.profileForm.get(name.toString()) as AbstractControl;
  }

  createProfileForm(questions: ProfileFormat[]): FormGroup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group: any = {};

    group['name'] = new FormControl('', [
      this.profileValidators.textRequired(),
      this.deviceValidators.deviceStringFormat(),
      this.profileValidators.differentProfileName(this.profiles),
    ]);

    questions.forEach((question, index) => {
      const validators = this.getValidators(question.type, question.validation);
      if (question.type === FormControlType.SELECT_MULTIPLE) {
        group[index] = this.getMultiSelectGroup(question);
      } else {
        group[index] = new FormControl(question.default || '', validators);
      }
    });
    return new FormGroup(group);
  }

  getValidators(type: FormControlType, validation?: Validation): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (validation) {
      if (validation.required) {
        validators.push(this.profileValidators.textRequired());
      }
      if (type === FormControlType.EMAIL_MULTIPLE) {
        validators.push(
          this.profileValidators.emailStringFormat(Number(validation.max))
        );
      }
      if (type === FormControlType.TEXT || type === FormControlType.TEXTAREA) {
        validators.push(
          this.profileValidators.textFormat(Number(validation.max))
        );
      }
    }
    return validators;
  }

  getMultiSelectGroup(question: ProfileFormat): FormGroup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group: any = {};
    question.options?.forEach((option, index) => {
      group[index] = false;
    });
    return this.fb.group(group, {
      validators: question.validation?.required
        ? [this.profileValidators.multiSelectRequired]
        : [],
    });
  }

  getFormGroup(name: string): FormGroup {
    return this.profileForm?.controls[name] as FormGroup;
  }
}
