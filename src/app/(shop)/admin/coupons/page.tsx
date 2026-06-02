import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCoupons, getRedemptions } from "@/actions/coupon";
import { CouponsClient } from "./ui/CouponsClient";

export default async function AdminCouponsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/auth/login");

  const [coupons, redemptions] = await Promise.all([getCoupons(), getRedemptions()]);

  return (
    <div>
      <CouponsClient initialCoupons={coupons} initialRedemptions={redemptions} />
    </div>
  );
}
