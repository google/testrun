/*
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

import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { catchError, EMPTY, exhaustMap, throwError } from 'rxjs';
import { Certificate } from '../../model/certificate';
import { TestRunService } from '../../services/test-run.service';
import { NotificationService } from '../../services/notification.service';
import { DatePipe } from '@angular/common';

export interface AppComponentState {
  certificates: Certificate[];
  selectedCertificate: string;
}
@Injectable()
export class CertificatesStore extends ComponentStore<AppComponentState> {
  private certificates$ = this.select(state => state.certificates);
  private selectedCertificate$ = this.select(
    state => state.selectedCertificate
  );

  viewModel$ = this.select({
    certificates: this.certificates$,
    selectedCertificate: this.selectedCertificate$,
  });

  updateCertificates = this.updater((state, certificates: Certificate[]) => ({
    ...state,
    certificates,
  }));

  selectCertificate = this.updater((state, selectedCertificate: string) => ({
    ...state,
    selectedCertificate,
  }));

  getCertificates = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.fetchCertificates().pipe(
          tap((certificates: Certificate[]) => {
            this.updateCertificates(certificates);
          })
        );
      })
    );
  });

  uploadCertificate = this.effect<File>(trigger$ => {
    return trigger$.pipe(
      withLatestFrom(this.certificates$),
      tap(([file, certificates]) => {
        this.addCertificate(file.name, certificates);
      }),
      exhaustMap(([file, certificates]) => {
        return this.testRunService.uploadCertificate(file).pipe(
          exhaustMap(uploaded => {
            if (uploaded) {
              return this.testRunService.fetchCertificates();
            }
            return throwError('Failed to upload certificate');
          }),
          tap(newCertificates => {
            const uploadedCertificate = newCertificates.filter(
              certificate =>
                !certificates.some(cert => cert.name === certificate.name)
            )[0];
            this.updateCertificates(newCertificates);
            this.notificationService.notify(
              `Certificate successfully added.\n${uploadedCertificate.name} by ${uploadedCertificate.organisation} valid until ${this.datePipe.transform(uploadedCertificate.expires, 'dd MMM yyyy')}`,
              0,
              'certificate-notification'
            );
          }),
          catchError(() => {
            this.removeCertificate(file.name, certificates);
            return EMPTY;
          })
        );
      })
    );
  });

  addCertificate(name: string, certificates: Certificate[]) {
    const certificate = { name, uploading: true } as Certificate;
    this.updateCertificates([certificate, ...certificates]);
  }

  deleteCertificate = this.effect<string>(trigger$ => {
    return trigger$.pipe(
      exhaustMap((name: string) => {
        return this.testRunService.deleteCertificate(name).pipe(
          withLatestFrom(this.certificates$),
          tap(([, current]) => {
            this.removeCertificate(name, current);
          })
        );
      })
    );
  });

  private removeCertificate(name: string, current: Certificate[]) {
    const certificates = current.filter(
      certificate => certificate.name !== name
    );
    this.updateCertificates(certificates);
  }

  constructor(
    private testRunService: TestRunService,
    private notificationService: NotificationService,
    private datePipe: DatePipe
  ) {
    super({
      certificates: [],
      selectedCertificate: '',
    });
  }
}
