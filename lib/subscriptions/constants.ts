export const REVENUECAT_ENTITLEMENT_PRO = "pro";

/** Monthly Pro subscription product identifier in App Store Connect / RevenueCat. */
export const PRO_MONTHLY_PRODUCT_ID = "graider_pro_monthly";

export const FREE_TIER_MONTHLY_GRADE_LIMIT = 20;
export const FREE_TIER_CLASS_LIMIT = 1;

export type PaywallReason = "grade_limit" | "class_limit" | "soft_upsell" | "auto_grade";

/** Set to true when Smart grade should require Pro. */
export const AUTO_GRADE_REQUIRES_PRO = false;
