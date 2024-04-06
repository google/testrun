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
import { Device, DeviceView } from '../../model/device';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-device-item',
  templateUrl: './device-item.component.html',
  styleUrls: ['./device-item.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
})
export class DeviceItemComponent {
  @Input() device!: Device;
  @Input() tabIndex = 0;
  @Input() deviceView!: string;
  @Output() itemClicked = new EventEmitter<Device>();
  @Output() startTestrunClicked = new EventEmitter<Device>();
  readonly DeviceView = DeviceView;

  itemClick(): void {
    this.itemClicked.emit(this.device);
  }
  startTestrunClick(): void {
    this.startTestrunClicked.emit(this.device);
  }

  get label() {
    return `${this.device.manufacturer} ${this.device.model} ${this.device.mac_addr}`;
  }
}
