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
  OnInit,
  inject,
  input,
  effect,
  output,
  ChangeDetectorRef,
  AfterViewInit,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
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
import { skip, timer } from 'rxjs';
import { Question } from '../../../../model/profile';
import { FormControlType, QuestionFormat } from '../../../../model/question';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { SimpleDialogComponent } from '../../../../components/simple-dialog/simple-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs/internal/observable/of';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/internal/operators/map';
import { tap } from 'rxjs/internal/operators/tap';

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
  providers: [provideNgxMask()],
  templateUrl: './device-qualification-from.component.html',
  styleUrl: './device-qualification-from.component.scss',
})
export class DeviceQualificationFromComponent implements OnInit, AfterViewInit {
  readonly TestingType = TestingType;
  readonly DeviceView = DeviceView;

  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private deviceValidators = inject(DeviceValidators);
  private profileValidators = inject(ProfileValidators);
  private changeDevice = false;
  private macAddressValidator!: ValidatorFn;

  dialog = inject(MatDialog);
  formIsLoaded$ = new BehaviorSubject<boolean>(false);
  devicesStore = inject(DevicesStore);
  deviceQualificationForm: FormGroup = this.fb.group({});
  format: QuestionFormat[] = [];
  typeQuestion = 0;
  technologyQuestion = 2;
  device: Device | null = null;

  initialDevice = input<Device | null>(null);

  initialDeviceEffect = effect(() => {
    if (
      this.changeDevice ||
      this.deviceHasNoChanges(this.device, this.createDeviceFromForm())
    ) {
      this.changeDevice = false;
      this.device = this.initialDevice();
      if (this.device && this.device.mac_addr) {
        this.fillDeviceForm(this.format, this.device);
      } else {
        this.resetForm();
      }
      this.updateMacAddressValidator();
    } else if (this.device != this.initialDevice()) {
      // prevent select new device before user confirmation
      this.devicesStore.selectDevice(this.device);
      this.openCloseDialogToChangeDevice(this.initialDevice());
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

      timer(0).subscribe(() => {
        if (this.initialDevice()) {
          this.fillDeviceForm(this.format, this.initialDevice()!);
        }
        this.formIsLoaded$.next(true);
      });
    });

    this.devicesStore.getQuestionnaireFormat();
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  onSaveClicked(): void {
    this.save.emit(this.createDeviceFromForm());
    this.deviceQualificationForm.markAsPristine();
    this.changeDevice = true;
  }

  onCancelClicked(): void {
    this.cancel.emit();
  }

  onDeleteClick(): void {
    this.delete.emit(this.initialDevice()!);
  }

  resetForm() {
    this.deviceQualificationForm.reset({
      test_pack: TestingType.Qualification,
    });
  }

  createDeviceFromForm(): Device {
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
          if (this.deviceQualificationForm.value[index]) {
            const value = this.deviceQualificationForm.value[index][idx];
            if (value) {
              answer.push(idx);
            }
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
      model: this.model?.value?.trim(),
      manufacturer: this.manufacturer?.value?.trim(),
      mac_addr: this.mac_addr?.value?.trim(),
      test_pack: this.test_pack?.value,
      test_modules: testModules,
      type: this.type?.value,
      technology: this.technology?.value,
      additional_info: additionalInfo,
    } as Device;
  }

  deviceHasNoChanges(device1: Device | null, device2: Device) {
    return (
      (device1 === null && this.deviceIsEmpty(device2)) ||
      (device1 && this.compareDevices(device1, device2))
    );
  }

  close(): Observable<boolean> {
    if (
      this.deviceHasNoChanges(this.initialDevice(), this.createDeviceFromForm())
    ) {
      this.devicesStore.setIsOpenAddDevice(false);
      return of(true);
    }
    return this.openCloseDialog().pipe(
      tap(res => {
        if (res) this.devicesStore.setIsOpenAddDevice(false);
      }),
      map(res => !!res)
    );
  }

  private deviceIsEmpty(device: Device) {
    if (device.manufacturer && device.manufacturer !== '') {
      return false;
    }
    if (device.model && device.model !== '') {
      return false;
    }
    if (device.mac_addr && device.mac_addr !== '') {
      return false;
    }
    if (device.type && device.type !== '') {
      return false;
    }
    if (device.technology && device.technology !== '') {
      return false;
    }
    if (device.test_pack !== TestingType.Qualification) {
      return false;
    }
    const keys1 = Object.keys(device.test_modules!);

    for (const key of keys1) {
      const val1 = device.test_modules![key];
      if (!val1.enabled) {
        return false;
      }
    }
    if (device.additional_info) {
      for (const question of device.additional_info) {
        if (question.answer && question.answer !== '') {
          return false;
        }
      }
    } else {
      return false;
    }
    return true;
  }

  private compareDevices(device1: Device, device2: Device) {
    if (device1.manufacturer !== device2.manufacturer) {
      return false;
    }
    if (device1.model !== device2.model) {
      return false;
    }
    if (device1.mac_addr !== device2.mac_addr) {
      return false;
    }
    if (device1.type !== device2.type) {
      return false;
    }
    if (device1.technology !== device2.technology) {
      return false;
    }
    if (device1.test_pack !== device2.test_pack) {
      return false;
    }
    const keys1 = Object.keys(device1.test_modules!);

    for (const key of keys1) {
      const val1 = device1.test_modules![key];
      const val2 = device2.test_modules![key];
      if (val1?.enabled !== val2?.enabled) {
        return false;
      }
    }

    if (device1.additional_info) {
      for (const question of device1.additional_info) {
        if (
          question.answer !==
          device2.additional_info?.find(
            question2 => question2.question === question.question
          )?.answer
        ) {
          return false;
        }
      }
    } else {
      return false;
    }
    return true;
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

  private createDeviceForm() {
    this.macAddressValidator = this.deviceValidators.differentMACAddress(
      this.devices(),
      this.initialDevice()
    );

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
          this.macAddressValidator,
        ],
      ],
      test_modules: new FormArray(
        [],
        this.deviceValidators.testModulesRequired()
      ),
      test_pack: [TestingType.Qualification],
    });
  }

  private openCloseDialogToChangeDevice(device: Device | null) {
    this.openCloseDialog().subscribe(close => {
      if (close) {
        this.changeDevice = true;
        this.devicesStore.selectDevice(device);
      }
    });
  }
  private openCloseDialog() {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: 'Discard the Device changes',
      data: {
        title: 'Discard changes?',
        content: `You have unsaved changes that would be permanently lost.`,
        confirmName: 'Discard',
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: ['simple-dialog', 'discard-dialog'],
    });

    return dialogRef?.beforeClosed();
  }

  private updateMacAddressValidator() {
    if (this.mac_addr) {
      this.mac_addr.removeValidators([this.macAddressValidator]);
      this.macAddressValidator = this.deviceValidators.differentMACAddress(
        this.devices(),
        this.initialDevice()
      );
      this.mac_addr.addValidators(this.macAddressValidator);
      this.mac_addr.updateValueAndValidity();
    }
  }
}
