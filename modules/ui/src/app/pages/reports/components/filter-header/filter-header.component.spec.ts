import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterHeaderComponent } from './filter-header.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
@Component({
  selector: 'app-dummy-table',
  template: `
    <table mat-table matSort [dataSource]="data">
      <ng-container matColumnDef="testColumn">
        <app-filter-header
          *matHeaderCellDef
          [filterName]="'testFilter'"
          [filterTitle]="'testTitle'"
          [filterOpened]="false"
          [filtered]="false"
          [activeFilter]="'testFilter'"
          [headerText]="'Test Header'"
          [hasSorting]="true"
          [sortActionDescription]="'Sort by test'">
        </app-filter-header>
        <td mat-cell *matCellDef="let element">{{ element }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
    </table>
  `,
  standalone: false,
})
export class DummyTableComponent {
  data = ['Row 1', 'Row 2', 'Row 3'];
  displayedColumns = ['testColumn'];
}

describe('FilterHeaderComponent within mat-table', () => {
  let fixture: ComponentFixture<DummyTableComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DummyTableComponent],
      imports: [
        BrowserAnimationsModule,
        FilterHeaderComponent,
        MatIconModule,
        MatSortModule,
        MatButtonModule,
        MatTableModule,
        CommonModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DummyTableComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should have the filter header component', () => {
    const filterHeader = compiled.querySelector(
      'app-filter-header'
    ) as HTMLElement;
    expect(filterHeader).toBeTruthy();
    const headerText = filterHeader?.querySelector(
      'th span'
    ) as HTMLSpanElement;
    expect(headerText?.textContent?.trim()).toBe('Test Header');
  });

  it('should emit an event when filter button is clicked in filter header', () => {
    const filterHeader = fixture.debugElement.query(
      By.css('app-filter-header')
    );
    const filterHeaderComponent =
      filterHeader.componentInstance as FilterHeaderComponent;

    spyOn(filterHeaderComponent.emitOpenFilter, 'emit');

    const button = filterHeader.query(By.css('.filter-button'))
      .nativeElement as HTMLButtonElement;
    button.click();

    expect(filterHeaderComponent.emitOpenFilter.emit).toHaveBeenCalledWith({
      event: new PointerEvent('event'),
      filter: 'testFilter',
      title: 'testTitle',
      filterOpened: false,
    });
  });
});
