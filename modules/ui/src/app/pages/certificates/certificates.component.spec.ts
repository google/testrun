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
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';

import { CertificatesComponent } from './certificates.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatIcon } from '@angular/material/icon';
import { certificate } from '../../mocks/certificate.mock';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import SpyObj = jasmine.SpyObj;
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';

describe('CertificatesComponent', () => {
  let component: CertificatesComponent;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;
  let fixture: ComponentFixture<CertificatesComponent>;

  beforeEach(async () => {
    mockLiveAnnouncer = jasmine.createSpyObj(['announce']);
    await TestBed.configureTestingModule({
      imports: [CertificatesComponent, MatIconTestingModule, MatIcon],
      providers: [{ provide: LiveAnnouncer, useValue: mockLiveAnnouncer }],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
    it('should emit closeSettingEvent when header button clicked', () => {
      const headerCloseButton = fixture.nativeElement.querySelector(
        '.certificates-drawer-header-button'
      ) as HTMLButtonElement;
      spyOn(component.closeCertificatedEvent, 'emit');

      headerCloseButton.click();

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'The certificates panel is closed.'
      );
      expect(component.closeCertificatedEvent.emit).toHaveBeenCalled();
    });

    it('should emit closeSettingEvent when close button clicked', () => {
      const headerCloseButton = fixture.nativeElement.querySelector(
        '.close-button'
      ) as HTMLButtonElement;
      spyOn(component.closeCertificatedEvent, 'emit');

      headerCloseButton.click();

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'The certificates panel is closed.'
      );
      expect(component.closeCertificatedEvent.emit).toHaveBeenCalled();
    });

    it('should have upload file button', () => {
      const uploadCertificatesButton = fixture.nativeElement.querySelector(
        '.browse-files-button'
      ) as HTMLButtonElement;

      expect(uploadCertificatesButton).toBeDefined();
    });

    describe('with certificates', () => {
      beforeEach(() => {
        component.certificates = [certificate, certificate];
        fixture.detectChanges();
      });

      it('should have certificates list', () => {
        const certificateList = fixture.nativeElement.querySelectorAll(
          'app-certificate-item'
        );

        expect(certificateList.length).toEqual(2);
      });
    });
  });

  describe('Class tests', () => {
    describe('#deleteCertificate', () => {
      it('should open delete certificate modal', fakeAsync(() => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof DeleteFormComponent>);

        component.deleteCertificate(certificate.name);

        expect(openSpy).toHaveBeenCalledWith(DeleteFormComponent, {
          ariaLabel: 'Delete certificate',
          data: {
            title: 'Delete certificate',
            content: `You are about to delete a certificate iot.bms.google.com. Are you sure?`,
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'delete-form-dialog',
        });

        openSpy.calls.reset();
      }));
    });
  });
});
