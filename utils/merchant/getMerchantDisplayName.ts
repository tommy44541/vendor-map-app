import { UserMerchantSubscription } from "@/services/api/subscriptions";

export const getMerchantDisplayName = (sub?: Partial<UserMerchantSubscription>) => {
  const candidates = [
    sub?.merchant_name,
    sub?.store_name,
    sub?.merchant?.store_name,
    sub?.merchant?.name,
    sub?.merchant?.merchant_name,
    sub?.merchant_profile?.store_name,
    sub?.merchant_profile?.name,
  ];

  return (
    candidates
      .map((value) => String(value ?? "").trim())
      .find((value) => value.length > 0) || ""
  );
};
