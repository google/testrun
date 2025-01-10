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
  OnDestroy,
  OnInit,
  inject,
  input,
  effect,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DeviceValidators } from '../device-form/device.validators';
import {
  Device,
  DeviceStatus,
  DeviceView,
  TestingType,
  TestModule,
} from '../../../../model/device';
import { CommonModule } from '@angular/common';
import {
  MatError,
  MatFormField,
  MatFormFieldModule,
} from '@angular/material/form-field';
import { DeviceTestsComponent } from '../../../../components/device-tests/device-tests.component';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { ProfileValidators } from '../../../risk-assessment/profile-form/profile.validators';
import { DevicesStore } from '../../devices.store';
import { DynamicFormComponent } from '../../../../components/dynamic-form/dynamic-form.component';
import { skip, Subject, takeUntil, timer } from 'rxjs';
import { Question } from '../../../../model/profile';
import { FormControlType, QuestionFormat } from '../../../../model/question';

const MAC_ADDRESS_PATTERN =
  '^[\\s]*[a-fA-F0-9]{2}(?:[:][a-fA-F0-9]{2}){5}[\\s]*$';

@Component({
  selector: 'app-device-qualification-from',

  imports: [
    MatFormField,
    DeviceTestsComponent,
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatError,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    TextFieldModule,
    NgxMaskDirective,
    MatRadioGroup,
    MatRadioButton,
    DynamicFormComponent,
  ],
  providers: [provideNgxMask(), DevicesStore],
  templateUrl: './device-qualification-from.component.html',
  styleUrl: './device-qualification-from.component.scss',
})
export class DeviceQualificationFromComponent implements OnInit, OnDestroy {
  readonly TestingType = TestingType;
  readonly DeviceView = DeviceView;

  private fb = inject(FormBuilder);
  private deviceValidators = inject(DeviceValidators);
  private profileValidators = inject(ProfileValidators);
  private destroy$: Subject<boolean> = new Subject<boolean>();
  devicesStore = inject(DevicesStore);

  deviceQualificationForm: FormGroup = this.fb.group({});
  format: QuestionFormat[] = [];
  typeQuestion = 0;
  technologyQuestion = 2;

  initialDevice = input<Device | null>(null);

  initialDeviceEffect = effect(() => {
    const device = this.initialDevice();
    if (device && device.mac_addr) {
      this.fillDeviceForm(this.format, device);
    }
  });

  devices = input<Device[]>([]);
  testModules = input<TestModule[]>([]);
  isCreate = input<boolean>(true);

  save = output<Device>();
  delete = output<Device>();
  cancel = output<void>();

  get model() {
    return this.deviceQualificationForm.get('model') as AbstractControl;
  }

  get manufacturer() {
    return this.deviceQualificationForm.get('manufacturer') as AbstractControl;
  }

  get mac_addr() {
    return this.deviceQualificationForm.get('mac_addr') as AbstractControl;
  }

  get test_pack() {
    return this.deviceQualificationForm.get('test_pack') as AbstractControl;
  }

  get type() {
    return this.deviceQualificationForm.get(
      this.typeQuestion.toString()
    ) as AbstractControl;
  }

  get technology() {
    return this.deviceQualificationForm.get(
      this.technologyQuestion.toString()
    ) as AbstractControl;
  }

  get test_modules() {
    return this.deviceQualificationForm.controls['test_modules'] as FormArray;
  }

