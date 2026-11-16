import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { LanguageService } from './language.service';
import { Material, PricingSettings } from './models';

@Component({selector:'app-admin',standalone:true,imports:[CommonModule,FormsModule],template:`
<div class="admin-page">
  <section class="admin-heading"><div><span class="eyebrow">{{i18n.t('ADMIN DASHBOARD')}}</span><h1>{{i18n.t('Manage your')}} <em>{{i18n.t('pricing.')}}</em></h1><p>{{i18n.t('Keep your materials and prices up to date.')}}</p></div></section>
  <p *ngIf="loadError" class="error" role="alert">{{i18n.t(loadError)}} <button class="link" (click)="ngOnInit()">{{i18n.t('Retry')}}</button></p>
  <p *ngIf="loading" class="muted" role="status">{{i18n.t('Loading…')}}</p>
  <ng-container *ngIf="!loading && !loadError">
    <section class="panel admin-panel pricing-panel">
      <div class="section-head"><div><h2>{{i18n.t('Pricing settings')}}</h2><p>{{i18n.t('Choose how the total price is calculated.')}}</p></div></div>
      <form (ngSubmit)="saveSettings()">
        <div class="pricing-fields" [class.fixed-fields]="settings.mode==='fixed'">
          <div><label id="pricing-mode-label">{{i18n.t('Pricing mode')}}</label><div class="pricing-toggle" role="group" aria-labelledby="pricing-mode-label"><button type="button" [class.selected]="settings.mode==='fixed'" [attr.aria-pressed]="settings.mode==='fixed'" (click)="settings.mode='fixed'">{{i18n.t('Fixed mode')}}</button><button type="button" [class.selected]="settings.mode==='markup'" [attr.aria-pressed]="settings.mode==='markup'" (click)="settings.mode='markup'">{{i18n.t('Markup mode')}}</button></div></div>
          <label>{{i18n.t('Operation rate / hour (EGP)')}}<input type="number" min="0" max="1000000" step="0.01" required name="hourlyRate" [(ngModel)]="settings.hourlyRate"></label>
          <label *ngIf="settings.mode==='markup'">{{i18n.t('Markup (%)')}}<input type="number" min="0" max="10000" step="0.01" required name="markupPercent" [(ngModel)]="settings.markupPercent"></label>
        </div>
        <div class="admin-panel-footer"><p class="muted">{{i18n.t(settings.mode==='fixed'?'Material selling price + hourly operation rate.':'(Material cost + hourly operation cost) × (1 + markup%).')}}</p><button class="primary compact" [disabled]="savingSettings" type="submit">{{i18n.t('Save settings')}}</button></div>
      </form>
      <p *ngIf="settingMessage" [class.error]="settingError" [class.notice]="!settingError" role="status">{{i18n.t(settingMessage)}}</p>
    </section>
    <section class="panel admin-panel materials-panel">
      <div class="section-head materials-heading"><div><h2>{{i18n.t('Materials')}} <span class="material-count">{{materials.length}}</span></h2><p>{{i18n.t('Each material has one price across its colors.')}}</p></div><button class="primary compact" [disabled]="savingMaterials || materials.length>=100" (click)="openEditor()">{{i18n.t('+ Add material')}}</button></div>
      <p *ngIf="materialMessage" [class.error]="materialError" [class.notice]="!materialError" role="status">{{i18n.t(materialMessage)}}</p>
      <div *ngIf="materials.length; else emptyMaterials" class="material-table-wrap">
        <table class="material-table"><thead><tr><th>{{i18n.t('Material')}}</th><th>{{i18n.t('Cost / gram (EGP)')}}</th><th>{{i18n.t('Selling / gram (EGP)')}}</th><th>{{i18n.t('Colors')}}</th><th>{{i18n.t('Status')}}</th><th>{{i18n.t('Actions')}}</th></tr></thead><tbody>
          <tr *ngFor="let m of materials; trackBy: trackMaterial">
            <td class="material-name" [attr.data-label]="i18n.t('Material')"><strong>{{m.name}}</strong></td>
            <td [attr.data-label]="i18n.t('Cost / gram (EGP)')"><span class="money-value">{{m.costPerGram | number:'1.2-2'}}</span></td>
            <td [attr.data-label]="i18n.t('Selling / gram (EGP)')"><span class="money-value">{{m.sellingPricePerGram | number:'1.2-2'}}</span></td>
            <td [attr.data-label]="i18n.t('Colors')"><div class="color-list"><span *ngFor="let color of m.colors.slice(0,4)" class="color-tag" [title]="i18n.color(color)"><span class="color-dot" *ngIf="colorHex(color) as hex" [style.background]="hex"></span>{{i18n.color(color)}}</span><span *ngIf="m.colors.length>4" class="color-tag" [title]="colorNames(m.colors)">+{{m.colors.length-4}}</span></div></td>
            <td [attr.data-label]="i18n.t('Status')"><span class="status-tag" [class.inactive]="!m.active">{{i18n.t(m.active?'Active':'Inactive')}}</span></td>
            <td class="material-actions" [attr.data-label]="i18n.t('Actions')"><button class="action-button" [disabled]="savingMaterials" (click)="openEditor(m)" [attr.aria-label]="i18n.t('Edit')+' '+m.name">{{i18n.t('Edit')}}</button><button class="action-button delete-action" [disabled]="savingMaterials" (click)="openDelete(m)" [attr.aria-label]="i18n.t('Remove')+' '+m.name">{{i18n.t('Remove')}}</button></td>
          </tr>
        </tbody></table>
      </div>
      <ng-template #emptyMaterials><div class="empty-materials"><strong>{{i18n.t('No materials yet')}}</strong><p class="muted">{{i18n.t('Add a material to make it available in the calculator.')}}</p></div></ng-template>
    </section>
  </ng-container>
  <dialog #editorDialog class="admin-dialog" (cancel)="onEditorCancel($event)" aria-labelledby="editor-title">
    <form (ngSubmit)="saveDraft()" *ngIf="draft as m">
      <div class="dialog-heading"><div><h2 id="editor-title">{{i18n.t(editId?'Edit material':'Add material')}}</h2><p class="muted">{{i18n.t('Update material details and prices.')}}</p></div><button type="button" class="dialog-close" [disabled]="savingMaterials" (click)="closeEditor()" [attr.aria-label]="i18n.t('Close')">×</button></div>
      <label>{{i18n.t('Name')}}<input name="materialName" [(ngModel)]="m.name" required maxlength="80" placeholder="PLA" autofocus></label>
      <div class="two"><label>{{i18n.t('Cost / gram (EGP)')}}<input name="cost" type="number" min="0" max="1000000" step="0.01" required [(ngModel)]="m.costPerGram"></label><label>{{i18n.t('Selling / gram (EGP)')}}<input name="selling" type="number" min="0" max="1000000" step="0.01" required [(ngModel)]="m.sellingPricePerGram"></label></div>
      <label>{{i18n.t('Colors')}}</label><div class="color-list editable-colors"><span *ngFor="let color of m.colors; let idx=index" class="color-tag"><span *ngIf="colorHex(color) as hex" class="color-dot" [style.background]="hex"></span>{{i18n.color(color)}}<button type="button" class="tag-remove" [attr.aria-label]="i18n.t('Remove')+' '+i18n.color(color)" (click)="m.colors.splice(idx,1)">×</button></span></div>
      <div class="color-entry"><input name="newColor" maxlength="60" [(ngModel)]="newColor" [placeholder]="i18n.t('Add a color…')" [attr.aria-label]="i18n.t('Add a color…')" (keydown.enter)="$event.preventDefault(); addColor()"><button type="button" class="outline compact" [disabled]="!newColor.trim() || m.colors.length>=50" (click)="addColor()">{{i18n.t('Add')}}</button></div>
      <label class="check admin-check"><input name="active" type="checkbox" [(ngModel)]="m.active"> {{i18n.t('Available to customers')}}</label>
      <p *ngIf="editorMessage" class="error" role="alert">{{i18n.t(editorMessage)}}</p>
      <div class="dialog-footer"><button type="button" class="outline compact" [disabled]="savingMaterials" (click)="closeEditor()">{{i18n.t('Cancel')}}</button><button type="submit" class="primary compact" [disabled]="savingMaterials">{{i18n.t('Save changes')}}</button></div>
    </form>
  </dialog>
  <dialog #deleteDialog class="admin-dialog delete-dialog" (cancel)="onDeleteCancel($event)" aria-labelledby="delete-title">
    <div class="dialog-heading"><h2 id="delete-title">{{i18n.t('Delete material?')}}</h2></div><p>{{i18n.t('This material will no longer be available in the calculator.')}}</p><p><strong>{{deleteTarget?.name}}</strong></p><p *ngIf="editorMessage" class="error" role="alert">{{i18n.t(editorMessage)}}</p><div class="dialog-footer"><button class="outline compact" [disabled]="savingMaterials" (click)="closeDelete()">{{i18n.t('Cancel')}}</button><button class="danger-solid compact" [disabled]="savingMaterials" (click)="confirmDelete()">{{i18n.t('Remove')}}</button></div>
  </dialog>
</div>`})
export class AdminComponent implements OnInit {
  readonly i18n=inject(LanguageService); private api=inject(ApiService); private cdr=inject(ChangeDetectorRef);
  @ViewChild('editorDialog') editorDialog!:ElementRef<HTMLDialogElement>;
  @ViewChild('deleteDialog') deleteDialog!:ElementRef<HTMLDialogElement>;
  materials:Material[]=[]; settings:PricingSettings={mode:'fixed',hourlyRate:10,markupPercent:30};
  loading=true; loadError=''; materialMessage=''; settingMessage=''; editorMessage=''; materialError=false; settingError=false; savingMaterials=false; savingSettings=false;
  draft:Material|null=null; editId:string|null=null; deleteTarget:Material|null=null; newColor='';
  async ngOnInit(){this.loading=true;this.loadError='';try{const c=await this.api.adminConfig();this.materials=c.materials;this.settings=c.settings}catch{this.loadError='Could not load settings.'}finally{this.loading=false}}
  trackMaterial(_:number,m:Material){return m.id}
  colorNames(colors:string[]){return colors.map(c=>this.i18n.color(c)).join(', ')}
  colorHex(value:string):string|undefined {const colors:Record<string,string>={black:'#222831',white:'#ffffff',red:'#e5484d',blue:'#4476f6',green:'#38a169',yellow:'#edc239',orange:'#ef8a34',pink:'#e88ab2',purple:'#9368d3',gray:'#858b95',grey:'#858b95',silver:'#c4c9d0',gold:'#d7ad46',brown:'#895d45',transparent:'transparent'};const text=value.trim().toLowerCase();const match=Object.keys(colors).find(k=>k===text||this.i18n.color(k)===value.trim());return match?colors[match]:undefined;}
  openEditor(m?:Material){this.editId=m?.id??null;this.draft=m?{...m,colors:[...m.colors]}:{id:crypto.randomUUID(),name:'',colors:['Black'],costPerGram:0,sellingPricePerGram:0,active:true};this.newColor='';this.editorMessage='';this.cdr.detectChanges();this.editorDialog.nativeElement.showModal()}
  closeEditor(){this.editorDialog.nativeElement.close();this.draft=null;this.newColor=''}
  onEditorCancel(e:Event){e.preventDefault();if(!this.savingMaterials)this.closeEditor()}
  addColor(){const value=this.newColor.trim();if(!this.draft||!value||value.length>60||this.draft.colors.length>=50)return;if(!this.draft.colors.some(c=>c.toLowerCase()===value.toLowerCase()))this.draft.colors.push(value);this.newColor=''}
  async saveDraft(){if(!this.draft||this.savingMaterials)return;this.editorMessage='';if(this.newColor.trim())this.addColor();const m={...this.draft,name:this.draft.name.trim(),colors:[...this.draft.colors]};if(!m.name||!m.colors.length){this.editorMessage='Enter a name and at least one color.';return}const next=this.editId?this.materials.map(x=>x.id===this.editId?m:x):[...this.materials,m];if(await this.persistMaterials(next))this.closeEditor()}
  openDelete(m:Material){this.deleteTarget=m;this.editorMessage='';this.cdr.detectChanges();this.deleteDialog.nativeElement.showModal()}
  closeDelete(){this.deleteDialog.nativeElement.close();this.deleteTarget=null}
  onDeleteCancel(e:Event){e.preventDefault();if(!this.savingMaterials)this.closeDelete()}
  async confirmDelete(){if(!this.deleteTarget||this.savingMaterials)return;if(await this.persistMaterials(this.materials.filter(m=>m.id!==this.deleteTarget!.id)))this.closeDelete()}
  private async persistMaterials(next:Material[]){this.savingMaterials=true;this.editorMessage='';this.materialMessage='';try{await this.api.saveMaterials(next);this.materials=next;this.materialError=false;this.materialMessage='Materials saved successfully.';return true}catch(e:any){this.editorMessage=e?.error?.error??'Unable to save materials.';return false}finally{this.savingMaterials=false}}
  async saveSettings(){if(this.savingSettings)return;this.savingSettings=true;this.settingMessage='';try{await this.api.saveSettings(this.settings);this.settingError=false;this.settingMessage='Settings saved successfully.'}catch(e:any){this.settingError=true;this.settingMessage=e?.error?.error??'Unable to save settings.'}finally{this.savingSettings=false}}
}
