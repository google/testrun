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
  TestBed,
  tick,
} from '@angular/core/testing';

import { TestrunTableComponent } from './testrun-table.component';

import {
  IResult,
  RequiredResult,
  StatusOfTestResult,
} from '../../../../model/testrun-status';
import {
  TEST_DATA,
  TEST_DATA_RESULT,
  TEST_DATA_RESULT_WITH_RECOMMENDATIONS,
} from '../../../../mocks/testrun.mock';
import { TestRunService } from '../../../../services/test-run.service';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { TestResultDialogComponent } from '../test-result-dialog/test-result-dialog.component';

describe('ProgressTableComponent', () => {
  let component: TestrunTableComponent;
  let fixture: ComponentFixture<TestrunTableComponent>;

  const testRunServiceMock = jasmine.createSpyObj(['getResultClass']);

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [TestrunTableComponent],
        providers: [{ provide: TestRunService, useValue: testRunServiceMock }],
      });
      fixture = TestBed.createComponent(TestrunTableComponent);
      component = fixture.componentInstance;
      component.dataSource = TEST_DATA.results;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('#getResultClass should call the service method getResultClass"', () => {
      const expectedResult = {
        green: false,
        red: true,
        blue: false,
        cyan: false,
        grey: false,
      };

      testRunServiceMock.getResultClass.and.returnValue(expectedResult);

      const result = component.getResultClass(StatusOfTestResult.NonCompliant);

      expect(testRunServiceMock.getResultClass).toHaveBeenCalledWith(
        StatusOfTestResult.NonCompliant
      );
      expect(result).toEqual(expectedResult);
    });

    it('#trackTest should return name and status', () => {
      expect(component.trackTest(1, TEST_DATA_RESULT[0])).toEqual(
        'dns.network.hostname_resolutionCompliant'
      );
    });

    it('#getRequiredResultClass should return class', () => {
      const result1 = component.getRequiredResultClass(
        RequiredResult.Informational
      );
      const result2 = component.getRequiredResultClass(
        RequiredResult.RequiredIfApplicable
      );
      const result3 = component.getRequiredResultClass(RequiredResult.Required);

      expect(result1).toEqual('informational');
      expect(result2).toEqual('required-if-applicable');
      expect(result3).toEqual('required');
    });
  });

  describe('DOM tests', () => {
    let compiled: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [FakeCalloutComponent],
        providers: [{ provide: TestRunService, useValue: testRunServiceMock }],
        imports: [
          BrowserAnimationsModule,
          MatIconModule,
          TestrunTableComponent,
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(TestrunTableComponent);
      component = fixture.componentInstance;
      compiled = fixture.nativeElement as HTMLElement;
    });

    describe('with not dataSource$ data', () => {
      beforeEach(() => {
        component.dataSource = undefined;
        fixture.detectChanges();
      });

      it('should be unavailable', () => {
        const tests = compiled.querySelector('mat-table');

        expect(tests).toBeNull();
      });
    });

    describe('with dataSource$ data', () => {
      beforeEach(() => {
        component.dataSource = TEST_DATA.results;
        fixture.detectChanges();
      });

      it('should be available', () => {
        const tests = compiled.querySelector('mat-table');

        expect(tests).not.toBeNull();
      });

      it('should have rows as provided from data', () => {
        const expectedRowsLength = (TEST_DATA.results as IResult[]).length;
        const testsRows = compiled.querySelectorAll('mat-row');

        expect(testsRows.length).toBe(expectedRowsLength);
      });
    });

    describe('with recommendations', () => {
      beforeEach(() => {
        component.dataSource = TEST_DATA_RESULT_WITH_RECOMMENDATIONS;
        fixture.detectChanges();
      });

      it('should have clickable row', () => {
        const clickableRow = compiled.querySelector('mat-row.clickable-row');

        expect(clickableRow).not.toBeNull();
      });

      it('#onRowSelected should open test result modal', fakeAsync(() => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof TestResultDialogComponent>);
        tick();

        const testResult = TEST_DATA_RESULT_WITH_RECOMMENDATIONS[0];
        component.onRowSelected(testResult);
        tick();

        expect(openSpy).toHaveBeenCalledWith(TestResultDialogComponent, {
          ariaLabel: 'Test result information',
          data: {
            testResult,
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: ['simple-dialog'],
        });

        openSpy.calls.reset();
      }));
    });
  });
});

@Component({
  selector: 'app-callout',
  template: '<div></div>',
  standalone: false,
})
class FakeCalloutComponent {
  @Input() type = '';
}
