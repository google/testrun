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
import {
  Component,
  ElementRef,
  HostBinding,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDrawer } from '@angular/material/sidenav';
import { SystemInterfaces, TestRunService } from './services/test-run.service';
import { Observable } from 'rxjs/internal/Observable';
import { Device } from './model/device';
import { take } from 'rxjs';
import { TestrunStatus, StatusOfTestrun } from './model/testrun-status';
import { Router } from '@angular/router';
import { LoaderService } from './services/loader.service';
import { CalloutType } from './model/callout-type';
import { tap } from 'rxjs/internal/operators/tap';
import { shareReplay } from 'rxjs/internal/operators/shareReplay';
import { Routes } from './model/routes';

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
  devices$!: Observable<Device[] | null>;
  systemStatus$!: Observable<TestrunStatus>;
  isTestrunStarted$!: Observable<boolean>;
  hasConnectionSetting$!: Observable<boolean | null>;
  interfaces: SystemInterfaces = {};
  isDevicesLoaded = false;
  isStatusLoaded = false;
  isConnectionSettingsLoaded = false;
  public readonly StatusOfTestrun = StatusOfTestrun;
  public readonly Routes = Routes;
  private devicesLength = 0;
  @ViewChild('settingsDrawer') public settingsDrawer!: MatDrawer;
  @ViewChild('toggleSettingsBtn') public toggleSettingsBtn!: HTMLButtonElement;
  @ViewChild('navigation') public navigation!: ElementRef;
  @HostBinding('class.active-menu') isMenuOpen = false;

  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    private testRunService: TestRunService,
    private readonly loaderService: LoaderService,
    private route: Router
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
          this.isDevicesLoaded = true;
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

    this.hasConnectionSetting$ = this.testRunService.hasConnectionSetting$.pipe(
      tap(result => {
        if (result !== null) {
          this.isConnectionSettingsLoaded = true;
        }
      }),
      shareReplay({ refCount: true, bufferSize: 1 })
    );
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
    });
  }

  async openSetting(): Promise<void> {
    return await this.openGeneralSettings();
  }

  reloadInterfaces(): void {
    this.showLoading();
    this.getSystemInterfaces();
  }

  /**
   * Indicates, if side menu should be focused on keyboard navigation after menu is opened
   */
  focusNavigation = false;

  public toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.focusNavigation = true; // user will be navigated to side menu on tab
    }
  }

  /**
   * When side menu is opened
   */
  skipToNavigation(event: Event) {
    if (this.focusNavigation) {
      event.preventDefault(); // if not prevented, second element will be focused
      this.navigation.nativeElement.firstChild.focus(); // focus first button on side
      this.focusNavigation = false; // user will be navigated according to normal flow on tab
    }
  }

  async openGeneralSettings() {
    this.getSystemInterfaces();
    await this.settingsDrawer.open();
  }

  private getSystemInterfaces(): void {
    this.testRunService
      .getSystemInterfaces()
      .pipe(take(1))
      .subscribe(interfaces => {
        this.interfaces = interfaces;
        this.hideLoading();
      });
  }

  private showLoading() {
    this.loaderService.setLoading(true);
  }

  private hideLoading() {
    this.loaderService.setLoading(false);
  }
}
