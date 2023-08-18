import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ProgressTableComponent} from './progress-table.component';
import {IResult, StatusOfTestResult} from '../../model/testrun-status';
import {MatTableModule} from '@angular/material/table';
import {of} from 'rxjs';
import {TEST_DATA} from '../../mocks/progress.mock';

describe('ProgressTableComponent', () => {
  let component: ProgressTableComponent;
  let fixture: ComponentFixture<ProgressTableComponent>;

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [ProgressTableComponent]
      });
      fixture = TestBed.createComponent(ProgressTableComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('#getResultClass', () => {
      it('should have class "green" if test result is "Compliant" or "Smart Ready"', () => {
        const expectedResult = {
          green: true, read: false, grey: false
        };

        const result1 = component.getResultClass(StatusOfTestResult.Compliant);
        const result2 = component.getResultClass(StatusOfTestResult.SmartReady);

        expect(result1).toEqual(expectedResult);
        expect(result2).toEqual(expectedResult);
      });

      it('should have class "read" if test result is "Non Compliant"', () => {
        const expectedResult = {
          green: false, read: true, grey: false
        };

        const result = component.getResultClass(StatusOfTestResult.NonCompliant);

        expect(result).toEqual(expectedResult);
      });

      it('should have class "grey" if test result is "Skipped" or "Not Started"', () => {
        const expectedResult = {
          green: false, read: false, grey: true
        };

        const result1 = component.getResultClass(StatusOfTestResult.Skipped);
        const result2 = component.getResultClass(StatusOfTestResult.NotStarted);

        expect(result1).toEqual(expectedResult);
        expect(result2).toEqual(expectedResult);
      });
    });
  });

  describe('DOM tests', () => {
    let compiled: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [ProgressTableComponent],
        imports: [MatTableModule]
      }).compileComponents();

      fixture = TestBed.createComponent(ProgressTableComponent);
      component = fixture.componentInstance;
      compiled = fixture.nativeElement as HTMLElement;
    });

    describe('with not dataSource$ data', () => {
      beforeEach(() => {
        component.dataSource$ = of(undefined);
        fixture.detectChanges();
      });

      it('should be unavailable', () => {
        const table = compiled.querySelector('.progress-table');

        expect(table).toBeNull();
      });
    });

    describe('with dataSource$ data', () => {
      beforeEach(() => {
        component.dataSource$ = of(TEST_DATA.results);
        fixture.detectChanges();
      });

      it('should be available', () => {
        const table = compiled.querySelector('.progress-table');

        expect(table).not.toBeNull();
      });

      it('should have table rows as provided from data', () => {
        const expectedRowsLength = (TEST_DATA.results as IResult[]).length;
        const tableRows = compiled.querySelectorAll('.table-row');

        expect(tableRows.length).toBe(expectedRowsLength);
      });
    });
  });
});
