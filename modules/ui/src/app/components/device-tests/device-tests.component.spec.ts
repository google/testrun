import {ComponentFixture, TestBed} from '@angular/core/testing';

import {DeviceTestsComponent} from './device-tests.component';
import {TestModule} from '../../model/device';
import {FormArray, FormBuilder} from '@angular/forms';

describe('DeviceTestsComponent', () => {
  let component: DeviceTestsComponent;
  let fixture: ComponentFixture<DeviceTestsComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeviceTestsComponent],
      providers: [
        FormBuilder
      ]
      });
    fixture = TestBed.createComponent(DeviceTestsComponent);
    component = fixture.componentInstance;
    component.testModules = [
      {
        displayName: "Connection",
        name: "connection",
        enabled: true
      },
      {
        displayName: "DNS",
        name: "dns",
        enabled: false
      },
    ] as TestModule[];
    component.deviceForm = new FormBuilder().group({
      test_modules: new FormArray([])
    });
    fixture.detectChanges();
    compiled = fixture.nativeElement;
  });

  describe('component tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should fill tests with default values if device is not present', () => {
      expect(component.test_modules.controls.length).toEqual(2);
      expect(component.test_modules.controls[0].value).toEqual(true);
      expect(component.test_modules.controls[1].value).toEqual(false);
    });

    it('should fill tests with device test values if device not present', () => {
      component.deviceTestModules = {
        "connection": {
          "enabled": false,
        },
        "dns": {
          "enabled": true,
        }
      };
      component.ngOnInit();

      expect(component.test_modules.controls[0].value).toEqual(false);
      expect(component.test_modules.controls[1].value).toEqual(true);
    });
  })

  describe('DOM tests', () => {
    it('should have checkboxes', () => {
      const test = compiled.querySelectorAll('mat-checkbox input')!;
      const testLabel = compiled.querySelectorAll('mat-checkbox label')!;

      expect(test.length).toEqual(2);
      expect((test[0] as HTMLInputElement).checked).toBeTrue();
      expect((test[1] as HTMLInputElement).checked).toBeFalse();
      expect(testLabel[0].innerHTML.trim()).toEqual('Connection');
      expect(testLabel[1].innerHTML.trim()).toEqual('DNS');
    });
  });
});
