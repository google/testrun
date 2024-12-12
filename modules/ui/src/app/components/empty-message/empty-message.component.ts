import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-message',
  imports: [],
  templateUrl: './empty-message.component.html',
  styleUrl: './empty-message.component.scss',
})
export class EmptyMessageComponent {
  image = input<string>();
  header = input<string>();
  message = input<string>();
}
