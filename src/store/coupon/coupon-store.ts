import { create } from 'zustand';

export interface AppliedCoupon {
  code:     string;
  type:     'PERCENTAGE' | 'FIXED';
  value:    number;
  discount: number;
}

interface CouponState {
  coupon: AppliedCoupon | null;
  applyCoupon:  (c: AppliedCoupon) => void;
  removeCoupon: () => void;
}

export const useCouponStore = create<CouponState>()((set) => ({
  coupon: null,
  applyCoupon:  (c) => set({ coupon: c }),
  removeCoupon: ()  => set({ coupon: null }),
}));
