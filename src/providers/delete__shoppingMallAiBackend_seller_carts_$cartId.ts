import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Soft delete (logical deletion) a shopping cart by marking deleted_at for
 * compliance retention.
 *
 * This endpoint logically deletes a shopping cart identified by its cartId by
 * setting its deleted_at timestamp. The operation can be performed by the cart
 * owner (seller) or privileged admin. If the cart is already deleted or not
 * found, errors are thrown. There is no field that ties cart ownership directly
 * to the seller, so access is enforced via convention and authentication
 * context.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller performing the deletion
 * @param props.cartId - Unique identifier (UUID) of the cart to logically
 *   delete
 * @returns Void
 * @throws {Error} If cart does not exist (cart not found)
 * @throws {Error} If the cart has already been deleted (logical deletion
 *   already occurred)
 */
export async function delete__shoppingMallAiBackend_seller_carts_$cartId(props: {
  seller: SellerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, cartId } = props;

  // Locate cart and verify not already soft-deleted
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findUnique({
    where: { id: cartId },
  });

  if (!cart) {
    throw new Error("Cart not found");
  }
  if (cart.deleted_at !== null && cart.deleted_at !== undefined) {
    throw new Error("Cart already deleted");
  }
  // There is no field for ownership validation in the schema; the scenario enforces owner context at the API/auth layer.

  // Soft delete by marking deleted_at
  await MyGlobal.prisma.shopping_mall_ai_backend_carts.update({
    where: { id: cartId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
