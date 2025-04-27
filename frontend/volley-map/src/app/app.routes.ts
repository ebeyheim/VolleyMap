import { Routes } from '@angular/router';
import { PlayCreationComponent } from './play-creation/play-creation.component';
import { SavedMapsComponent } from './saved-maps/saved-maps.component';

export const routes: Routes = [
  { path: '', redirectTo: '/saved-maps', pathMatch: 'full' },
  { path: 'play-creation', component: PlayCreationComponent },
  { path: 'saved-maps', component: SavedMapsComponent },
];
