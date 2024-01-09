import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StateService } from './state.service';
import { Component } from '@angular/core';

@Component({
  template: '<div id="main"><button id="test-button">Test</button></div>',
})
class DummyComponent {}

describe('StateService', () => {
  let service: StateService;
  let fixture: ComponentFixture<DummyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DummyComponent],
    });
    service = TestBed.inject(StateService);

    fixture = TestBed.createComponent(DummyComponent);

    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should focus element', () => {
    const testButton = fixture.nativeElement.querySelector(
      '#test-button'
    ) as HTMLButtonElement;

    service.focusFirstElementInMain();

    expect(document.activeElement).toBe(testButton);
  });
});
