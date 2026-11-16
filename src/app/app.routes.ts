import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { CalculatorComponent } from './calculator.component';
import { LoginComponent } from './login.component';
import { AdminComponent } from './admin.component';
const adminGuard = async () => { const api = inject(ApiService); const router = inject(Router); try { const session=await api.session(); return session.authenticated ? true : router.parseUrl('/admin/login'); } catch { return router.parseUrl('/admin/login'); } };
export const routes: Routes = [
 {path:'',component:CalculatorComponent,title:'3D Print Calculator'},
 {path:'admin/login',component:LoginComponent,title:'Admin Login'},
 {path:'admin',component:AdminComponent,canActivate:[adminGuard],title:'Admin Dashboard'},
 {path:'**',redirectTo:''}
];
