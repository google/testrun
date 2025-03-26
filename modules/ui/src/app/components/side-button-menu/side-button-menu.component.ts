import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
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
  menuItems = input<AddMenuItem[]>([]);
}
