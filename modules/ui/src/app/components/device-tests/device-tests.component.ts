import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormArray, FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {TestModule, TestModules} from '../../model/device';
import {MatCheckboxModule} from '@angular/material/checkbox';

@Component({
  selector: 'app-device-tests',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule, ReactiveFormsModule,],
  templateUrl: './device-tests.component.html',
  styleUrls: ['./device-tests.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceTestsComponent implements OnInit {
  @Input() deviceForm!: FormGroup;
  @Input() deviceTestModules?: TestModules | null;
  @Input() testModules: TestModule[] = [];
  // For initiate test run form tests should be displayed and disabled for change
  @Input() disabled = false;

  get test_modules() {
    return this.deviceForm?.controls['test_modules']! as FormArray;
  }

  ngOnInit() {
    this.fillTestModulesFormControls()
  }

  fillTestModulesFormControls() {
    this.test_modules.controls = [];
    if (this.deviceTestModules) {
      this.testModules.forEach(test => {
        this.test_modules.push(new FormControl(this.deviceTestModules![test.name]?.enabled || false));
      });
    } else {
      this.testModules.forEach(test => {
        this.test_modules.push(new FormControl(test.enabled));
      });
    }
  }

}
