export interface Material { id: string; name: string; colors: string[]; active: boolean; costPerGram?: number; sellingPricePerGram?: number; }
export interface PricingSettings { mode: 'fixed' | 'markup'; hourlyRate: number; markupPercent: number; }
export interface Config { materials: Material[]; settings: PricingSettings; }
export interface PrintItem { materialId: string; color: string; weightGrams: number | null; }
export interface PriceResult { currency: string; quantity: number; materialsTotal: number; operationTotal: number; unitTotal: number; total: number; lines: { material: string; color: string; weightGrams: number; total: number }[]; }
