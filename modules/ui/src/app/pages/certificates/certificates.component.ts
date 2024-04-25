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
import { MatIcon } from '@angular/material/icon';
import { CertificateItemComponent } from './certificate-item/certificate-item.component';
import { NgForOf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Certificate } from '../../model/certificate';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [MatIcon, CertificateItemComponent, NgForOf, MatButtonModule],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent {
  @Input() certificates: Certificate[] = [];
  @Output() closeCertificatedEvent = new EventEmitter<void>();

  constructor(private liveAnnouncer: LiveAnnouncer) {}

  closeCertificates() {
    this.liveAnnouncer.announce('The certificates panel is closed.');
    this.closeCertificatedEvent.emit();
  }
}
