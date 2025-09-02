import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Issue a coupon to a user or event for a specific coupon, creating an
 * audit-traceable issuance record.
 *
 * This operation issues a new coupon to a customer for a given coupon policy,
 * creating an immutable issuance record for regulatory, audit, and tracking.
 * Supports individualized or campaign coupon distribution per business rules,
 * enforcing unique issuance per coupon, customer, and external code.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin issuing the coupon
 * @param props.couponId - Target coupon's unique identifier (UUID)
 * @param props.body - Issuance details (customer id, external code, expires_at)
 * @returns Details of the created coupon issuance
 * @throws {Error} When coupon not found, or unique constraint violated (already
 *   issued)
 */
export async function post__shoppingMallAiBackend_admin_coupons_$couponId_issuances(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponIssuance.ICreate;
}): Promise<IShoppingMallAiBackendCouponIssuance> {
  const { couponId, body } = props;

  // Ensure coupon exists before issuance
  const coupon =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupons.findUnique({
      where: { id: couponId },
    });
  if (!coupon) throw new Error("Coupon not found");

  // Try to create the issuance, enforcing uniqueness on (coupon, customer, external_code)
  let created;
  try {
    created =
      await MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_ai_backend_coupon_id: couponId,
          shopping_mall_ai_backend_customer_id:
            body.shopping_mall_ai_backend_customer_id ?? null,
          external_code: body.external_code ?? null,
          expires_at: body.expires_at ? toISOStringSafe(body.expires_at) : null,
          status: "issued",
          issued_at: toISOStringSafe(new Date()),
          created_at: toISOStringSafe(new Date()),
        },
      });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(
        "Issuance already exists for the given coupon/customer/external code (unique constraint violated)",
      );
    }
    throw err;
  }

  // Return DTO with ALL date/datetime values properly stringified and branded
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_coupon_id:
      created.shopping_mall_ai_backend_coupon_id as string &
        tags.Format<"uuid">,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id ?? null,
    external_code: created.external_code ?? null,
    expires_at: created.expires_at ? toISOStringSafe(created.expires_at) : null,
    status: created.status,
    issued_at: toISOStringSafe(created.issued_at),
    used_at: created.used_at ? toISOStringSafe(created.used_at) : null,
    revoked_at: created.revoked_at ? toISOStringSafe(created.revoked_at) : null,
    created_at: toISOStringSafe(created.created_at),
  };
}
