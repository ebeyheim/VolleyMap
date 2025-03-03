import { bootstrapApplication } from '@angular/platform-browser';
import { PlayCreationComponent } from './app/play-creation/play-creation.component';

bootstrapApplication(PlayCreationComponent)
  .catch(err => console.error(err));