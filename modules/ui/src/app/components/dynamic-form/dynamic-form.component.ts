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
  Component,
  inject,
  Input,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  FormControlType,
  OptionType,
  QuestionFormat,
  Validation,
} from '../../model/question';
import {
  AbstractControl,
  ControlContainer,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  MatError,
  MatFormField,
  MatOption,
  MatSelectModule,
} from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DeviceValidators } from '../../pages/devices/components/device-form/device.validators';
import { ProfileValidators } from '../../pages/risk-assessment/profile-form/profile.validators';
import { DomSanitizer } from '@angular/platform-browser';
@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    MatFormField,
    MatOption,
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatError,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    TextFieldModule,
  ],
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DynamicFormComponent implements OnInit {
  public readonly FormControlType = FormControlType;

  @Input() format: QuestionFormat[] = [];
  @Input() optionKey: string | undefined;

  parentContainer = inject(ControlContainer);
  get formGroup() {
    return this.parentContainer.control as FormGroup;
  }

  constructor(
    private fb: FormBuilder,
    private deviceValidators: DeviceValidators,
    private profileValidators: ProfileValidators,
    private domSanitizer: DomSanitizer
  ) {}
  getControl(name: string | number) {
    return this.formGroup.get(name.toString()) as AbstractControl;
  }

  getFormGroup(name: string | number): FormGroup {
    return this.formGroup?.controls[name] as FormGroup;
  }

  public markSectionAsDirty(
    optionIndex: number,
    optionLength: number,
    formControlName: string
  ) {
    if (optionIndex === optionLength - 1) {
      this.getControl(formControlName).markAsDirty({
        onlySelf: true,
      });
    }
  }

  ngOnInit() {
    this.createProfileForm(this.format);
  }

  createProfileForm(questions: QuestionFormat[]) {
    questions.forEach((question, index) => {
      if (question.type === FormControlType.SELECT_MULTIPLE) {
        this.formGroup.addControl(
          index.toString(),
          this.getMultiSelectGroup(question)
        );
      } else {
        const validators = this.getValidators(
          question.type,
          question.validation
        );
        this.formGroup.addControl(
          index.toString(),
          new FormControl(question.default || '', validators)
        );
      }
    });
  }

  getValidators(type: FormControlType, validation?: Validation): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (validation) {
      if (validation.required) {
        validators.push(this.profileValidators.textRequired());
      }
      if (validation.max) {
        validators.push(Validators.maxLength(Number(validation.max)));
      }
      if (type === FormControlType.EMAIL_MULTIPLE) {
        validators.push(this.profileValidators.emailStringFormat());
      }
      if (type === FormControlType.TEXT || type === FormControlType.TEXTAREA) {
        validators.push(this.profileValidators.textFormat());
      }
    }
    return validators;
  }

  getMultiSelectGroup(question: QuestionFormat): FormGroup {
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

  getOptionValue(option: OptionType) {
    if (this.optionKey && typeof option === 'object') {
      return this.domSanitizer.bypassSecurityTrustHtml(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (option as any)[this.optionKey]
      );
    }
    // @ts-expect-error option type is string
    return this.domSanitizer.bypassSecurityTrustHtml(option);
  }
}
