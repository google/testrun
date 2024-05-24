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
import { TestBed } from '@angular/core/testing';
import { of, skip, take } from 'rxjs';
import { provideMockStore } from '@ngrx/store/testing';
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import {
  certificate,
  certificate2,
  certificate_uploading,
  FILE,
  INVALID_FILE,
} from '../../mocks/certificate.mock';
import { CertificatesStore } from './certificates.store';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DatePipe } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

describe('CertificatesStore', () => {
  let certificateStore: CertificatesStore;
  let mockService: SpyObj<TestRunService>;
  const notificationServiceMock: jasmine.SpyObj<NotificationService> =
    jasmine.createSpyObj(['notify']);

  beforeEach(() => {
    mockService = jasmine.createSpyObj([
      'fetchCertificates',
      'uploadCertificate',
      'deleteCertificate',
    ]);

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        CertificatesStore,
        provideMockStore({}),
        { provide: TestRunService, useValue: mockService },
        { provide: NotificationService, useValue: notificationServiceMock },
        DatePipe,
      ],
    });

    certificateStore = TestBed.inject(CertificatesStore);
  });

  it('should be created', () => {
    expect(certificateStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update certificates', (done: DoneFn) => {
      certificateStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.certificates).toEqual([certificate]);
        done();
      });

      certificateStore.updateCertificates([certificate]);
    });

    it('should update selectedCertificate', (done: DoneFn) => {
      const certificate = 'test';
      certificateStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.selectedCertificate).toEqual(certificate);
        done();
      });

      certificateStore.selectCertificate(certificate);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      certificateStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          certificates: [],
          selectedCertificate: '',
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('fetchCertificates', () => {
      const certificates = [certificate];

      beforeEach(() => {
        mockService.fetchCertificates.and.returnValue(of(certificates));
      });

      it('should update certificates', done => {
        certificateStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.certificates).toEqual(certificates);
          done();
        });

        certificateStore.getCertificates();
      });
    });

    describe('uploadCertificate', () => {
      beforeEach(() => {
        mockService.uploadCertificate.and.returnValue(of(true));
        mockService.fetchCertificates.and.returnValue(of([certificate]));
      });

      describe('with valid certificate file', () => {
        it('should update certificates', done => {
          const uploadingCertificate = certificate_uploading;

          certificateStore.viewModel$
            .pipe(skip(1), take(1))
            .subscribe(store => {
              expect(store.certificates).toContain(uploadingCertificate);
            });

          certificateStore.viewModel$
            .pipe(skip(2), take(1))
            .subscribe(store => {
              expect(store.certificates).toEqual([certificate]);
              done();
            });

          certificateStore.uploadCertificate(FILE);
        });

        it('should notify', () => {
          certificateStore.uploadCertificate(FILE);
          expect(notificationServiceMock.notify).toHaveBeenCalledWith(
            'Certificate successfully added.\niot.bms.google.com by Google, Inc. valid until 01 Sep 2024',
            0,
            'certificate-notification',
            10000
          );
        });
      });

      describe('with invalid certificate file', () => {
        it('should notify about errors', () => {
          certificateStore.uploadCertificate(INVALID_FILE);

          expect(notificationServiceMock.notify).toHaveBeenCalledWith(
            'File "some very long strange n..." is not added.\nThe file name should be alphanumeric, symbols  -_. are allowed.\nFile extension must be .cert, .crt, .pem, .cer.\nMax name length is 24 characters.\nFile size should be a max of 4KB',
            0,
            'certificate-notification',
            24000
          );
        });
      });
    });

    describe('deleteCertificate', () => {
      it('should update store', done => {
        mockService.deleteCertificate.and.returnValue(of(true));

        certificateStore.updateCertificates([certificate, certificate2]);

        certificateStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.certificates).toEqual([certificate2]);
          done();
        });

        certificateStore.deleteCertificate(certificate.name);
      });
    });
  });
});
