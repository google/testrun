import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ProgressStatusCardComponent} from './progress-status-card.component';
import {StatusOfTestrun, TestrunStatus} from '../../model/testrun-status';
import {MOCK_PROGRESS_DATA_COMPLIANT, MOCK_PROGRESS_DATA_IN_PROGRESS} from '../../mocks/progress.mock';

describe('ProgressStatusCardComponent', () => {
  let component: ProgressStatusCardComponent;
  let fixture: ComponentFixture<ProgressStatusCardComponent>;

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [ProgressStatusCardComponent]
      });
      fixture = TestBed.createComponent(ProgressStatusCardComponent);
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('#getClass', () => {
      it('should have class "progress" if status "In Progress"', () => {
        const expectedResult = {
          progress: true,
          'completed-success': false,
          'completed-failed': false,
          canceled: false
        };

        const result = component.getClass(StatusOfTestrun.InProgress);

        expect(result).toEqual(expectedResult);
      });

      it('should have class "completed-success" if status "Compliant"', () => {
        const expectedResult = {
          progress: false,
          'completed-success': true,
          'completed-failed': false,
          canceled: false
        };

        const result = component.getClass(StatusOfTestrun.Compliant);

        expect(result).toEqual(expectedResult);
      });

      it('should have class "completed-failed" if status "Non Compliant"', () => {
        const expectedResult = {
          progress: false,
          'completed-success': false,
          'completed-failed': true,
          canceled: false
        };

        const result = component.getClass(StatusOfTestrun.NonCompliant);

        expect(result).toEqual(expectedResult);
      });

      it('should have class "canceled" if status "Cancelled"', () => {
        const expectedResult = {
          progress: false,
          'completed-success': false,
          'completed-failed': false,
          canceled: true
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
        const expectedResult = '2/2';

        const result = component.getTestsResult(MOCK_PROGRESS_DATA_COMPLIANT);

        expect(result).toEqual(expectedResult);
      });

      it('should return empty string if no data', () => {
        const expectedResult = '';

        const result = component.getTestsResult({} as TestrunStatus);

        expect(result).toEqual(expectedResult);
      });
    });

    describe('#getProgressValue', () => {
      it('should return correct progress value if status "In Progress"', () => {
        const expectedResult = 2 / 26 * 100;

        const result = component.getProgressValue(MOCK_PROGRESS_DATA_IN_PROGRESS);

        expect(result).toEqual(expectedResult);
      });

      it('should return zero if no data', () => {
        const expectedResult = 0;

        const result = component.getProgressValue({} as TestrunStatus);

        expect(result).toEqual(expectedResult);
      });
    });
  });
});
