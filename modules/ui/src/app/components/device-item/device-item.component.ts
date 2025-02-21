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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  Device,
  DeviceStatus,
  DeviceView,
  TestingType,
} from '../../model/device';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProgramTypeIconComponent } from '../program-type-icon/program-type-icon.component';
import { ProgramType } from '../../model/program-type';

@Component({
  selector: 'app-device-item',
  templateUrl: './device-item.component.html',
  styleUrls: ['./device-item.component.scss'],

  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ProgramTypeIconComponent,
  ],
})
export class DeviceItemComponent {
  readonly DeviceStatus = DeviceStatus;
  readonly TestingType = TestingType;
  readonly ProgramType = ProgramType;
  readonly INVALID_DEVICE = 'Outdated';
  @Input() device!: Device;
  @Input() tabIndex = 0;
  @Input() deviceView!: string;
  @Input() disabled = false;
  @Output() itemClicked = new EventEmitter<Device>();
  readonly DeviceView = DeviceView;

  itemClick(): void {
    this.itemClicked.emit(this.device);
  }

  get label() {
    const deviceStatus =
      this.device.status === DeviceStatus.INVALID ? this.INVALID_DEVICE : '';
    return `${this.device.test_pack} ${this.device.manufacturer} ${this.device.model} ${deviceStatus} ${this.device.mac_addr}`;
  }
}
