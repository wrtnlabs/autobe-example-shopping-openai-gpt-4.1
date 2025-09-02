import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update shopping cart metadata or status for a given cartId.
 *
 * Update an existing cart's metadata or status by specifying the cartId and
 * supplying the update fields in the request body.
 *
 * Common use-cases include merging guest and member carts, associating a
 * customer account, or changing cart status. Authorization ensures only the
 * right user or admin may apply changes. Requests are validated for data
 * consistency and business rules. Results in a returned updated cart object
 * reflecting all changes.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the update (must
 *   have admin privileges)
 * @param props.cartId - Unique identifier of the cart to update (UUID)
 * @param props.body - Fields to update in the shopping cart (status,
 *   associations, metadata)
 * @returns The updated shopping cart object with all modified fields
 * @throws {Error} When cart does not exist, is already deleted, or is not
 *   accessible
 */
export async function put__shoppingMallAiBackend_admin_carts_$cartId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCart.IUpdate;
}): Promise<IShoppingMallAiBackendCart> {
  const { admin, cartId, body } = props;
  // Authorization is enforced at the controller layer; require presence of admin
  if (!admin) throw new Error("Admin authentication required");

  // Find the cart and ensure it is not soft-deleted
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: {
      id: cartId,
      deleted_at: null,
    },
  });
  if (!cart) throw new Error("Cart not found or has been deleted");

  // Update supplied fields. Only change those present in body, always update updated_at.
  const updated = await MyGlobal.prisma.shopping_mall_ai_backend_carts.update({
    where: { id: cartId },
    data: {
      shopping_mall_ai_backend_customer_id:
        body.shopping_mall_ai_backend_customer_id ?? undefined,
      shopping_mall_ai_backend_customer_session_id:
        body.shopping_mall_ai_backend_customer_session_id ?? undefined,
      cart_token: body.cart_token ?? undefined,
      status: body.status ?? undefined,
      expires_at: body.expires_at ?? undefined,
      last_merged_at: body.last_merged_at ?? undefined,
      note: body.note ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_customer_session_id:
      updated.shopping_mall_ai_backend_customer_session_id,
    cart_token: updated.cart_token,
    status: updated.status,
    expires_at: updated.expires_at ? toISOStringSafe(updated.expires_at) : null,
    last_merged_at: updated.last_merged_at
      ? toISOStringSafe(updated.last_merged_at)
      : null,
    note: updated.note ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
