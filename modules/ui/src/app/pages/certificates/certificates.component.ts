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
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { CertificatesStore } from './certificates.store';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CertificatesTableComponent } from './components/certificates-table/certificates-table.component';
import { CertificateUploadButtonComponent } from './components/certificate-upload-button/certificate-upload-button.component';

@Component({
  selector: 'app-certificates',
  imports: [
    MatButtonModule,
    CertificateUploadButtonComponent,
    CommonModule,
    CertificatesTableComponent,
  ],
  providers: [CertificatesStore, DatePipe],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent implements OnDestroy {
  store = inject(CertificatesStore);
  dialog = inject(MatDialog);

  @Output() closeCertificatedEvent = new EventEmitter<void>();

  private destroy$: Subject<boolean> = new Subject<boolean>();

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  uploadFile(file: File) {
    this.store.uploadCertificate(file);
  }

  deleteCertificate(certificate: string) {
    this.store.selectCertificate(certificate);

    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: 'Delete certificate',
      data: {
        title: 'Delete certificate?',
        content: `You are about to delete a certificate ${this.store.getShortCertificateName(certificate)}. Are you sure?`,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: ['simple-dialog', 'delete-certificate'],
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(deleteCertificate => {
        if (deleteCertificate) {
          this.store.deleteCertificate(certificate);
          this.focusNextButton();
        }
      });
  }

  focusNextButton() {
    // Try to focus next interactive element, if exists
    const next = window.document.querySelector(
      '.certificate-selected + .cdk-row .certificate-item-delete'
    ) as HTMLButtonElement;
    if (next) {
      next.focus();
    } else {
      // If next interactive element doest not exist, upload button will be focused
      const uploadButton = window.document.querySelector(
        '.browse-files-button'
      ) as HTMLButtonElement;
      uploadButton?.focus();
    }
  }
}
