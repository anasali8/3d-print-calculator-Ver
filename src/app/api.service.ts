import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Config, Material, PriceResult, PrintItem, PricingSettings } from './models';
@Injectable({providedIn:'root'})
export class ApiService {
 private http = inject(HttpClient);
 catalog() { return firstValueFrom(this.http.get<{materials: Material[]}>('/api/catalog')); }
 calculate(items: PrintItem[], printTimeMinutes: number, quantity: number) { return firstValueFrom(this.http.post<PriceResult>('/api/calculate',{items, printTimeMinutes,quantity})); }
 login(username: string,password: string) { return firstValueFrom(this.http.post('/api/login',{username,password},{withCredentials:true})); }
 logout() { return firstValueFrom(this.http.post('/api/logout',{}, {withCredentials:true})); }
 session() { return firstValueFrom(this.http.get<{authenticated:boolean}>('/api/session')); }
 adminConfig() { return firstValueFrom(this.http.get<Config>('/api/admin/config')); }
 saveMaterials(materials: Material[]) { return firstValueFrom(this.http.put('/api/admin/materials',{materials})); }
 saveSettings(settings: PricingSettings) { return firstValueFrom(this.http.put('/api/admin/settings',{settings})); }
}
