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

import { computed, inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import { switchMap, tap } from 'rxjs/operators';
import { catchError, EMPTY, exhaustMap, throwError } from 'rxjs';
import { Certificate } from '../../model/certificate';
import { TestRunService } from '../../services/test-run.service';
import { NotificationService } from '../../services/notification.service';
import { DatePipe } from '@angular/common';
import { FILE_NAME_LENGTH, getValidationErrors } from './certificate.validator';
import {
  withState,
  withHooks,
  withMethods,
  patchState,
  withComputed,
} from '@ngrx/signals';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { MatTableDataSource } from '@angular/material/table';

const SYMBOLS_PER_SECOND = 9.5;

export const CertificatesStore = signalStore(
  withState({
    certificates: [] as Certificate[],
    selectedCertificate: '',
    displayedColumns: ['name', 'organisation', 'expires', 'status', 'actions'],
    dataLoaded: false,
  }),
  withComputed(({ certificates }) => ({
    dataSource: computed(() => new MatTableDataSource(certificates())),
  })),
  withMethods(
    (
      store,
      testRunService = inject(TestRunService),
      notificationService = inject(NotificationService),
      datePipe = inject(DatePipe)
    ) => {
      function removeCertificate(name: string) {
        patchState(store, {
          certificates: store
            .certificates()
            .filter(certificate => certificate.name !== name),
        });
      }
      function addCertificate(name: string, certificates: Certificate[]) {
        const certificate = { name, uploading: true } as Certificate;
        patchState(store, {
          certificates: [certificate, ...certificates],
        });
      }
      function notify(message: string) {
        notificationService.notify(
          message,
          0,
          'certificate-notification',
          Math.ceil(message.length / SYMBOLS_PER_SECOND) * 1000,
          window.document.querySelector('.certificates-drawer-content')
        );
      }
      function getShortCertificateName(name: string) {
        return name.length <= FILE_NAME_LENGTH
          ? name
          : `${name.substring(0, FILE_NAME_LENGTH)}...`;
      }
      return {
        getShortCertificateName,
        selectCertificate: (certificate: string) => {
          patchState(store, {
            selectedCertificate: certificate,
          });
        },
        getCertificates: rxMethod<void>(
          switchMap(() =>
            testRunService.fetchCertificates().pipe(
              tapResponse({
                next: certificates =>
                  patchState(store, { certificates, dataLoaded: true }),
                error: () => patchState(store, { certificates: [] }),
              })
            )
          )
        ),
        deleteCertificate: rxMethod<string>(
          switchMap((certificate: string) =>
            testRunService.deleteCertificate(certificate).pipe(
              tapResponse({
                next: remove => {
                  if (remove) {
                    removeCertificate(certificate);
                  }
                },
                error: () =>
                  patchState(store, { certificates: store.certificates() }),
              })
            )
          )
        ),
        uploadCertificate: rxMethod<File>(
          switchMap((file: File) => {
            const errors = getValidationErrors(file);
            if (errors.length > 0) {
              errors.unshift(
                `File "${getShortCertificateName(file.name)}" is not added.`
              );
              notify(errors.join('\n'));
              return EMPTY;
            }
            addCertificate(file.name, store.certificates());
            return testRunService.uploadCertificate(file).pipe(
              exhaustMap(uploaded => {
                if (uploaded) {
                  return testRunService.fetchCertificates();
                }
                return throwError('Failed to upload certificate');
              }),
              tap(newCertificates => {
                const uploadedCertificate = newCertificates.filter(
                  certificate =>
                    !store
                      .certificates()
                      .some(cert => cert.name === certificate.name)
                )[0];
                patchState(store, { certificates: newCertificates });
                // @ts-expect-error data layer is not null
                window.dataLayer.push({
                  event: 'successful_saving_certificate',
                });
                notify(
                  `Certificate successfully added.\n${uploadedCertificate.name} by ${uploadedCertificate.organisation} valid until ${datePipe.transform(uploadedCertificate.expires, 'dd MMM yyyy')}`
                );
              }),
              catchError(() => {
                removeCertificate(file.name);
                return EMPTY;
              })
            );
          })
        ),
      };
    }
  ),
  withHooks({
    onInit({ getCertificates }) {
      getCertificates();
    },
  })
);
