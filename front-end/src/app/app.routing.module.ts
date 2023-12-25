import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { initGuard } from './init.guard';
import { authGuard } from './auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 't', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: (): Promise<any> => import('./auth/auth.module').then(m => m.AuthModule),
    canActivate: [initGuard]
  },
  {
    path: 't',
    loadChildren: (): Promise<any> => import('./tabs/tabs.module').then(m => m.TabsModule),
    canActivate: [initGuard, authGuard]
  },
  {
    path: 'vote',
    loadChildren: (): Promise<any> => import('./tabs/voting/vote/vote.module').then(m => m.VoteModule),
    canActivate: [initGuard]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
      paramsInheritanceStrategy: 'always',
      bindToComponentInputs: true
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
