import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { InitGuard } from './init.guard';
import { AuthGuard } from './auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 't', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: (): Promise<any> => import('./auth/auth.module').then(m => m.AuthModule),
    canActivate: [InitGuard]
  },
  {
    path: 't',
    loadChildren: (): Promise<any> => import('./tabs/tabs.module').then(m => m.TabsModule),
    canActivate: [InitGuard, AuthGuard]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, paramsInheritanceStrategy: 'always' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
