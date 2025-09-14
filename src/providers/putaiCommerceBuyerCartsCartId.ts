import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCart";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update attributes of an existing shopping cart (ai_commerce_carts) by ID.
 *
 * This endpoint allows an authenticated buyer to update their own cart's status
 * or associated store, enforcing owner-only permissions. The operation only
 * modifies non-item-level attributes and will reject unauthorized access or
 * invalid status transitions. Notes in the request body are ignored, as the
 * business logic does not persist them into the table. All date fields are
 * converted to ISO8601 strings. Returns the updated IAiCommerceCart on
 * success.
 *
 * @param props - Object containing the authenticated buyer (BuyerPayload), the
 *   cart ID (UUID), and the request body with allowed changes.
 * @param props.buyer - The authenticated buyer making the request
 * @param props.cartId - The UUID of the shopping cart
 * @param props.body - The update payload (status/store_id)
 * @returns The updated IAiCommerceCart object
 * @throws {Error} If the cart does not exist, is deleted, unauthorized, or if
 *   status transition is not allowed
 */
export async function putaiCommerceBuyerCartsCartId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IAiCommerceCart.IUpdate;
}): Promise<IAiCommerceCart> {
  // Fetch only active (not-deleted) cart
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: { id: props.cartId, deleted_at: null },
  });
  if (!cart) throw new Error("Cart not found");
  if (cart.buyer_id !== props.buyer.id)
    throw new Error("You do not own this cart");

  // Business allowed status transitions (example)
  const allowedStatuses = ["draft", "active", "checked_out", "expired"];
  if (
    props.body.status !== undefined &&
    !allowedStatuses.includes(props.body.status)
  ) {
    throw new Error("Invalid status transition");
  }

  // Build update data object only with allowed changes
  await MyGlobal.prisma.ai_commerce_carts.update({
    where: { id: props.cartId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.store_id !== undefined && {
        store_id: props.body.store_id,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Refetch fresh row for response (joined for accurate timestamps, brand all fields)
  const updated = await MyGlobal.prisma.ai_commerce_carts.findFirstOrThrow({
    where: { id: props.cartId, deleted_at: null },
  });

  return {
    id: updated.id,
    buyer_id: updated.buyer_id ?? undefined,
    store_id: updated.store_id ?? undefined,
    status: updated.status,
    total_quantity: updated.total_quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
