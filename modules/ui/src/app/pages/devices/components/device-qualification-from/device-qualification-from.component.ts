import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnInit,
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
  TestModule,
} from '../../../../model/device';
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
import { DevicesStore } from '../../devices.store';
import { DynamicFormComponent } from '../../../../components/dynamic-form/dynamic-form.component';
import { skip } from 'rxjs';

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
    DynamicFormComponent,
  ],
  providers: [provideNgxMask(), DevicesStore],
  templateUrl: './device-qualification-from.component.html',
  styleUrl: './device-qualification-from.component.scss',
})
export class DeviceQualificationFromComponent
  extends EscapableDialogComponent
  implements OnInit, AfterViewInit
{
  testModules: TestModule[] = [];
  deviceQualificationForm: FormGroup = this.fb.group({});
  device: Device | undefined;
  format: DeviceQuestionnaireSection[] = [];

  get model() {
    return this.getStep(0).get('model') as AbstractControl;
  }

  get manufacturer() {
    return this.getStep(0).get('manufacturer') as AbstractControl;
  }

  get mac_addr() {
    return this.getStep(0).get('mac_addr') as AbstractControl;
  }

  get test_modules() {
    return this.getStep(0).controls['test_modules'] as FormArray;
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
    });

    this.devicesStore.getQuestionnaireFormat();
  }

  ngAfterViewInit() {
    //set static height for better UX
    this.element.nativeElement.style.height =
      this.element.nativeElement.offsetHeight + 'px';
  }

  submit(): void {
    this.device = this.createDeviceFromForm(this.getStep(0));
  }

  closeForm(): void {
    this.dialogRef.close();
  }

  getStep(step: number) {
    return (this.deviceQualificationForm.get('steps') as FormArray).controls[
      step
    ] as FormGroup;
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
      testing_journey: [0],
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

    // TODO dummy step
    (this.deviceQualificationForm.get('steps') as FormArray).controls.push(
      this.fb.group({})
    );
  }

  private createStep() {
    return new FormGroup({});
  }
}
