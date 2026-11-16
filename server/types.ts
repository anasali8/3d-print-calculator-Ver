export interface Material { id:string;name:string;colors:string[];active:boolean;costPerGram:number;sellingPricePerGram:number; }
export interface PricingSettings { mode:'fixed'|'markup';hourlyRate:number;markupPercent:number; }
export interface Config { materials:Material[];settings:PricingSettings }
