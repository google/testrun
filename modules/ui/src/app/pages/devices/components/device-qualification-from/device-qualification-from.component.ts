import { Component, Inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DeviceValidators } from '../device-form/device.validators';
import { Device, TestModule } from '../../../../model/device';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EscapableDialogComponent } from '../../../../components/escapable-dialog/escapable-dialog.component';
import { CommonModule } from '@angular/common';
import { CdkStep } from '@angular/cdk/stepper';
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

const MAC_ADDRESS_PATTERN =
  '^[\\s]*[a-fA-F0-9]{2}(?:[:][a-fA-F0-9]{2}){5}[\\s]*$';

interface DialogData {
  title?: string;
  device?: Device;
  devices: Device[];
  testModules: TestModule[];
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
  ],
  providers: [provideNgxMask()],
  templateUrl: './device-qualification-from.component.html',
  styleUrl: './device-qualification-from.component.scss',
})
export class DeviceQualificationFromComponent
  extends EscapableDialogComponent
  implements OnInit
{
  testModules: TestModule[] = [];
  deviceQualificationForm!: FormGroup;
  firstStep!: FormGroup;
  device: Device | undefined;

  get model() {
    return this.firstStep.get('model') as AbstractControl;
  }

  get manufacturer() {
    return this.firstStep.get('manufacturer') as AbstractControl;
  }

  get mac_addr() {
    return this.firstStep.get('mac_addr') as AbstractControl;
  }

  get test_modules() {
    return this.firstStep.controls['test_modules'] as FormArray;
  }

  get first_step() {
    return this.firstStep;
  }

  // TODO dummy step to show next button; should be removed after next step is created
  get second_step() {
    return (this.deviceQualificationForm.get('steps') as FormArray).controls[
      '1'
    ] as FormGroup;
  }

  constructor(
    private fb: FormBuilder,
    private deviceValidators: DeviceValidators,
    private profileValidators: ProfileValidators,
    public override dialogRef: MatDialogRef<DeviceQualificationFromComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    super(dialogRef);
    this.device = data.device;
  }

  ngOnInit(): void {
    this.createDeviceForm();
    this.testModules = this.data.testModules;
    if (this.data.device) {
      this.model.setValue(this.data.device.model);
      this.manufacturer.setValue(this.data.device.manufacturer);
      this.mac_addr.setValue(this.data.device.mac_addr);
    }
  }

  submit(): void {
    this.device = this.createDeviceFromForm(this.first_step);
  }

  closeForm(): void {
    this.dialogRef.close();
  }

  private createDeviceFromForm(formGroup: FormGroup): Device {
    const testModules: { [key: string]: { enabled: boolean } } = {};
    formGroup.value.test_modules.forEach((enabled: boolean, i: number) => {
      testModules[this.testModules[i]?.name] = {
        enabled: enabled,
      };
    });
    return {
      model: this.model.value.trim(),
      manufacturer: this.manufacturer.value.trim(),
      mac_addr: this.mac_addr.value.trim(),
      test_modules: testModules,
    } as Device;
  }

  private createDeviceForm() {
    this.firstStep = this.fb.group({
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
      testing_journey: [0],
    });
    this.deviceQualificationForm = this.fb.group({
      steps: this.fb.array([this.firstStep, this.fb.group({})]),
    });
  }
}
