import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new shopping cart for a customer or guest session.
 *
 * Adds a new shopping cart record to the ShoppingMallAiBackend system for a
 * customer or guest session.
 *
 * This function is used when a new cart needs to be created on guest checkout,
 * first login, or when a new customer begins a session. Incoming data includes
 * optional customer/session IDs, cart_token, and cart metadata according to
 * IShoppingMallAiBackendCart.ICreate. Ensures uniqueness of cart_token and
 * generates all system keys and timestamps. All date fields are returned in RFC
 * 3339 ISO format. Handles Prisma errors for cart_token collisions.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller performing the cart creation
 *   (authorization checked prior)
 * @param props.body - Fields for cart creation: customer/session, tokens, etc.
 * @returns The new shopping cart record with all generated and assigned values
 * @throws {Error} If cart_token is not unique or other creation
 *   conflict/validation errors
 */
export async function post__shoppingMallAiBackend_seller_carts(props: {
  seller: SellerPayload;
  body: IShoppingMallAiBackendCart.ICreate;
}): Promise<IShoppingMallAiBackendCart> {
  const { body } = props;
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.shopping_mall_ai_backend_carts.create(
      {
        data: {
          id,
          shopping_mall_ai_backend_customer_id:
            body.shopping_mall_ai_backend_customer_id ?? null,
          shopping_mall_ai_backend_customer_session_id:
            body.shopping_mall_ai_backend_customer_session_id ?? null,
          cart_token: body.cart_token,
          status: body.status,
          expires_at: body.expires_at ?? null,
          last_merged_at: body.last_merged_at ?? null,
          note: body.note ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      },
    );
    return {
      id: created.id as string & tags.Format<"uuid">,
      shopping_mall_ai_backend_customer_id:
        created.shopping_mall_ai_backend_customer_id ?? null,
      shopping_mall_ai_backend_customer_session_id:
        created.shopping_mall_ai_backend_customer_session_id ?? null,
      cart_token: created.cart_token,
      status: created.status,
      expires_at: created.expires_at
        ? toISOStringSafe(created.expires_at)
        : null,
      last_merged_at: created.last_merged_at
        ? toISOStringSafe(created.last_merged_at)
        : null,
      note: created.note ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (exp) {
    // Optionally, can check for unique constraint error here and map to specific error message
    throw exp;
  }
}
