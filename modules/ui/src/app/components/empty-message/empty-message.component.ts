import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-message',
  imports: [CommonModule],
  templateUrl: './empty-message.component.html',
  styleUrl: './empty-message.component.scss',
})
export class EmptyMessageComponent {
  image = input<string>();
  header = input<string>();
  message = input<string>();
  isHorizontal = input<boolean>(false);
}
