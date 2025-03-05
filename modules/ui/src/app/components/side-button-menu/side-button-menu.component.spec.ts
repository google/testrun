import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideButtonMenuComponent } from './side-button-menu.component';

describe('SideButtonMenuComponent', () => {
  let component: SideButtonMenuComponent;
  let fixture: ComponentFixture<SideButtonMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideButtonMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SideButtonMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
