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
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
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
  DeviceQuestionnaireSection,
  DeviceStatus,
  DeviceView,
  TestingType,
  TestModule,
} from '../../../../model/device';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { CdkStep, StepperSelectionEvent } from '@angular/cdk/stepper';
import { StepperComponent } from '../../../../components/stepper/stepper.component';
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
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { MatIcon } from '@angular/material/icon';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { ProfileValidators } from '../../../risk-assessment/profile-form/profile.validators';
import { DevicesStore } from '../../devices.store';
import { DynamicFormComponent } from '../../../../components/dynamic-form/dynamic-form.component';
import { filter, skip, Subject, takeUntil, timer } from 'rxjs';
import { FormAction, FormResponse } from '../../devices.component';
import { DeviceItemComponent } from '../../../../components/device-item/device-item.component';
import { ProgramTypeIconComponent } from '../../../../components/program-type-icon/program-type-icon.component';
import { Question } from '../../../../model/profile';
import { FormControlType } from '../../../../model/question';
import { ProgramType } from '../../../../model/program-type';
import { FocusManagerService } from '../../../../services/focus-manager.service';

const MAC_ADDRESS_PATTERN =
  '^[\\s]*[a-fA-F0-9]{2}(?:[:][a-fA-F0-9]{2}){5}[\\s]*$';

interface DialogData {
  title?: string;
  device?: Device;
  initialDevice?: Device;
  devices: Device[];
  testModules: TestModule[];
  index: number;
  isCreate: boolean;
}

