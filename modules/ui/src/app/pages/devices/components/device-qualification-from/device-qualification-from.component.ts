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
  DeviceView,
  TestModule,
  TestingType,
} from '../../../../model/device';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EscapableDialogComponent } from '../../../../components/escapable-dialog/escapable-dialog.component';
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
import { skip, Subject, takeUntil, timer } from 'rxjs';
import { FormAction, FormResponse } from '../../devices.component';
import { DeviceItemComponent } from '../../../../components/device-item/device-item.component';
import { QualificationIconComponent } from '../../../../components/qualification-icon/qualification-icon.component';
import { PilotIconComponent } from '../../../../components/pilot-icon/pilot-icon.component';

const MAC_ADDRESS_PATTERN =
  '^[\\s]*[a-fA-F0-9]{2}(?:[:][a-fA-F0-9]{2}){5}[\\s]*$';

interface DialogData {
  title?: string;
  device?: Device;
  devices: Device[];
  testModules: TestModule[];
  index: number;
  isLinear: boolean;
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
    QualificationIconComponent,
    PilotIconComponent,
  ],
  providers: [provideNgxMask(), DevicesStore],
  templateUrl: './device-qualification-from.component.html',
  styleUrl: './device-qualification-from.component.scss',
})
export class DeviceQualificationFromComponent
  extends EscapableDialogComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly TestingType = TestingType;
  readonly DeviceView = DeviceView;
  @ViewChild('stepper') public stepper!: StepperComponent;
  testModules: TestModule[] = [];
  deviceQualificationForm: FormGroup = this.fb.group({});
  device: Device | undefined;
  format: DeviceQuestionnaireSection[] = [];
  selectedIndex: number = 0;

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
    return this.getStep(1).get('0') as AbstractControl;
  }

  get technology() {
    return this.getStep(1).get('2') as AbstractControl;
  }

  get test_modules() {
    return this.getStep(0).controls['test_modules'] as FormArray;
  }

  get formPristine() {
    return (
      this.deviceQualificationForm.get('steps') as FormArray
    ).controls.every(control => (control as FormGroup).pristine);
  }

  get formValid() {
    return (
      this.deviceQualificationForm.get('steps') as FormArray
    ).controls.every(control => (control as FormGroup).valid);
  }

  constructor(
    private fb: FormBuilder,
    private deviceValidators: DeviceValidators,
    private profileValidators: ProfileValidators,
    public override dialogRef: MatDialogRef<DeviceQualificationFromComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public devicesStore: DevicesStore,
    private element: ElementRef
  ) {
    super(dialogRef);
    this.device = data.device;
  }
  loaded = false;
  ngOnInit(): void {
    this.createBasicStep();
    if (this.data.device) {
      this.model.setValue(this.data.device.model);
      this.manufacturer.setValue(this.data.device.manufacturer);
      this.mac_addr.setValue(this.data.device.mac_addr);
    }
    this.testModules = this.data.testModules;

    this.devicesStore.questionnaireFormat$.pipe(skip(1)).subscribe(format => {
      this.createDeviceForm(format);
      this.format = format;
      if (this.data.index) {
        timer(0)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.selectedIndex = this.data.index;
          });
      }
      this.loaded = true;
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
    this.device = this.createDeviceFromForm();
  }

  closeForm(): void {
    this.dialogRef.close({
      action: FormAction.Close,
      device: this.createDeviceFromForm(),
      index: this.stepper.selectedIndex,
    } as FormResponse);
  }

  getStep(step: number) {
    return (this.deviceQualificationForm.get('steps') as FormArray).controls[
      step
    ] as FormGroup;
  }

  onStepChange(event: StepperSelectionEvent) {
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

  goToStep(index: number) {
    this.stepper.selectedIndex = index;
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
    return {
      model: this.model.value.trim(),
      manufacturer: this.manufacturer.value.trim(),
      mac_addr: this.mac_addr.value.trim(),
      test_pack: this.test_pack.value,
      test_modules: testModules,
      type: this.type.value,
      technology: this.technology.value,
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
      test_modules: new FormArray([]),
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
}
