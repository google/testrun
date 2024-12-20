import { Component, input } from '@angular/core';
import { EmptyMessageComponent } from '../empty-message/empty-message.component';

@Component({
  selector: 'app-empty-page',
  imports: [EmptyMessageComponent],
  templateUrl: './empty-page.component.html',
})
export class EmptyPageComponent {
  image = input<string>();
  header = input<string>();
  message = input<string>();
}
