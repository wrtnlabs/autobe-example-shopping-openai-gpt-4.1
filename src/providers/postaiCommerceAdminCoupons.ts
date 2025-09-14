import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new coupon entry in ai_commerce_coupons (admin only)
 *
 * Registers a new coupon with business rules, usage limits, validity, and
 * issuer ID in the platform's coupon master table. Only admin users may create
 * coupons. Ensures coupon_code uniqueness and performs soft creation logic,
 * with audit readiness.
 *
 * @param props - Admin: Authenticated admin user (AdminPayload) body: Coupon
 *   creation info (IAiCommerceCoupon.ICreate)
 * @returns The created IAiCommerceCoupon entity with all properties as stored
 * @throws {Error} If coupon_code already exists (uniqueness violation) or
 *   invalid details
 */
export async function postaiCommerceAdminCoupons(props: {
  admin: AdminPayload;
  body: IAiCommerceCoupon.ICreate;
}): Promise<IAiCommerceCoupon> {
  const couponId = v4();
  const timestamp = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.ai_commerce_coupons.create({
      data: {
        id: couponId,
        coupon_code: props.body.coupon_code,
        type: props.body.type,
        valid_from: props.body.valid_from,
        valid_until: props.body.valid_until,
        issued_by: props.body.issued_by ?? null,
        max_uses: props.body.max_uses ?? null,
        conditions: props.body.conditions ?? null,
        status: props.body.status,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      coupon_code: created.coupon_code,
      type: created.type,
      valid_from: toISOStringSafe(created.valid_from),
      valid_until: toISOStringSafe(created.valid_until),
      issued_by: created.issued_by ?? undefined,
      max_uses: created.max_uses ?? undefined,
      conditions: created.conditions ?? undefined,
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      // Only set deleted_at if not null (coupon is active on creation)
      ...(created.deleted_at !== null && {
        deleted_at: toISOStringSafe(created.deleted_at),
      }),
    };
  } catch (error: any) {
    // Unique constraint violation - handle gracefully
    if (
      error?.code === "P2002" &&
      Array.isArray(error?.meta?.target) &&
      error.meta.target.includes("coupon_code")
    ) {
      throw new Error("Coupon code already exists");
    }
    throw error;
  }
}
