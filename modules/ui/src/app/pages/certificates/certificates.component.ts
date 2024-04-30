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
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { CertificateItemComponent } from './certificate-item/certificate-item.component';
import { NgForOf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Certificate } from '../../model/certificate';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [MatIcon, CertificateItemComponent, NgForOf, MatButtonModule],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent implements OnDestroy {
  @Input() certificates: Certificate[] = [];
  @Output() closeCertificatedEvent = new EventEmitter<void>();
  @Output() deleteCertificateEvent = new EventEmitter<string>();

  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private liveAnnouncer: LiveAnnouncer,
    public dialog: MatDialog
  ) {}

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  closeCertificates() {
    this.liveAnnouncer.announce('The certificates panel is closed.');
    this.closeCertificatedEvent.emit();
  }

  deleteCertificate(name: string) {
    const dialogRef = this.dialog.open(DeleteFormComponent, {
      ariaLabel: 'Delete certificate',
      data: {
        title: 'Delete certificate',
        content: `You are about to delete a certificate ${name}. Are you sure?`,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'delete-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(deleteCertificate => {
        if (deleteCertificate) {
          this.deleteCertificateEvent.emit(name);
        }
      });
  }
}
