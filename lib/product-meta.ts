export type ProductCondition = 'BRAND_NEW' | 'FOREIGN_USED' | 'LOCAL_USED';
export type DeliveryMode = 'SELLER_ARRANGES' | 'BUYER_PICKUP' | 'FLEXIBLE' | 'THIRD_PARTY';
export type DeliveryFulfillment = 'COMPANY_APP' | 'PRODUCT_OWNER';

export const DELIVERY_FULFILLMENT_OPTIONS: {
  value: DeliveryFulfillment;
  title: string;
  subtitle: string;
}[] = [
  {
    value: 'COMPANY_APP',
    title: 'Company (App)',
    subtitle:
      'Delivery is coordinated through PricePulse. Use this when fulfilment goes through the platform.',
  },
  {
    value: 'PRODUCT_OWNER',
    title: 'I am the owner of these products',
    subtitle:
      'You arrange pickup, courier, or handover yourself. Use this when you personally handle delivery or logistics.',
  },
];

export const PRODUCT_CONDITION_OPTIONS: { value: ProductCondition; label: string }[] = [
  { value: 'BRAND_NEW', label: 'Brand new' },
  { value: 'FOREIGN_USED', label: 'Foreign used' },
  { value: 'LOCAL_USED', label: 'Local used' },
];

export const DELIVERY_MODE_OPTIONS: { value: DeliveryMode; label: string }[] = [
  { value: 'SELLER_ARRANGES', label: 'Seller delivers' },
  { value: 'BUYER_PICKUP', label: 'Buyer pickup' },
  { value: 'FLEXIBLE', label: 'Flexible (arrange with seller)' },
  { value: 'THIRD_PARTY', label: 'Courier / third party' },
];

export function formatProductCondition(c?: ProductCondition | string | null): string | null {
  if (!c) return null;
  return PRODUCT_CONDITION_OPTIONS.find((o) => o.value === c)?.label ?? c;
}

export function formatDeliveryMode(m?: DeliveryMode | string | null): string | null {
  if (!m) return null;
  return DELIVERY_MODE_OPTIONS.find((o) => o.value === m)?.label ?? m;
}

export function formatDeliveryFulfillment(f?: DeliveryFulfillment | string | null): string | null {
  if (!f) return null;
  const opt = DELIVERY_FULFILLMENT_OPTIONS.find((o) => o.value === f);
  return opt?.title ?? f;
}