  ngOnInit(): void {
    this.createDeviceForm();

    this.devicesStore.questionnaireFormat$.pipe(skip(1)).subscribe(format => {
      this.format = format;

      format.forEach((question, index) => {
        // need to define the step and index of type and technology
        if (question.question.toLowerCase().includes('type')) {
          this.typeQuestion = index;
        } else if (question.question.toLowerCase().includes('technology')) {
          this.technologyQuestion = index;
        }
      });

      timer(0)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.initialDevice()) {
            this.fillDeviceForm(this.format, this.initialDevice()!);
          }
        });
    });

    this.devicesStore.getQuestionnaireFormat();
  }
  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onSaveClicked(): void {
    this.save.emit(this.createDeviceFromForm());
  }

  onCancelClicked(): void {
    this.cancel.emit();
  }

  onDeleteClick(): void {
    this.delete.emit(this.initialDevice()!);
  }

  private fillDeviceForm(format: QuestionFormat[], device: Device): void {
    format.forEach((question, index) => {
      const answer = device.additional_info?.find(
        answers => answers.question === question.question
      )?.answer;
      if (answer !== undefined && answer !== null && answer !== '') {
        if (question.type === FormControlType.SELECT_MULTIPLE) {
          question.options?.forEach((item, idx) => {
            if ((answer as number[])?.includes(idx)) {
              (
                this.deviceQualificationForm.get(index.toString()) as FormGroup
              ).controls[idx].setValue(true);
            } else {
              (
                this.deviceQualificationForm.get(index.toString()) as FormGroup
              ).controls[idx].setValue(false);
            }
          });
        } else {
          (
            this.deviceQualificationForm.get(
              index.toString()
            ) as AbstractControl
          ).setValue(answer || '');
        }
      } else {
        (
          this.deviceQualificationForm.get(index.toString()) as AbstractControl
        )?.markAsTouched();
      }
    });
    this.model.setValue(device.model);
    this.manufacturer.setValue(device.manufacturer);
    this.mac_addr.setValue(device.mac_addr);

    if (
      device.test_pack &&
      (device.test_pack === TestingType.Qualification ||
        device.test_pack === TestingType.Pilot)
    ) {
      this.test_pack.setValue(device.test_pack);
    } else {
      this.test_pack.setValue(TestingType.Qualification);
    }

    this.type?.setValue(device.type);
    this.technology?.setValue(device.technology);
  }

  private createDeviceFromForm(): Device {
    const testModules: { [key: string]: { enabled: boolean } } = {};
    this.deviceQualificationForm.value.test_modules.forEach(
      (enabled: boolean, i: number) => {
        testModules[this.testModules()[i]?.name] = {
          enabled: enabled,
        };
      }
    );

    const additionalInfo: Question[] = [];

    this.format.forEach((question, index) => {
      const response: Question = {};
      response.question = question.question;

      if (question.type === FormControlType.SELECT_MULTIPLE) {
        const answer: number[] = [];
        question.options?.forEach((_, idx) => {
          const value = this.deviceQualificationForm.value[index][idx];
          if (value) {
            answer.push(idx);
          }
        });
        response.answer = answer;
      } else {
        response.answer = this.deviceQualificationForm.value[index]?.trim();
      }
      additionalInfo.push(response);
    });

    return {
      status: DeviceStatus.VALID,
      model: this.model.value.trim(),
      manufacturer: this.manufacturer.value.trim(),
      mac_addr: this.mac_addr.value.trim(),
      test_pack: this.test_pack.value,
      test_modules: testModules,
      type: this.type.value,
      technology: this.technology.value,
      additional_info: additionalInfo,
    } as Device;
  }

  private createDeviceForm() {
    this.deviceQualificationForm = this.fb.group({
      model: [
        '',
        [
          this.profileValidators.textRequired(),
          this.deviceValidators.deviceStringFormat(),
        ],
      ],
      manufacturer: [
        '',
        [
          this.profileValidators.textRequired(),
          this.deviceValidators.deviceStringFormat(),
        ],
      ],
      mac_addr: [
        '',
        [
          this.profileValidators.textRequired(),
          Validators.pattern(MAC_ADDRESS_PATTERN),
          this.deviceValidators.differentMACAddress(
            this.devices(),
            this.initialDevice()
          ),
        ],
      ],
      test_modules: new FormArray(
        [],
        this.deviceValidators.testModulesRequired()
      ),
      test_pack: [TestingType.Qualification],
    });
  }
}
