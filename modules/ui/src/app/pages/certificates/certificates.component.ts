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
import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { CertificateItemComponent } from './certificate-item/certificate-item.component';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { CdkTrapFocus, LiveAnnouncer } from '@angular/cdk/a11y';
import { CertificateUploadButtonComponent } from './certificate-upload-button/certificate-upload-button.component';
import { CertificatesStore } from './certificates.store';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [
    MatIcon,
    CertificateItemComponent,
    MatButtonModule,
    CertificateUploadButtonComponent,
    CommonModule,
  ],
  providers: [CertificatesStore, DatePipe],
  hostDirectives: [CdkTrapFocus],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent implements OnDestroy {
  viewModel$ = this.store.viewModel$;
  @Output() closeCertificatedEvent = new EventEmitter<void>();

  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private liveAnnouncer: LiveAnnouncer,
    private store: CertificatesStore,
    public dialog: MatDialog
  ) {
    this.store.getCertificates();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  closeCertificates() {
    this.liveAnnouncer.announce('The certificates panel is closed.');
    this.closeCertificatedEvent.emit();
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
      panelClass: 'simple-dialog',
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
      '.certificate-selected + app-certificate-item .certificate-item-delete'
    ) as HTMLButtonElement;
    if (next) {
      next.focus();
    } else {
      // If next interactive element doest not exist, close button will be focused
      const menuButton = window.document.querySelector(
        '.certificates-drawer-header .certificates-drawer-header-button'
      ) as HTMLButtonElement;
      menuButton?.focus();
    }
  }
}
