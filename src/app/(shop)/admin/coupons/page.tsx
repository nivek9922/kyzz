import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCoupons } from "@/actions/coupon";
import { CouponsClient } from "./ui/CouponsClient";

export const revalidate = 0;

export default async function AdminCouponsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/auth/login");

  const coupons = await getCoupons();

  return (
    <div>
      <CouponsClient initialCoupons={coupons} />
    </div>
  );
}