@Component({
  selector: 'app-device-qualification-from',
  standalone: true,
  imports: [
    CdkStep,
    StepperComponent,
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
    NgxMaskPipe,
    MatIcon,
    MatRadioGroup,
    MatRadioButton,
    DynamicFormComponent,
    DeviceItemComponent,
    ProgramTypeIconComponent,
  ],
  providers: [provideNgxMask(), DevicesStore],
  templateUrl: './device-qualification-from.component.html',
  styleUrl: './device-qualification-from.component.scss',
})
export class DeviceQualificationFromComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly FORM_HEIGHT = 993;
  readonly TestingType = TestingType;
  readonly DeviceView = DeviceView;
  readonly ProgramType = ProgramType;
  @ViewChild('stepper') public stepper!: StepperComponent;
  testModules: TestModule[] = [];
  deviceQualificationForm: FormGroup = this.fb.group({});
  device: Device | undefined;
  format: DeviceQuestionnaireSection[] = [];
  selectedIndex: number = 0;
  typeStep = 1;
  typeQuestion = 0;
  technologyStep = 1;
  technologyQuestion = 2;

  private destroy$: Subject<boolean> = new Subject<boolean>();

  get model() {
    return this.getStep(0).get('model') as AbstractControl;
  }

  get manufacturer() {
    return this.getStep(0).get('manufacturer') as AbstractControl;
  }

  get mac_addr() {
    return this.getStep(0).get('mac_addr') as AbstractControl;
  }

  get test_pack() {
    return this.getStep(0).get('test_pack') as AbstractControl;
  }

  get type() {
    return this.getStep(this.typeStep)?.get(
      this.typeQuestion.toString()
    ) as AbstractControl;
  }

  get technology() {
    return this.getStep(this.technologyStep)?.get(
      this.technologyQuestion.toString()
    ) as AbstractControl;
  }

  get test_modules() {
    return this.getStep(0).controls['test_modules'] as FormArray;
  }

  get formValid() {
    return (
      this.deviceQualificationForm.get('steps') as FormArray
    ).controls.every(control => (control as FormGroup).valid);
  }

  deviceHasNoChanges(device1: Device | undefined, device2: Device | undefined) {
    return device1 && device2 && this.compareDevices(device1, device2);
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setDialogHeight();
  }

  constructor(
    private fb: FormBuilder,
    private deviceValidators: DeviceValidators,
    private profileValidators: ProfileValidators,
    public dialogRef: MatDialogRef<DeviceQualificationFromComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public devicesStore: DevicesStore,
    private element: ElementRef,
    private focusService: FocusManagerService
  ) {
    this.device = data.device;
  }

  ngOnInit(): void {
    this.createBasicStep();
    this.testModules = this.data.testModules;

    this.devicesStore.questionnaireFormat$.pipe(skip(1)).subscribe(format => {
      this.createDeviceForm(format);
      this.format = format;

      format.forEach(step => {
        step.questions.forEach((question, index) => {
          // need to define the step and index of type and technology
          if (question.question.toLowerCase().includes('type')) {
            this.typeStep = step.step;
            this.typeQuestion = index;
          } else if (question.question.toLowerCase().includes('technology')) {
            this.technologyStep = step.step;
            this.technologyQuestion = index;
          }
        });
      });

      timer(0)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.data.device) {
            this.fillDeviceForm(this.format, this.data.device!);
          }
          if (this.data.index) {
            // previous steps should be marked as interacted
            for (let i = 0; i <= this.data.index; i++) {
              this.goToStep(i);
            }
          }
          this.dialogRef
            .keydownEvents()
            .pipe(filter((e: KeyboardEvent) => e.code === 'Escape'))
            .subscribe(() => {
              this.closeForm();
            });
        });
    });

    this.devicesStore.getQuestionnaireFormat();
  }

  ngAfterViewInit() {
    //set static height for better UX
    this.element.nativeElement.style.height =
      this.element.nativeElement.offsetHeight + 'px';
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  submit(): void {
    this.updateDevice(this.device!, () => {
      this.dialogRef.close({
        action: FormAction.Save,
        device: this.device,
      } as FormResponse);
    });
  }

  delete(): void {
    this.dialogRef.close({
      action: FormAction.Delete,
      device: this.createDeviceFromForm(),
      index: this.stepper.selectedIndex,
    } as FormResponse);
  }

  closeForm(): void {
    const device1 = this.data.initialDevice;
    const device2 = this.createDeviceFromForm();
    if (
      (device1 && device2 && this.compareDevices(device1, device2)) ||
      (!device1 && this.deviceIsEmpty(device2))
    ) {
      this.dialogRef.close();
    } else {
      this.dialogRef.close({
        action: FormAction.Close,
        device: this.createDeviceFromForm(),
        index: this.stepper.selectedIndex,
      } as FormResponse);
    }
  }

  getStep(step: number) {
    return (this.deviceQualificationForm.get('steps') as FormArray).controls[
      step
    ] as FormGroup;
  }

  onStepChange(event: StepperSelectionEvent) {
    this.focusService.focusFirstElementInContainer();
    if (event.previouslySelectedStep.completed) {
      this.device = this.createDeviceFromForm();
    }
  }

  getErrorSteps(): number[] {
    const steps: number[] = [];
    (this.deviceQualificationForm.get('steps') as FormArray).controls.forEach(
      (control, index) => {
        if (!control.valid) steps.push(index);
      }
    );
    return steps;
  }

  goToStep(index: number, event?: Event) {
    event?.preventDefault();
    this.stepper.selectedIndex = index;
  }

  private fillDeviceForm(
    format: DeviceQuestionnaireSection[],
    device: Device
  ): void {
    format.forEach(step => {
      step.questions.forEach((question, index) => {
        const answer = device.additional_info?.find(
          answers => answers.question === question.question
        )?.answer;
        if (answer !== undefined && answer !== null && answer !== '') {
          if (question.type === FormControlType.SELECT_MULTIPLE) {
            question.options?.forEach((item, idx) => {
              if ((answer as number[])?.includes(idx)) {
                (
                  this.getStep(step.step).get(index.toString()) as FormGroup
                ).controls[idx].setValue(true);
              } else {
                (
                  this.getStep(step.step).get(index.toString()) as FormGroup
                ).controls[idx].setValue(false);
              }
            });
          } else {
            (
              this.getStep(step.step).get(index.toString()) as AbstractControl
            ).setValue(answer || '');
          }
        } else {
          (
            this.getStep(step.step)?.get(index.toString()) as AbstractControl
          )?.markAsTouched();
        }
      });
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

  private updateDevice(device: Device, callback: () => void) {
    if (!this.data.isCreate && this.data.device) {
      this.devicesStore.editDevice({
        device,
        mac_addr: this.data.device.mac_addr,
        onSuccess: callback,
      });
    } else {
      this.devicesStore.saveDevice({ device, onSuccess: callback });
    }
  }

  private createDeviceFromForm(): Device {
    const testModules: { [key: string]: { enabled: boolean } } = {};
    this.getStep(0).value.test_modules.forEach(
      (enabled: boolean, i: number) => {
        testModules[this.testModules[i]?.name] = {
          enabled: enabled,
        };
      }
    );

    const additionalInfo: Question[] = [];

    this.format.forEach(step => {
      step.questions.forEach((question, index) => {
        const response: Question = {};
        response.question = question.question;

        if (question.type === FormControlType.SELECT_MULTIPLE) {
          const answer: number[] = [];
          question.options?.forEach((_, idx) => {
            const value = this.getStep(step.step).value[index][idx];
            if (value) {
              answer.push(idx);
            }
          });
          response.answer = answer;
        } else {
          response.answer = this.getStep(step.step).value[index]?.trim();
        }
        additionalInfo.push(response);
      });
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

  private createBasicStep() {
    const firstStep = this.fb.group({
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
            this.data.devices,
            this.data.device
          ),
        ],
      ],
      test_modules: new FormArray(
        [],
        this.deviceValidators.testModulesRequired()
      ),
      test_pack: [TestingType.Qualification],
    });

    this.deviceQualificationForm = this.fb.group({
      steps: this.fb.array([firstStep]),
    });
  }

  private createDeviceForm(format: DeviceQuestionnaireSection[]) {
    format.forEach(() => {
      (this.deviceQualificationForm.get('steps') as FormArray).controls.push(
        this.createStep()
      );
    });

    // summary step
    (this.deviceQualificationForm.get('steps') as FormArray).controls.push(
      this.fb.group({})
    );
  }

  private createStep() {
    return new FormGroup({});
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
      if (val1.enabled !== val2.enabled) {
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

  private deviceIsEmpty(device: Device) {
    if (device.manufacturer !== '') {
      return false;
    }
    if (device.model !== '') {
      return false;
    }
    if (device.mac_addr !== '') {
      return false;
    }
    if (device.type !== '') {
      return false;
    }
    if (device.technology !== '') {
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
        if (question.answer !== '') {
          return false;
        }
      }
    } else {
      return false;
    }
    return true;
  }

  private setDialogHeight(): void {
    const windowHeight = window.innerHeight;
    if (windowHeight < this.FORM_HEIGHT) {
      this.element.nativeElement.style.height = '100vh';
    } else {
      this.element.nativeElement.style.height = this.FORM_HEIGHT + 'px';
    }
  }
}
