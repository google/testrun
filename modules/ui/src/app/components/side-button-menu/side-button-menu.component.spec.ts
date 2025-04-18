import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { SideButtonMenuComponent } from './side-button-menu.component';
import {
  MatMenuHarness,
  MatMenuItemHarness,
} from '@angular/material/menu/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

describe('SideButtonMenuComponent', () => {
  let component: SideButtonMenuComponent;
  let fixture: ComponentFixture<SideButtonMenuComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SideButtonMenuComponent,
        MatMenuModule,
        MatButtonModule,
        MatIconModule,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SideButtonMenuComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render menu button', () => {
    const button = fixture.debugElement.query(By.css('.side-add-button'));
    expect(button).toBeTruthy();
  });

  describe('menu', () => {
    let menu;
    let items: MatMenuItemHarness[];
    const onClickSpy = jasmine.createSpy('onClick');

    beforeEach(async () => {
      fixture.componentRef.setInput('menuItems', [
        {
          icon: 'home',
          label: 'Home',
          onClick: () => {},
          disabled$: of(true),
        },
        {
          icon: 'settings',
          label: 'Settings',
          description: 'Settings description',
          onClick: onClickSpy,
          disabled$: of(false),
        },
      ]);
      fixture.detectChanges();

      menu = await loader.getHarness(MatMenuHarness);
      await menu.open();
      items = await menu.getItems();
    });

    it('should render menu items', async () => {
      expect(items.length).toBe(2);

      const text0 = await items[0].getText();
      const text1 = await items[1].getText();

      expect(text0).toContain('Home');
      expect(text1).toContain('Settings');
      expect(text1).toContain('Settings description');
    });

    it('should emit the correct action when a menu item is clicked', async () => {
      await items[1].click();

      expect(onClickSpy).toHaveBeenCalled();
    });

    ['Escape', 'Tab'].forEach((key: string) => {
      it(`should focus side button on ${key} press`, async () => {
        const button = document.querySelector(
          '.side-add-button'
        ) as HTMLButtonElement;
        const buttonFocusSpy = spyOn(button, 'focus');
        const firstItemElement = await items[0].host();
        await firstItemElement.dispatchEvent('keydown', { key: key });

        expect(buttonFocusSpy).toHaveBeenCalled();
      });

      it(`should close menu on ${key} press`, async () => {
        const closeMenuSpy = spyOn(component.menuTrigger(), 'closeMenu');
        const firstItemElement = await items[0].host();
        await firstItemElement.dispatchEvent('keydown', { key: key });

        expect(closeMenuSpy).toHaveBeenCalled();
      });
    });

    it('should display the correct icons for actions', async () => {
      const text0 = await items[0].getText();
      const text1 = await items[1].getText();

      expect(text0).toContain('home');
      expect(text1).toContain('settings');
    });

    it('should disable menu item when observable emits true', async () => {
      const disabled = await items[0].isDisabled();
      expect(disabled).toBeTrue();
    });
  });
});
