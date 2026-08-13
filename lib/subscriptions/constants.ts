export const REVENUECAT_ENTITLEMENT_PRO = "pro";

/** Monthly / annual Pro product identifiers in App Store Connect / RevenueCat. */
export const PRO_MONTHLY_PRODUCT_ID = "graider_pro_monthly";
export const PRO_ANNUAL_PRODUCT_ID = "graider_pro_annual";

/** Display fallbacks when store price strings are not loaded yet. */
export const PRO_MONTHLY_PRICE_LABEL = "$24.99/mo";
export const PRO_ANNUAL_PRICE_LABEL = "$239.99/yr";
export const PRO_ANNUAL_SAVINGS_LABEL = "Save ~20%";

export type SubscriptionPlanId = "monthly" | "annual";

export const FREE_TIER_MONTHLY_GRADE_LIMIT = 20;
export const FREE_TIER_CLASS_LIMIT = 1;

export type PaywallReason = "grade_limit" | "class_limit" | "soft_upsell" | "auto_grade";

/** Set to true when Smart grade should require Pro. */
export const AUTO_GRADE_REQUIRES_PRO = false;
