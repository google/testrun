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
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';

import { CertificatesComponent } from './certificates.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatIcon } from '@angular/material/icon';
import { certificate } from '../../mocks/certificate.mock';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import SpyObj = jasmine.SpyObj;
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { TestRunService } from '../../services/test-run.service';
import { NotificationService } from '../../services/notification.service';
import { FILE, INVALID_FILE } from '../../mocks/certificate.mock';

describe('CertificatesComponent', () => {
  let component: CertificatesComponent;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;
  let mockService: SpyObj<TestRunService>;
  let fixture: ComponentFixture<CertificatesComponent>;

  const notificationServiceMock: jasmine.SpyObj<NotificationService> =
    jasmine.createSpyObj(['notify']);

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('mockService', [
      'fetchCertificates',
      'deleteCertificate',
      'uploadCertificate',
    ]);
    mockService.uploadCertificate.and.returnValue(of(true));
    mockService.deleteCertificate.and.returnValue(of(true));
    mockService.fetchCertificates.and.returnValue(
      of([certificate, certificate])
    );
    mockLiveAnnouncer = jasmine.createSpyObj(['announce']);
    await TestBed.configureTestingModule({
      imports: [CertificatesComponent, MatIconTestingModule, MatIcon],
      providers: [
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
        { provide: TestRunService, useValue: mockService },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    mockService.uploadCertificate.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
    it('should have upload file button', () => {
      const uploadCertificatesButton = fixture.nativeElement.querySelector(
        '.browse-files-button'
      ) as HTMLButtonElement;

      expect(uploadCertificatesButton).toBeDefined();
    });

    describe('with certificates', () => {
      it('should have certificates list', () => {
        const certificateList =
          fixture.nativeElement.querySelectorAll('.cdk-row');

        expect(certificateList.length).toEqual(2);
      });
    });
  });

  describe('Class tests', () => {
    describe('#deleteCertificate', () => {
      it('should open delete certificate modal', fakeAsync(() => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof SimpleDialogComponent>);
        tick();

        component.deleteCertificate(certificate.name);
        tick();

        expect(openSpy).toHaveBeenCalledWith(SimpleDialogComponent, {
          ariaLabel: 'Delete certificate',
          data: {
            title: 'Delete certificate?',
            content: `You are about to delete a certificate iot.bms.google.com. Are you sure?`,
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: ['simple-dialog', 'delete-certificate'],
        });

        openSpy.calls.reset();
      }));
    });

    describe('#focusNextButton', () => {
      it('should focus next active element if exist', fakeAsync(() => {
        const row = window.document.querySelector('.cdk-row') as HTMLElement;
        row.classList.add('certificate-selected');
        const nextButton = window.document.querySelector(
          '.certificate-selected + .cdk-row .certificate-item-delete'
        ) as HTMLButtonElement;
        const buttonFocusSpy = spyOn(nextButton, 'focus');

        component.focusNextButton();

        expect(buttonFocusSpy).toHaveBeenCalled();
        flush();
      }));

      it('should focus upload button if next active element does not exist', fakeAsync(() => {
        const nextButton = window.document.querySelector(
          '.browse-files-button'
        ) as HTMLButtonElement;
        const buttonFocusSpy = spyOn(nextButton, 'focus');

        component.focusNextButton();

        expect(buttonFocusSpy).toHaveBeenCalled();
        flush();
      }));
    });

    describe('#uploadFile', () => {
      it('should not call uploadCertificate if file has errors', () => {
        component.uploadFile(INVALID_FILE);

        expect(mockService.uploadCertificate).not.toHaveBeenCalled();
      });

      it('should call uploadCertificate if there is no errors', () => {
        component.uploadFile(FILE);

        expect(mockService.uploadCertificate).toHaveBeenCalled();
      });
    });
  });
});
