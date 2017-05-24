import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';

import { amAppModule } from './app.module';
import { environment } from './environment';

if (environment.production) {
  enableProdMode();
}

//console.clear();
platformBrowserDynamic().bootstrapModule(amAppModule).catch(e => console.error("Bootstrap error", e));