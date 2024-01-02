import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportActionComponent } from './report-action.component';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../mocks/progress.mock';

describe('ReportActionComponent', () => {
  let component: ReportActionComponent;
  let fixture: ComponentFixture<ReportActionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReportActionComponent],
    });
    fixture = TestBed.createComponent(ReportActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Class tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('#getTestRunId should return data for title of link', () => {
      const expectedResult = 'Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20';

      const result = component.getTestRunId(MOCK_PROGRESS_DATA_COMPLIANT);

      expect(result).toEqual(expectedResult);
    });

    it('#getFormattedDateString should return date as string in the format "d MMM y H:mm"', () => {
      const expectedResult = '22 Jun 2023 9:20';

      const result = component.getFormattedDateString(
        MOCK_PROGRESS_DATA_COMPLIANT.started
      );

      expect(result).toEqual(expectedResult);
    });

    it('#getFormattedDateString should return empty string when no date', () => {
      const expectedResult = '';

      const result = component.getFormattedDateString(null);

      expect(result).toEqual(expectedResult);
    });
  });
});
