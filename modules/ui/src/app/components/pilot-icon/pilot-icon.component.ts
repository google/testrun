import { Component } from '@angular/core';

@Component({
  selector: 'app-pilot-icon',
  standalone: true,
  imports: [],
  template: '<span role="img" aria-label="">🚀</span>',
  styles: ':host { display: inline; padding-right: 4px;}',
})
export class PilotIconComponent {}
