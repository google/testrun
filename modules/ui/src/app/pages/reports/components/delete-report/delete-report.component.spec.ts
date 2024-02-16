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
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteReportComponent } from './delete-report.component';
import { of } from 'rxjs';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DeleteFormComponent } from '../../../../components/delete-form/delete-form.component';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../../../mocks/progress.mock';

describe('DeleteReportComponent', () => {
  let compiled: HTMLElement;
  let component: DeleteReportComponent;
  let fixture: ComponentFixture<DeleteReportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeleteReportComponent, MatDialogModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => ({}),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(DeleteReportComponent);
    component = fixture.componentInstance;
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
    compiled = fixture.nativeElement as HTMLElement;
  });

  describe('Class tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('#deleteReport should open delete dialog', () => {
      const deviceRemovedSpy = spyOn(component.removeDevice, 'emit');
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof DeleteFormComponent>);

      component.deleteReport(new Event('click'));

      expect(deviceRemovedSpy).toHaveBeenCalled();
    });
  });

  describe('DOM tests', () => {
    describe('with not data provided', () => {
      beforeEach(() => {
        (component.data as unknown) = null;
        fixture.detectChanges();
      });

      it('should not have content', () => {
        const deleteReportButton = compiled.querySelector(
          '.delete-report-button'
        );

        expect(deleteReportButton).toBeNull();
      });
    });

    describe('with data provided', () => {
      beforeEach(() => {
        component.data = MOCK_PROGRESS_DATA_COMPLIANT;
        fixture.detectChanges();
      });

      it('should have delete report button', () => {
        const deleteReportButton = compiled.querySelector(
          '.delete-report-button'
        );

        expect(deleteReportButton).toBeTruthy();
      });
    });
  });
});
