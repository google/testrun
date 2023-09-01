import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TestRunService} from '../../test-run.service';
import {Observable} from 'rxjs/internal/Observable';
import {Device, TestModule} from '../../model/device';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {DeviceStringFormatValidator} from '../../device-repository/device-form/device-string-format.validator';

@Component({
  selector: 'app-progress-initiate-form',
  templateUrl: './progress-initiate-form.component.html',
  styleUrls: ['./progress-initiate-form.component.scss']
})
export class ProgressInitiateFormComponent implements OnInit {
  initiateForm!: FormGroup;
  devices$!: Observable<Device[] | null>;
  selectedDevice: Device | null = null;
  testModules: TestModule[] = [];

  constructor(
    public dialogRef: MatDialogRef<ProgressInitiateFormComponent>,
    private readonly testRunService: TestRunService,
    private fb: FormBuilder,
    private deviceStringFormatValidator: DeviceStringFormatValidator) {
  }

  get firmware() {
    return this.initiateForm.get('firmware')!;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  ngOnInit() {
    this.devices$ = this.testRunService.getDevices();
    this.createInitiateForm();
    this.testModules = this.testRunService.getTestModules();
  }

  deviceSelected(device: Device) {
    this.selectedDevice = device;
  }

  changeDevice() {
    this.selectedDevice = null;
    this.firmware.setValue('');
  }

  startTestRun() {
    if (!this.firmware.value.trim()) {
      this.firmware.setErrors({required: true});
    }

    if (this.initiateForm.invalid) {
      this.initiateForm.markAllAsTouched();
      return;
    }

    if (this.selectedDevice) {
      this.dialogRef.close();
    }
  }

  private createInitiateForm() {
    this.initiateForm = this.fb.group({
      firmware: ['', [this.deviceStringFormatValidator.deviceStringFormat()]],
      test_modules: new FormArray([])
    });
  }
}
