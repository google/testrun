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

import { DownloadReportZipComponent } from './download-report-zip.component';
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import {
  DialogCloseAction,
  DownloadZipModalComponent,
} from '../download-zip-modal/download-zip-modal.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../mocks/testrun.mock';

describe('DownloadReportZipComponent', () => {
  let component: DownloadReportZipComponent;
  let fixture: ComponentFixture<DownloadReportZipComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'risk-assessment', component: FakeRiskAssessmentComponent },
        ]),
        DownloadReportZipComponent,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DownloadReportZipComponent);
    compiled = fixture.nativeElement as HTMLElement;
    component = fixture.componentInstance;
    component.report = 'localhost:8080';
    component.export = 'localhost:8080';
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
  });

  describe('Class tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('#onClick', () => {
      it('should open zip modal dialog', fakeAsync(() => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () =>
            of({ action: DialogCloseAction.Download, profile: '' }),
        } as MatDialogRef<typeof DownloadZipModalComponent>);
        component.onClick(new Event('click'));

        expect(openSpy).toHaveBeenCalledWith(DownloadZipModalComponent, {
          ariaLabel: 'Download zip',
          data: {
            profiles: [],
            report: 'localhost:8080',
            export: 'localhost:8080',
            isPilot: false,
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'initiate-test-run-dialog',
        });
        openSpy.calls.reset();
      }));
    });

    it('should have title', () => {
      component.ngOnInit();

      expect(component.tooltip.message).toEqual(
        'Download zip for Testrun # Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20'
      );
    });
  });

  describe('DOM tests', () => {
    it('should open risk profiles modal on click', () => {
      const openSpy = spyOn(component.dialog, 'open');
      compiled.click();

      expect(openSpy).toHaveBeenCalled();

      openSpy.calls.reset();
    });

    describe('tooltip', () => {
      it('should be shown on mouseenter', () => {
        const spyOnShow = spyOn(component.tooltip, 'show');
        fixture.nativeElement.dispatchEvent(new Event('mouseenter'));

        expect(spyOnShow).toHaveBeenCalled();
      });

      it('should be shown on keyup', () => {
        const spyOnShow = spyOn(component.tooltip, 'show');
        fixture.nativeElement.dispatchEvent(new Event('keyup'));

        expect(spyOnShow).toHaveBeenCalled();
      });

      it('should be hidden on mouseleave', () => {
        const spyOnHide = spyOn(component.tooltip, 'hide');
        fixture.nativeElement.dispatchEvent(new Event('mouseleave'));

        expect(spyOnHide).toHaveBeenCalled();
      });

      it('should be hidden on keydown', () => {
        const spyOnHide = spyOn(component.tooltip, 'hide');
        fixture.nativeElement.dispatchEvent(new Event('keydown'));

        expect(spyOnHide).toHaveBeenCalled();
      });
    });
  });
});

@Component({
  selector: 'app-fake-risk-assessment-component',
  template: '',
})
class FakeRiskAssessmentComponent {}
