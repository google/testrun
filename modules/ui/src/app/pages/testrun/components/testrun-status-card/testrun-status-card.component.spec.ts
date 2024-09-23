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
  StatusOfTestrun,
  TestrunStatus,
} from '../../../../model/testrun-status';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
  MOCK_PROGRESS_DATA_MONITORING,
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
} from '../../../../mocks/testrun.mock';
import { TestrunModule } from '../../testrun.module';

describe('ProgressStatusCardComponent', () => {
  let component: TestrunStatusCardComponent;
  let fixture: ComponentFixture<TestrunStatusCardComponent>;

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [TestrunStatusCardComponent],
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
      };

      const statusesForProgressClass = [
        StatusOfTestrun.InProgress,
        StatusOfTestrun.WaitingForDevice,
        StatusOfTestrun.Monitoring,
      ];

      const statusesForCompletedSuccessClass = [
        StatusOfTestrun.Compliant,
        StatusOfTestrun.CompliantLimited,
        StatusOfTestrun.CompliantHigh,
      ];

      const statusesForCompletedFailedClass = [
        StatusOfTestrun.NonCompliant,
        StatusOfTestrun.Error,
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

          const result = component.getClass(testCase);

          expect(result).toEqual(expectedResult);
        });
      });

      statusesForCompletedFailedClass.forEach(testCase => {
        it(`should have class "completed-failed" if status "${testCase}"`, () => {
          const expectedResult = {
            ...availableClasses,
            'completed-failed': true,
          };

          const result = component.getClass(testCase);

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

      it('should return empty string if no data', () => {
        const expectedResult = '';

        const result = component.getTestsResult({} as TestrunStatus);

        expect(result).toEqual(expectedResult);
      });
    });

    describe('#getTestStatus', () => {
      it('should return test status "Complete" if testrun is finished', () => {
        const expectedResult = 'Complete';

        const result = component.getTestStatus(MOCK_PROGRESS_DATA_COMPLIANT);

        expect(result).toEqual(expectedResult);
      });

      it('should return test status "Incomplete" if status "Cancelled"', () => {
        const expectedResult = 'Incomplete';

        const result = component.getTestStatus(MOCK_PROGRESS_DATA_CANCELLED);

        expect(result).toEqual(expectedResult);
      });

      it('should return test status "In Progress" if status "In Progress"', () => {
        const expectedResult = 'In Progress';

        const result = component.getTestStatus(MOCK_PROGRESS_DATA_IN_PROGRESS);

        expect(result).toEqual(expectedResult);
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
        declarations: [TestrunStatusCardComponent],
        imports: [TestrunModule],
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

      it('should not have progress bar element', () => {
        const progressBarEl = compiled.querySelector('.progress-bar');

        expect(progressBarEl).toBeNull();
      });

      it('should have progress card result', () => {
        const progressCardResultEl = compiled.querySelector(
          '.progress-card-result-text span'
        );

        expect(progressCardResultEl).not.toBeNull();
        expect(progressCardResultEl?.textContent).toEqual('Cancelled');
      });

      it('should have progress card status text as "Incomplete"', () => {
        const progressCardStatusText = compiled.querySelector(
          '.progress-card-status-text > span'
        );

        expect(progressCardStatusText).not.toBeNull();
        expect(progressCardStatusText?.textContent).toEqual('Incomplete');
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
          '.progress-card-status-text > span'
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
          '.progress-card-status-text > span'
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

      it('should have progress card status text as "Waiting for Device"', () => {
        const progressCardStatusText = compiled.querySelector(
          '.progress-card-status-text > span'
        );

        expect(progressCardStatusText).not.toBeNull();
        expect(progressCardStatusText?.textContent).toEqual('Monitoring');
      });
    });
  });
});
