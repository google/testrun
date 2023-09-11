import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {AppComponent} from './app.component';
import {AppModule} from './app.module';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let compiled: HTMLElement;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppModule, HttpClientTestingModule],
      declarations: [AppComponent]
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

  it('should navigate to device repository', fakeAsync(() => {
    const button = compiled.querySelector(
        '.app-sidebar-button-device-repository'
    ) as HTMLButtonElement;
    button?.click();
    tick();

    expect(router.url).toBe(`/device-repository`);
  }));

  it('should call settingsDrawer close on closeSetting', fakeAsync(() => {
    spyOn(component.settingsDrawer, 'close');

    component.closeSetting();
    tick();

    expect(component.settingsDrawer.close).toHaveBeenCalledTimes(1);
  }));

  it('should call settingsDrawer open on openSetting', fakeAsync(() => {
    spyOn(component.settingsDrawer, 'open');

    component.openSetting();
    tick();

    expect(component.settingsDrawer.open).toHaveBeenCalledTimes(1);
  }));

  it('should call settingsDrawer toggle on click settings button', () => {
    const settingsBtn = compiled.querySelector(
      '.app-toolbar-button-general-settings'
    ) as HTMLButtonElement;
    spyOn(component.settingsDrawer, 'toggle');

    settingsBtn.click();

    expect(component.settingsDrawer.toggle).toHaveBeenCalledTimes(1);
  });

});
