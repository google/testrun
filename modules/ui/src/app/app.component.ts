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
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDrawer } from '@angular/material/sidenav';
import { SystemInterfaces, TestRunService } from './services/test-run.service';
import { Observable } from 'rxjs';
import { Device } from './model/device';
import { TestrunStatus, StatusOfTestrun } from './model/testrun-status';
import { Router } from '@angular/router';
import { LoaderService } from './services/loader.service';
import { CalloutType } from './model/callout-type';
import { tap, shareReplay } from 'rxjs/operators';
import { Routes } from './model/routes';
import { FocusManagerService } from './services/focus-manager.service';
import { State, Store } from '@ngrx/store';
import { AppState } from './store/state';
import {
  selectError,
  selectHasConnectionSettings,
  selectInterfaces,
  selectMenuOpened,
} from './store/selectors';
import {
  fetchInterfaces,
  fetchSystemConfig,
  toggleMenu,
  updateFocusNavigation,
} from './store/actions';
import { appFeatureKey } from './store/reducers';

const DEVICES_LOGO_URL = '/assets/icons/devices.svg';
const REPORTS_LOGO_URL = '/assets/icons/reports.svg';
const TESTRUN_LOGO_URL = '/assets/icons/testrun_logo_small.svg';
const TESTRUN_LOGO_COLOR_URL = '/assets/icons/testrun_logo_color.svg';
const CLOSE_URL = '/assets/icons/close.svg';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public readonly CalloutType = CalloutType;
  public readonly StatusOfTestrun = StatusOfTestrun;
  public readonly Routes = Routes;

  devices$!: Observable<Device[] | null>;
  systemStatus$!: Observable<TestrunStatus>;
  isTestrunStarted$!: Observable<boolean>;
  hasConnectionSetting$: Observable<boolean | null> = this.store.select(
    selectHasConnectionSettings
  );
  isStatusLoaded = false;
  isConnectionSettingsLoaded = false;
  private devicesLength = 0;
  private openedSettingFromToggleBtn = true;
  isMenuOpen: Observable<boolean> = this.store.select(selectMenuOpened);
  interfaces: Observable<SystemInterfaces> =
    this.store.select(selectInterfaces);
  error$: Observable<boolean> = this.store.select(selectError);

  @ViewChild('settingsDrawer') public settingsDrawer!: MatDrawer;
  @ViewChild('toggleSettingsBtn') public toggleSettingsBtn!: HTMLButtonElement;
  @ViewChild('navigation') public navigation!: ElementRef;

  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    private testRunService: TestRunService,
    private readonly loaderService: LoaderService,
    private route: Router,
    private store: Store<AppState>,
    private state: State<AppState>,
    private readonly focusManagerService: FocusManagerService
  ) {
    this.testRunService.fetchDevices();
    this.testRunService.getSystemStatus();
    this.matIconRegistry.addSvgIcon(
      'devices',
      this.domSanitizer.bypassSecurityTrustResourceUrl(DEVICES_LOGO_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'reports',
      this.domSanitizer.bypassSecurityTrustResourceUrl(REPORTS_LOGO_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'testrun_logo_small',
      this.domSanitizer.bypassSecurityTrustResourceUrl(TESTRUN_LOGO_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'testrun_logo_color',
      this.domSanitizer.bypassSecurityTrustResourceUrl(TESTRUN_LOGO_COLOR_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'close',
      this.domSanitizer.bypassSecurityTrustResourceUrl(CLOSE_URL)
    );
  }

  ngOnInit(): void {
    this.devices$ = this.testRunService.getDevices().pipe(
      tap(result => {
        if (result !== null) {
          this.devicesLength = result.length;
        } else {
          this.devicesLength = 0;
        }
      }),
      shareReplay({ refCount: true, bufferSize: 1 })
    );

    this.systemStatus$ = this.testRunService.systemStatus$.pipe(
      tap(() => (this.isStatusLoaded = true))
    );

    this.isTestrunStarted$ = this.testRunService.isTestrunStarted$;

    this.hasConnectionSetting$.pipe(
      tap(result => {
        if (result !== null) {
          this.isConnectionSettingsLoaded = true;
        }
      }),
      shareReplay({ refCount: true, bufferSize: 1 })
    );

    this.getSystemInterfaces();

    this.store.dispatch(fetchSystemConfig());
    //this.store.dispatch(fetchSystemConfigAndInterfaces());
  }

  navigateToDeviceRepository(): void {
    this.route.navigate([Routes.Devices]);
    this.testRunService.setIsOpenAddDevice(true);
  }

  navigateToRuntime(): void {
    this.route.navigate([Routes.Testrun]);
    this.testRunService.setIsOpenStartTestrun(true);
  }

  async closeSetting(): Promise<void> {
    return await this.settingsDrawer.close().then(() => {
      if (this.devicesLength > 0) {
        this.toggleSettingsBtn.focus();
      } // else device create window will be opened
      if (!this.openedSettingFromToggleBtn) {
        this.focusManagerService.focusFirstElementInContainer();
      }
    });
  }

  async openSetting(): Promise<void> {
    return await this.openGeneralSettings(false);
  }

  reloadInterfaces(): void {
    this.showLoading();
    this.getSystemInterfaces();
  }

  public toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.store.dispatch(toggleMenu());
  }

  /**
   * When side menu is opened
   */
  skipToNavigation(event: Event) {
    if (this.state.getValue()[appFeatureKey].appComponent.focusNavigation) {
      event.preventDefault(); // if not prevented, second element will be focused
      this.focusManagerService.focusFirstElementInContainer(
        this.navigation.nativeElement
      );
      this.store.dispatch(updateFocusNavigation({ focusNavigation: false })); // user will be navigated according to normal flow on tab
    }
  }

  async openGeneralSettings(openSettingFromToggleBtn: boolean) {
    this.openedSettingFromToggleBtn = openSettingFromToggleBtn;
    await this.settingsDrawer.open();
  }

  private getSystemInterfaces(): void {
    this.store.dispatch(fetchInterfaces());
    this.hideLoading();
  }

  private showLoading() {
    this.loaderService.setLoading(true);
  }

  private hideLoading() {
    this.loaderService.setLoading(false);
  }
}
