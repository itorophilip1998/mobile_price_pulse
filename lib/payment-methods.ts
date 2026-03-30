import type { PaymentMethod } from '@/lib/api/orders';

export const CHECKOUT_PAYMENT_OPTIONS: {
  value: PaymentMethod;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    value: 'WALLET',
    title: 'Wallet',
    subtitle: 'Pay from your PricePulse wallet balance',
    icon: 'wallet-outline',
  },
  {
    value: 'CRYPTO',
    title: 'Crypto',
    subtitle: 'Pay with cryptocurrency (follow instructions after placing order)',
    icon: 'trending-up-outline',
  },
  {
    value: 'CARD',
    title: 'Card',
    subtitle: 'Debit or credit card',
    icon: 'card-outline',
  },
  {
    value: 'BANK',
    title: 'Bank payment',
    subtitle: 'Bank transfer or USSD — details will be shared after checkout',
    icon: 'business-outline',
  },
  {
    value: 'CASH_ON_DELIVERY',
    title: 'Cash (pay on delivery)',
    subtitle: 'Pay with cash when your order arrives',
    icon: 'cash-outline',
  },
];

export function formatPaymentMethodLabel(method: PaymentMethod | string | undefined | null): string {
  const map: Record<string, string> = {
    WALLET: 'Wallet',
    CRYPTO: 'Crypto',
    CARD: 'Card',
    BANK: 'Bank payment',
    CASH_ON_DELIVERY: 'Cash on delivery',
    OTHER: 'Other',
  };
  if (method == null) return '—';
  return map[method] ?? String(method);
}
