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
  effect,
  ElementRef,
  viewChild,
  inject,
} from '@angular/core';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { StatusOfTestrun } from './model/testrun-status';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CalloutType } from './model/callout-type';
import { Routes } from './model/routes';
import { FocusManagerService } from './services/focus-manager.service';
import { State, Store } from '@ngrx/store';
import { AppState } from './store/state';
import { setIsOpenAddDevice } from './store/actions';
import { SettingsComponent } from './pages/settings/settings.component';
import { AppStore } from './app.store';
import { TestRunService } from './services/test-run.service';
import { CdkTrapFocus, LiveAnnouncer } from '@angular/cdk/a11y';
import { filter, take } from 'rxjs/operators';
import { timer } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CertificatesComponent } from './pages/certificates/certificates.component';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TestingCompleteComponent } from './components/testing-complete/testing-complete.component';
import { BypassComponent } from './components/bypass/bypass.component';
import { ShutdownAppComponent } from './components/shutdown-app/shutdown-app.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { VersionComponent } from './components/version/version.component';
import { MatSelectModule } from '@angular/material/select';
import { WifiComponent } from './components/wifi/wifi.component';
import { MatRadioModule } from '@angular/material/radio';
import { CalloutComponent } from './components/callout/callout.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

const DEVICES_RUN_URL = '/assets/icons/device_run.svg';
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
  imports: [
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonToggleModule,
    MatRadioModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSnackBarModule,
    SpinnerComponent,
    BypassComponent,
    VersionComponent,
    CalloutComponent,
    CdkTrapFocus,
    ShutdownAppComponent,
    CertificatesComponent,
    WifiComponent,
    TestingCompleteComponent,
    SettingsComponent,
    RouterModule,
    CommonModule,
  ],
  providers: [AppStore],
})
export class AppComponent implements AfterViewInit {
  private matIconRegistry = inject(MatIconRegistry);
  private domSanitizer = inject(DomSanitizer);
  private route = inject(Router);
  private store = inject<Store<AppState>>(Store);
  private state = inject<State<AppState>>(State);
  private readonly focusManagerService = inject(FocusManagerService);
  private testRunService = inject(TestRunService);
  appStore = inject(AppStore);
  private liveAnnouncer = inject(LiveAnnouncer);

  public readonly CalloutType = CalloutType;
  public readonly StatusOfTestrun = StatusOfTestrun;
  public readonly Routes = Routes;
  private openedSettingFromToggleBtn = true;

  readonly settingsDrawer = viewChild.required<MatDrawer>('settingsDrawer');
  readonly certDrawer = viewChild.required<MatDrawer>('certDrawer');
  readonly toggleSettingsBtn =
    viewChild.required<HTMLButtonElement>('toggleSettingsBtn');
  readonly settings = viewChild.required<SettingsComponent>('settings');
  viewModel$ = this.appStore.viewModel$;

  readonly riskAssessmentLink = viewChild<ElementRef>('riskAssessmentLink');
  private skipCount = 0;

  constructor() {
    this.appStore.getDevices();
    this.appStore.getRiskProfiles();
    this.appStore.getSystemStatus();
    this.appStore.getReports();
    this.appStore.getTestModules();
    this.appStore.getNetworkAdapters();
    this.matIconRegistry.addSvgIcon(
      'device_run',
      this.domSanitizer.bypassSecurityTrustResourceUrl(DEVICES_RUN_URL)
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
    effect(() => {
      if (this.skipCount === 0 && this.riskAssessmentLink()) {
        this.riskAssessmentLink()?.nativeElement.focus();
      } else if (this.skipCount > 0) {
        this.skipCount--;
      }
    });
  }

  ngAfterViewInit() {
    this.viewModel$
      .pipe(
        filter(({ isStatusLoaded }) => isStatusLoaded === true),
        take(1)
      )
      .subscribe(({ systemStatus }) => {
        if (systemStatus === StatusOfTestrun.InProgress) {
          // link should not be focused after page is just loaded
          this.skipCount = 1;
        }
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
    await this.certDrawer().close();
  }

  async closeSetting(hasDevices: boolean): Promise<void> {
    return await this.settingsDrawer()
      .close()
      .then(() => {
        if (hasDevices) {
          this.toggleSettingsBtn().focus();
        } // else device create window will be opened
        if (!this.openedSettingFromToggleBtn) {
          this.focusManagerService.focusFirstElementInContainer();
        }
      });
  }

  async openSetting(isSettingsDisabled: boolean): Promise<void> {
    return await this.openGeneralSettings(false, isSettingsDisabled);
  }

  async openGeneralSettings(
    openSettingFromToggleBtn: boolean,
    isSettingsDisabled: boolean
  ) {
    this.openedSettingFromToggleBtn = openSettingFromToggleBtn;
    this.settings().getSystemInterfaces();
    this.settings().getSystemConfig();
    await this.settingsDrawer().open();
    if (isSettingsDisabled) {
      await this.liveAnnouncer.announce('The settings panel is disabled');
    }
  }

  async openCert() {
    await this.certDrawer().open();
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
