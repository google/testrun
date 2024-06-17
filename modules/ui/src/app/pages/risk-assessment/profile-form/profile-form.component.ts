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
  Input,
  OnInit,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { DeviceValidators } from '../../devices/components/device-form/device.validators';
import { Profile } from '../../../model/profile';
import { ProfileValidators } from './profile.validators';
import { MatError } from '@angular/material/form-field';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [
    MatButtonModule,
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatError,
  ],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent implements OnInit {
  profileForm!: FormGroup;
  @Input() profiles!: Profile[];
  constructor(
    private deviceValidators: DeviceValidators,
    private profileValidators: ProfileValidators,
    private fb: FormBuilder
  ) {}

  get nameControl() {
    return this.profileForm.get('name') as AbstractControl;
  }

  ngOnInit() {
    this.createProfileForm();
  }

  createProfileForm() {
    this.profileForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          this.deviceValidators.deviceStringFormat(),
          this.profileValidators.differentProfileName(this.profiles),
        ],
      ],
    });
  }
}
