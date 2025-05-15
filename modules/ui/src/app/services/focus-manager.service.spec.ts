import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusManagerService } from './focus-manager.service';
import { Component } from '@angular/core';

@Component({
  template:
    '<div id="main"><button class="test-button">Test</button></div>' +
    '<div id="second"><button class="test-button">Test</button></div>',
  standalone: false,
})
class DummyComponent {}

describe('FocusManagerService', () => {
  let service: FocusManagerService;
  let fixture: ComponentFixture<DummyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DummyComponent],
    });
    service = TestBed.inject(FocusManagerService);

    fixture = TestBed.createComponent(DummyComponent);

    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should focus element in document if container is not provided', () => {
    const testButton = fixture.nativeElement.querySelector(
      '#main .test-button'
    ) as HTMLButtonElement;

    service.focusFirstElementInContainer();

    expect(document.activeElement).toBe(testButton);
  });

  it('should focus element in container if container is provided', () => {
    const container = fixture.nativeElement.querySelector(
      '#second'
    ) as HTMLElement;

    const testButton = fixture.nativeElement.querySelector(
      '#second .test-button'
    ) as HTMLButtonElement;

    service.focusFirstElementInContainer(container);

    expect(document.activeElement).toBe(testButton);
  });
});
