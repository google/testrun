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
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { TestRunService } from './services/test-run.service';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Device } from './model/device';
import { device } from './mocks/device.mock';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { of } from 'rxjs/internal/observable/of';
import SpyObj = jasmine.SpyObj;
import { BypassComponent } from './components/bypass/bypass.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let compiled: HTMLElement;
  let router: Router;
  let mockService: SpyObj<TestRunService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj([
      'getDevices',
      'fetchDevices',
      'getSystemStatus',
      'fetchHistory',
      'getSystemInterfaces',
    ]);
    mockService.getDevices.and.returnValue(
      new BehaviorSubject<Device[] | null>([device])
    );
    mockService.getSystemInterfaces.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        AppRoutingModule,
        MatButtonModule,
        BrowserAnimationsModule,
        MatIconModule,
        MatToolbarModule,
        MatSidenavModule,
        SpinnerComponent,
        BypassComponent,
      ],
      providers: [{ provide: TestRunService, useValue: mockService }],
      declarations: [AppComponent, FakeGeneralSettingsComponent],
    });

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    router = TestBed.get(Router);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render side bar', () => {
    const sideBar = compiled.querySelector('.app-sidebar');

    expect(sideBar).toBeDefined();
  });

  it('should render menu button', () => {
    const button = compiled.querySelector('.app-sidebar-button-menu');

    expect(button).toBeDefined();
  });

  it('should render runtime button', () => {
    const button = compiled.querySelector('.app-sidebar-button-runtime');

    expect(button).toBeDefined();
  });

  it('should render device repository button', () => {
    const button = compiled.querySelector(
      '.app-sidebar-button-device-repository'
    );

    expect(button).toBeDefined();
  });

  it('should render results button', () => {
    const button = compiled.querySelector('.app-sidebar-button-results');

    expect(button).toBeDefined();
  });

  it('should render toolbar', () => {
    const toolBar = compiled.querySelector('.app-toolbar');

    expect(toolBar).toBeDefined();
  });

  it('should render logo link', () => {
    const logoLink = compiled.querySelector('.logo-link');

    expect(logoLink).toBeDefined();
  });

  it('should render general settings button', () => {
    const generalSettingsButton = compiled.querySelector(
      '.app-toolbar-button-general-settings'
    );

    expect(generalSettingsButton).toBeDefined();
  });

  it('should navigate to the device repository when "device repository" button is clicked', fakeAsync(() => {
    const button = compiled.querySelector(
      '.app-sidebar-button-device-repository'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(`/device-repository`);
  }));

  it('should navigate to the runtime when "runtime" button is clicked', fakeAsync(() => {
    const button = compiled.querySelector(
      '.app-sidebar-button-runtime'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(`/runtime`);
  }));

  it('should navigate to the results when "results" button is clicked', fakeAsync(() => {
    const button = compiled.querySelector(
      '.app-sidebar-button-results'
    ) as HTMLButtonElement;

    button?.click();
    tick();

    expect(router.url).toBe(`/results`);
  }));

  it('should call toggleSettingsBtn focus when settingsDrawer close on closeSetting', fakeAsync(() => {
    spyOn(component.settingsDrawer, 'close').and.returnValue(
      Promise.resolve('close')
    );
    spyOn(component.toggleSettingsBtn, 'focus');

    component.closeSetting();
    tick();

    component.settingsDrawer.close().then(() => {
      expect(component.toggleSettingsBtn.focus).toHaveBeenCalled();
    });
  }));

  it('should call settingsDrawer open on openSetting', fakeAsync(() => {
    spyOn(component.settingsDrawer, 'open');

    component.openSetting();
    tick();

    expect(component.settingsDrawer.open).toHaveBeenCalledTimes(1);
  }));

  it('should call settingsDrawer open on click settings button', () => {
    const settingsBtn = compiled.querySelector(
      '.app-toolbar-button-general-settings'
    ) as HTMLButtonElement;
    spyOn(component.settingsDrawer, 'open');

    settingsBtn.click();

    expect(component.settingsDrawer.open).toHaveBeenCalledTimes(1);
  });

  describe('menu button', () => {
    it('should toggle menu open state on click', () => {
      const menuBtn = compiled.querySelector(
        '.app-toolbar-button-menu'
      ) as HTMLButtonElement;

      menuBtn.click();

      expect(component.isMenuOpen).toBeTrue();

      menuBtn.click();

      expect(component.isMenuOpen).toBeFalse();
    });

    it('should set flag focusNavigation if menu opens on click', () => {
      component.isMenuOpen = false;
      const menuBtn = compiled.querySelector(
        '.app-toolbar-button-menu'
      ) as HTMLButtonElement;

      menuBtn.click();

      expect(component.focusNavigation).toBeTrue();
    });

    it('should focus navigation on tab press if menu button was clicked', () => {
      const menuBtn = compiled.querySelector(
        '.app-toolbar-button-menu'
      ) as HTMLButtonElement;

      menuBtn.click();
      menuBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      const navigationButton = compiled.querySelectorAll('.app-sidebar-button');

      expect(component.focusNavigation).toBeFalse();
      expect(document.activeElement).toBe(navigationButton[0]);
    });

    it('should not focus navigation button on tab press if menu button was not clicked', () => {
      component.focusNavigation = false;
      const menuBtn = compiled.querySelector(
        '.app-toolbar-button-menu'
      ) as HTMLButtonElement;

      menuBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

      expect(component.focusNavigation).toBeFalse();
      expect(document.activeElement).toBe(document.body);
    });
  });

  it('should have spinner', () => {
    const spinner = compiled.querySelector('app-spinner');

    expect(spinner).toBeTruthy();
  });

  it('should have bypass', () => {
    const bypass = compiled.querySelector('app-bypass');

    expect(bypass).toBeTruthy();
  });

  describe('feedback button', () => {
    it('should be present', () => {
      const button = compiled.querySelector('.feedback-button');

      expect(button).toBeTruthy();
    });
  });

  describe('with no devices setted', () => {
    beforeEach(() => {
      mockService.getDevices.and.returnValue(
        new BehaviorSubject<Device[] | null>(null)
      );
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should have "results" and "runtime" buttons disabled', fakeAsync(() => {
      const resultBtn = compiled.querySelector(
        '.app-sidebar-button-results'
      ) as HTMLButtonElement;
      const runtimeBtn = compiled.querySelector(
        '.app-sidebar-button-runtime'
      ) as HTMLButtonElement;

      expect(resultBtn.disabled).toBe(true);
      expect(runtimeBtn.disabled).toBe(true);
    }));

    it('should not have "device repository" button disabled', fakeAsync(() => {
      const deviceRepositorytBtn = compiled.querySelector(
        '.app-sidebar-button-device-repository'
      ) as HTMLButtonElement;

      expect(deviceRepositorytBtn.disabled).toBe(false);
    }));
  });
});

@Component({
  selector: 'app-general-settings',
  template: '<div></div>',
})
class FakeGeneralSettingsComponent {
  @Input() interfaces = [];
  @Output() closeSettingEvent = new EventEmitter<void>();
  @Output() openSettingEvent = new EventEmitter<void>();
}
