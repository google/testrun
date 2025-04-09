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

import { TestrunStatusCardComponent } from './testrun-status-card.component';
import {
  ResultOfTestrun,
  StatusOfTestrun,
  TestrunStatus,
} from '../../../../model/testrun-status';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
  MOCK_PROGRESS_DATA_MONITORING,
  MOCK_PROGRESS_DATA_PROCEED,
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
  MOCK_PROGRESS_DATA_WITH_ERROR,
} from '../../../../mocks/testrun.mock';

describe('ProgressStatusCardComponent', () => {
  let component: TestrunStatusCardComponent;
  let fixture: ComponentFixture<TestrunStatusCardComponent>;

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [TestrunStatusCardComponent],
      });
      fixture = TestBed.createComponent(TestrunStatusCardComponent);
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('#getClass', () => {
      const availableClasses = {
        progress: false,
        'completed-success': false,
        'completed-failed': false,
        canceled: false,
        error: false,
      };

      const statusesForProgressClass = [
        StatusOfTestrun.InProgress,
        StatusOfTestrun.WaitingForDevice,
        StatusOfTestrun.Monitoring,
      ];

      const statusesForCompletedSuccessClass = [
        StatusOfTestrun.Complete,
        StatusOfTestrun.CompliantLimited,
        StatusOfTestrun.CompliantHigh,
        StatusOfTestrun.Proceed,
      ];

      const statusesForCompletedFailedClass = [
        StatusOfTestrun.Complete,
        StatusOfTestrun.DoNotProceed,
      ];

      statusesForProgressClass.forEach(testCase => {
        it(`should have class "progress" if status "${testCase}"`, () => {
          const expectedResult = { ...availableClasses, progress: true };

          const result = component.getClass(testCase);

          expect(result).toEqual(expectedResult);
        });
      });

      statusesForCompletedSuccessClass.forEach(testCase => {
        it(`should have class "completed-success" if status "${testCase}"`, () => {
          const expectedResult = {
            ...availableClasses,
            'completed-success': true,
          };

          const result = component.getClass(
            testCase,
            ResultOfTestrun.Compliant
          );

          expect(result).toEqual(expectedResult);
        });
      });

      statusesForCompletedFailedClass.forEach(testCase => {
        it(`should have class "completed-failed" if status "${testCase}"`, () => {
          const expectedResult = {
            ...availableClasses,
            'completed-failed': true,
          };

          const result = component.getClass(
            testCase,
            ResultOfTestrun.NonCompliant
          );

          expect(result).toEqual(expectedResult);
        });
      });

      it('should have class "canceled" if status "Cancelled"', () => {
        const expectedResult = {
          ...availableClasses,
          canceled: true,
        };

        const result = component.getClass(StatusOfTestrun.Cancelled);

        expect(result).toEqual(expectedResult);
      });

      it('should have class "error" if status "Error"', () => {
        const expectedResult = {
          ...availableClasses,
          error: true,
        };

        const result = component.getClass(StatusOfTestrun.Error);

        expect(result).toEqual(expectedResult);
      });
    });

    describe('#getTestsResult', () => {
      it('should return correct test result if status "In Progress"', () => {
        const expectedResult = '2/26';

        const result = component.getTestsResult(MOCK_PROGRESS_DATA_IN_PROGRESS);

        expect(result).toEqual(expectedResult);
      });

      it('should return correct test result if status "Compliant"', () => {
        const expectedResult = '2/3';

        const result = component.getTestsResult(MOCK_PROGRESS_DATA_COMPLIANT);

        expect(result).toEqual(expectedResult);
      });

      it('should return correct test result if status "Cancelled"', () => {
        const expectedResult = '2/26';

        const result = component.getTestsResult(MOCK_PROGRESS_DATA_CANCELLED);

        expect(result).toEqual(expectedResult);
      });

      it('should not include Error and Not Started status in completed test result', () => {
        const expectedResult = '1/3';

        const result = component.getTestsResult(MOCK_PROGRESS_DATA_WITH_ERROR);

        expect(result).toEqual(expectedResult);
      });

      it('should return empty string if no data', () => {
        const expectedResult = '-/-';

        const result = component.getTestsResult({} as TestrunStatus);

        expect(result).toEqual(expectedResult);
      });
    });

    describe('#getTestStatusText should return status text as', () => {
      it('"Status" if not finished', () => {
        const expectedText = 'Status';

        const result = component.getTestStatusText(
          MOCK_PROGRESS_DATA_MONITORING
        );

        expect(result).toEqual(expectedText);
      });

      it('"Result" if finished and not Pilot statuses', () => {
        const expectedText = 'Result';

        const result = component.getTestStatusText(
          MOCK_PROGRESS_DATA_COMPLIANT
        );

        expect(result).toEqual(expectedText);
      });
    });

    describe('#getTestStatus', () => {
      it('should return test result if testrun has status "Complete"', () => {
        const expectedResult = MOCK_PROGRESS_DATA_COMPLIANT.result as string;

        const result = component.getTestStatus(MOCK_PROGRESS_DATA_COMPLIANT);

        expect(result).toEqual(expectedResult);
      });

      it('should return test status "Cancelled" if status "Cancelled"', () => {
        const result = component.getTestStatus(MOCK_PROGRESS_DATA_CANCELLED);

        expect(result).toEqual(StatusOfTestrun.Cancelled);
      });

      it('should return test status "In Progress" if status "In Progress"', () => {
        const result = component.getTestStatus(MOCK_PROGRESS_DATA_IN_PROGRESS);

        expect(result).toEqual(StatusOfTestrun.InProgress);
      });

      it('should return test status "Monitoring" if finished with status "Monitoring"', () => {
        const MOCK_MONITORING_FINISHED_DATA = {
          ...MOCK_PROGRESS_DATA_MONITORING,
          finished: '2023-06-22T09:20:00.123Z',
        };

        const result = component.getTestStatus(MOCK_MONITORING_FINISHED_DATA);

        expect(result).toEqual(StatusOfTestrun.Monitoring);
      });
    });

    describe('#getProgressValue', () => {
      it('should return correct progress value if status "In Progress"', () => {
        const expectedResult = Math.round((2 / 26) * 100);

        const result = component.getProgressValue(
          MOCK_PROGRESS_DATA_IN_PROGRESS
        );

        expect(result).toEqual(expectedResult);
      });

      it('should return zero if no data', () => {
        const expectedResult = 0;

        const result = component.getProgressValue({} as TestrunStatus);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('DOM tests', () => {
    let compiled: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestrunStatusCardComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestrunStatusCardComponent);
      compiled = fixture.nativeElement as HTMLElement;
      component = fixture.componentInstance;
    });

    describe('with not systemStatus$ data', () => {
      beforeEach(() => {
        (component.systemStatus as unknown) = null;
        fixture.detectChanges();
      });

      it('should not have content', () => {
        const progressCardEl = compiled.querySelector('.progress-card');

        expect(progressCardEl).toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Cancelled', () => {
      beforeEach(() => {
        component.systemStatus = MOCK_PROGRESS_DATA_CANCELLED;
        fixture.detectChanges();
      });

      it('should have progress card content', () => {
        const progressCardEl = compiled.querySelector('.progress-card');

        expect(progressCardEl).not.toBeNull();
      });

      it('should have class "canceled" on progress card element', () => {
        const progressCardEl = compiled.querySelector('.progress-card');

        expect(progressCardEl?.classList).toContain('canceled');
      });

      it('should have progress bar element', () => {
        const progressBarEl = compiled.querySelector('.progress-bar');

        expect(progressBarEl).not.toBeNull();
      });

      it('should have progress card status text as "Cancelled"', () => {
        const progressCardStatusText = compiled.querySelector(
          '.progress-card-info-status .progress-card-info-text > span'
        );

        expect(progressCardStatusText).not.toBeNull();
        expect(progressCardStatusText?.textContent).toEqual('Cancelled');
      });
    });

    describe('with available systemStatus$ data, as "In Progress"', () => {
      beforeEach(() => {
        component.systemStatus = MOCK_PROGRESS_DATA_IN_PROGRESS;
        fixture.detectChanges();
      });

      it('should have class "progress" on progress card element', () => {
        const progressCardEl = compiled.querySelector('.progress-card');

        expect(progressCardEl?.classList).toContain('progress');
      });

      it('should have progress bar element', () => {
        const progressBarEl = compiled.querySelector('.progress-bar');

        expect(progressBarEl).not.toBeNull();
      });

      it('should not have progress card result', () => {
        const progressCardResultEl = compiled.querySelector(
          '.progress-card-result-text span'
        );

        expect(progressCardResultEl).toBeNull();
      });

      it('should have progress card status text as "In Progress"', () => {
        const progressCardStatusText = compiled.querySelector(
          '.progress-card-info-status .progress-card-info-text > span'
        );

        expect(progressCardStatusText).not.toBeNull();
        expect(progressCardStatusText?.textContent).toEqual('In Progress');
      });
    });

    describe('with available systemStatus$ data, as "In Progress" and finish date', () => {
      beforeEach(() => {
        component.systemStatus = {
          ...MOCK_PROGRESS_DATA_IN_PROGRESS,
          finished: '2023-06-22T09:26:00.123Z',
        };
        fixture.detectChanges();
      });

      it('should not have progress card result', () => {
        const progressCardResultEl = compiled.querySelector(
          '.progress-card-result-text span'
        );

        expect(progressCardResultEl).toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Waiting for Device', () => {
      beforeEach(() => {
        component.systemStatus = MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE;
        fixture.detectChanges();
      });

      it('should have progress card content', () => {
        const progressCardEl = compiled.querySelector('.progress-card');

        expect(progressCardEl).not.toBeNull();
      });

      it('should have class "progress" on progress card element', () => {
        const progressCardEl = compiled.querySelector('.progress-card');

        expect(progressCardEl?.classList).toContain('progress');
      });

      it('should have progress card result title', () => {
        const progressCardResultEl = compiled.querySelector(
          '.progress-card-result-title'
        );

        expect(progressCardResultEl).not.toBeNull();
        expect(progressCardResultEl?.textContent?.trim()).toEqual(
          'Please connect and power on your device'
        );
      });

      it('should have progress card status text as "Waiting for Device"', () => {
        const progressCardStatusText = compiled.querySelector(
          '.progress-card-info-status .progress-card-info-text > span'
        );

        expect(progressCardStatusText).not.toBeNull();
        expect(progressCardStatusText?.textContent).toEqual(
          'Waiting for Device'
        );
      });
    });

    describe('with available systemStatus$ data, as Monitoring', () => {
      beforeEach(() => {
        component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
        fixture.detectChanges();
      });

      it('should have progress card content', () => {
        const progressCardEl = compiled.querySelector('.progress-card');

        expect(progressCardEl).not.toBeNull();
      });

      it('should have class "progress" on progress card element', () => {
        const progressCardEl = compiled.querySelector('.progress-card');

        expect(progressCardEl?.classList).toContain('progress');
      });

      it('should have progress card result title', () => {
        const progressCardResultEl = compiled.querySelector(
          '.progress-card-result-title'
        );

        expect(progressCardResultEl).not.toBeNull();
        expect(progressCardResultEl?.textContent?.trim()).toEqual(
          'Please wait, this could take a few minutes'
        );
      });

      it('should have progress card status text as "Monitoring"', () => {
        const progressCardStatusText = compiled.querySelector(
          '.progress-card-info-status .progress-card-info-text > span'
        );

        expect(progressCardStatusText).not.toBeNull();
        expect(progressCardStatusText?.textContent).toEqual('Monitoring');
      });
    });

    describe('with available systemStatus$ data, as "Proceed"', () => {
      beforeEach(() => {
        component.systemStatus = MOCK_PROGRESS_DATA_PROCEED;
        fixture.detectChanges();
      });

      it('should have status', () => {
        const titleEl = compiled.querySelectorAll(
          '.progress-card-info-status .progress-card-info-title'
        )[0];
        const textEl = compiled.querySelectorAll(
          '.progress-card-info-status .progress-card-info-text'
        )[0];

        expect(titleEl.textContent).toEqual('Result');
        expect(textEl.textContent).toEqual('Compliant');
      });

      it('should have Pilot recommendations', () => {
        const titleEl = compiled.querySelectorAll(
          '.progress-card-info-status .progress-card-info-title'
        )[1];
        const textEl = compiled.querySelectorAll(
          '.progress-card-info-status .progress-card-info-text'
        )[1];

        expect(titleEl.textContent?.trim()).toEqual(
          'Preliminary Pilot Recommendation'
        );
        expect(textEl.textContent?.trim()).toEqual('Proceed');
      });
    });
  });
});
