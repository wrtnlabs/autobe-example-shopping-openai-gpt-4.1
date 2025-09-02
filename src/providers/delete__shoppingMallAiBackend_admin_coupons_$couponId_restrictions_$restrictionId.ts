import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a coupon restriction from the system.
 *
 * This endpoint allows an authenticated administrator to permanently remove a
 * coupon restriction (business rule limiting coupon usage) from the shopping
 * mall backend system. It operates on the
 * shopping_mall_ai_backend_coupon_restrictions table, verifies that the
 * restriction exists and is scoped to the specified coupon, and then deletes it
 * using a hard delete operation.
 *
 * Security controls ensure only authorized admins can perform this operation.
 * The deletion is irreversible. Throws an error if the restriction is not found
 * or already deleted.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.couponId - The UUID of the coupon to which the restriction
 *   belongs
 * @param props.restrictionId - The UUID of the restriction to delete
 * @returns No content on success; throws if the restriction does not exist or
 *   is already deleted
 * @throws {Error} When the coupon restriction does not exist or is already
 *   deleted
 */
export async function delete__shoppingMallAiBackend_admin_coupons_$couponId_restrictions_$restrictionId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  restrictionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, couponId, restrictionId } = props;

  // Ensure the restriction exists and is owned by the specified coupon
  const restriction =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.findFirst(
      {
        where: {
          id: restrictionId,
          shopping_mall_ai_backend_coupon_id: couponId,
        },
      },
    );

  if (!restriction) {
    throw new Error("Restriction not found or already deleted");
  }

  // Hard delete - physically remove the restriction
  await MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.delete({
    where: {
      id: restrictionId,
    },
  });
}
