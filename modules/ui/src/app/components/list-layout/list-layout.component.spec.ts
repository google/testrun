import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListLayoutComponent } from './list-layout.component';

describe('ListLayoutComponent', () => {
  let component: ListLayoutComponent<string>;
  let fixture: ComponentFixture<ListLayoutComponent<string>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListLayoutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListLayoutComponent<string>);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
