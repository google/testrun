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
  AfterViewInit,
  Component,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDrawer } from '@angular/material/sidenav';
import { StatusOfTestrun } from './model/testrun-status';
import { NavigationEnd, Router } from '@angular/router';
import { CalloutType } from './model/callout-type';
import { Routes } from './model/routes';
import { FocusManagerService } from './services/focus-manager.service';
import { State, Store } from '@ngrx/store';
import { AppState } from './store/state';
import {
  setIsOpenAddDevice,
  toggleMenu,
  updateFocusNavigation,
} from './store/actions';
import { appFeatureKey } from './store/reducers';
import { SettingsComponent } from './pages/settings/settings.component';
import { AppStore } from './app.store';
import { TestRunService } from './services/test-run.service';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { filter, take } from 'rxjs/operators';
import { skip, timer } from 'rxjs';

const DEVICES_LOGO_URL = '/assets/icons/devices.svg';
const DEVICES_RUN_URL = '/assets/icons/device_run.svg';
const REPORTS_LOGO_URL = '/assets/icons/reports.svg';
const RISK_ASSESSMENT_LOGO_URL = '/assets/icons/risk-assessment.svg';
const TESTRUN_LOGO_URL = '/assets/icons/testrun_logo_small.svg';
const TESTRUN_LOGO_COLOR_URL = '/assets/icons/testrun_logo_color.svg';
const CLOSE_URL = '/assets/icons/close.svg';
const DRAFT_URL = '/assets/icons/draft.svg';
const PILOT_URL = '/assets/icons/pilot.svg';
const QUALIFICATION_URL = '/assets/icons/qualification.svg';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [AppStore],
})
export class AppComponent implements AfterViewInit {
  public readonly CalloutType = CalloutType;
  public readonly StatusOfTestrun = StatusOfTestrun;
  public readonly Routes = Routes;
  private openedSettingFromToggleBtn = true;

  @ViewChild('settingsDrawer') public settingsDrawer!: MatDrawer;
  @ViewChild('certDrawer') public certDrawer!: MatDrawer;
  @ViewChild('toggleSettingsBtn') public toggleSettingsBtn!: HTMLButtonElement;
  @ViewChild('toggleCertificatesBtn')
  public toggleCertificatesBtn!: HTMLButtonElement;
  @ViewChild('navigation') public navigation!: ElementRef;
  @ViewChild('settings') public settings!: SettingsComponent;
  @ViewChildren('riskAssessmentLink')
  riskAssessmentLink!: QueryList<ElementRef>;
  viewModel$ = this.appStore.viewModel$;

  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    private route: Router,
    private store: Store<AppState>,
    private state: State<AppState>,
    private readonly focusManagerService: FocusManagerService,
    private testRunService: TestRunService,
    public appStore: AppStore,
    private liveAnnouncer: LiveAnnouncer
  ) {
    this.appStore.getDevices();
    this.appStore.getRiskProfiles();
    this.appStore.getSystemStatus();
    this.appStore.getReports();
    this.appStore.getTestModules();
    this.appStore.getNetworkAdapters();
    this.matIconRegistry.addSvgIcon(
      'devices',
      this.domSanitizer.bypassSecurityTrustResourceUrl(DEVICES_LOGO_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'device_run',
      this.domSanitizer.bypassSecurityTrustResourceUrl(DEVICES_RUN_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'reports',
      this.domSanitizer.bypassSecurityTrustResourceUrl(REPORTS_LOGO_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'risk_assessment',
      this.domSanitizer.bypassSecurityTrustResourceUrl(RISK_ASSESSMENT_LOGO_URL)
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
    this.matIconRegistry.addSvgIcon(
      'draft',
      this.domSanitizer.bypassSecurityTrustResourceUrl(DRAFT_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'pilot',
      this.domSanitizer.bypassSecurityTrustResourceUrl(PILOT_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'qualification',
      this.domSanitizer.bypassSecurityTrustResourceUrl(QUALIFICATION_URL)
    );
  }

  ngAfterViewInit() {
    this.viewModel$
      .pipe(
        filter(({ isStatusLoaded }) => isStatusLoaded === true),
        take(1)
      )
      .subscribe(({ systemStatus }) => {
        let skipCount = 0;
        if (systemStatus === StatusOfTestrun.InProgress) {
          // link should not be focused after page is just loaded
          skipCount = 1;
        }
        this.riskAssessmentLink.changes.pipe(skip(skipCount)).subscribe(() => {
          if (this.riskAssessmentLink.length > 0) {
            this.riskAssessmentLink.first.nativeElement.focus();
          }
        });
      });
  }

  get isRiskAssessmentRoute(): boolean {
    return this.route.url === Routes.RiskAssessment;
  }

  get isDevicesRoute(): boolean {
    return this.route.url === Routes.Devices;
  }

  navigateToDeviceRepository(): void {
    this.route.navigate([Routes.Devices]);
  }
  navigateToAddDevice(): void {
    this.route.navigate([Routes.Devices]);
    this.store.dispatch(setIsOpenAddDevice({ isOpenAddDevice: true }));
  }

  navigateToRuntime(): void {
    this.route.navigate([Routes.Testing]);
    this.appStore.setIsOpenStartTestrun();
  }

  navigateToRiskAssessment(): void {
    this.route.navigate([Routes.RiskAssessment]).then(() => {
      this.appStore.setFocusOnPage();
    });
  }

  async closeCertificates(): Promise<void> {
    await this.certDrawer.close();
  }

  async closeSetting(hasDevices: boolean): Promise<void> {
    return await this.settingsDrawer.close().then(() => {
      if (hasDevices) {
        this.toggleSettingsBtn.focus();
      } // else device create window will be opened
      if (!this.openedSettingFromToggleBtn) {
        this.focusManagerService.focusFirstElementInContainer();
      }
    });
  }

  async openSetting(isSettingsDisabled: boolean): Promise<void> {
    return await this.openGeneralSettings(false, isSettingsDisabled);
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

  async openGeneralSettings(
    openSettingFromToggleBtn: boolean,
    isSettingsDisabled: boolean
  ) {
    this.openedSettingFromToggleBtn = openSettingFromToggleBtn;
    this.settings.getSystemInterfaces();
    this.settings.getSystemConfig();
    await this.settingsDrawer.open();
    if (isSettingsDisabled) {
      await this.liveAnnouncer.announce('The settings panel is disabled');
    }
  }

  async openCert() {
    await this.certDrawer.open();
  }

  consentShown() {
    this.appStore.setContent();
  }

  isTestrunInProgress(status?: string | null) {
    return this.testRunService.testrunInProgress(status);
  }

  onNavigationClick() {
    this.route.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        take(1)
      )
      .subscribe(() => {
        this.appStore.setFocusOnPage();
      });
  }

  calloutClosed(id: string | null) {
    if (id) {
      this.appStore.setCloseCallout(id);
      timer(100).subscribe(() => {
        this.focusManagerService.focusFirstElementInContainer();
      });
    }
  }
}
