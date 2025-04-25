import { Component, input, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { AddMenuItem } from '../../app.component';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-side-button-menu',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    CommonModule,
    MatTooltip,
  ],
  templateUrl: './side-button-menu.component.html',
  styleUrl: './side-button-menu.component.scss',
})
export class SideButtonMenuComponent {
  readonly menuTrigger = viewChild.required<MatMenuTrigger>('menuTrigger');
  menuItems = input<AddMenuItem[]>([]);

  focusButton(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const button = document.querySelector(
      '.side-add-button'
    ) as HTMLButtonElement;
    if (button) {
      button.focus();
    }
    this.menuTrigger().closeMenu();
  }
}
