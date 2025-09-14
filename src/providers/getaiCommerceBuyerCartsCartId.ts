import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCart";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve a single shopping cart detail by ID (ai_commerce_carts) for owner.
 *
 * Returns the complete cart record for the given cartId, including core fields
 * and privacy enforcement for the authenticated buyer. Only allows access when
 * the acting buyer owns the cart and it is not soft-deleted. Strictly enforces
 * that carts are only visible to their owners.
 *
 * @param props - Properties for the operation
 * @param props.buyer - Authenticated buyer payload (must match buyer_id on
 *   cart)
 * @param props.cartId - UUID of the cart to retrieve
 * @returns Shopping cart detail (IAiCommerceCart) conforming to DTO spec
 * @throws {Error} Cart not found, deleted, or forbidden
 */
export async function getaiCommerceBuyerCartsCartId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCart> {
  const { buyer, cartId } = props;
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: {
      id: cartId,
      deleted_at: null,
      buyer_id: buyer.id,
    },
  });
  if (!cart) throw new Error("Cart not found");
  return {
    id: cart.id,
    buyer_id: cart.buyer_id !== null ? cart.buyer_id : undefined,
    store_id: cart.store_id !== null ? cart.store_id : undefined,
    status: cart.status,
    total_quantity: cart.total_quantity,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at:
      cart.deleted_at !== null && cart.deleted_at !== undefined
        ? toISOStringSafe(cart.deleted_at)
        : undefined,
  };
}
