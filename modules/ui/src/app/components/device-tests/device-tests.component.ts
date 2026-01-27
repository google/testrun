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
  effect,
  input,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { TestModule, TestModules } from '../../model/device';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-device-tests',

  imports: [CommonModule, MatCheckboxModule, ReactiveFormsModule],
  templateUrl: './device-tests.component.html',
  styleUrls: ['./device-tests.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceTestsComponent implements OnInit {
  @Input() deviceForm!: FormGroup;
  @Input() testModules: TestModule[] = [];
  // For initiate test run form tests should be displayed and disabled for change
  @Input() disabled = false;

  deviceTestModules = input<TestModules | undefined>();
  deviceTestModulesEffect = effect(() => {
    this.fillTestModulesFormControls();
  });

  get test_modules() {
    return this.deviceForm?.controls['test_modules'] as FormArray;
  }

  ngOnInit() {
    this.fillTestModulesFormControls();
  }

  fillTestModulesFormControls() {
    this.test_modules.controls = [];
    if (this.deviceTestModules()) {
      this.testModules.forEach(test => {
        this.test_modules.push(
          new FormControl(
            (this.deviceTestModules() as TestModules)[test.name]?.enabled ||
              false
          )
        );
      });
    } else {
      this.testModules.forEach(test => {
        this.test_modules.push(new FormControl(test.enabled));
      });
    }
  }
}
