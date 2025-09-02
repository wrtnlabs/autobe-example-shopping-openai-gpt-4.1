import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new digital coin wallet for a user or seller.
 *
 * This operation creates a new coin wallet ledger for a specific user
 * (customer) or seller in the shopping mall AI backend. The coin ledger tracks
 * the total promotional/event coins ever granted, current usable balance, and
 * on-hold or expired coins. Ledger ownership is strictly unique—either a
 * customer or seller (but not both) can own a particular coin wallet. Admin
 * authorization is enforced by the system.
 *
 * - Only system admins can invoke this operation (checked by admin payload).
 * - Validates that only one owner (either customer or seller) is specified, not
 *   both or neither.
 * - Ensures uniqueness: a customer or seller can have only one active coin wallet
 *   at a time.
 * - Initial balances (total_accrued, usable_coin, expired_coin, on_hold_coin)
 *   must be provided in the request body.
 * - Timestamps and IDs are generated per system standards as ISO-8601 and UUID
 *   v4, respectively.
 * - Complies with all API and business schema constraints: all required and only
 *   allowed fields are present, including deleted_at (set to null on
 *   creation).
 *
 * @param props - Function properties.
 * @param props.admin - Authenticated system operator with elevated manage
 *   privileges.
 * @param props.body - Required properties for creating the coin wallet,
 *   including owner and balances.
 * @returns The created coin wallet entity, including all balances and owner
 *   linkage.
 * @throws {Error} If both or neither customer_id/seller_id are provided, or if
 *   a coin wallet already exists for the specified owner.
 */
export async function post__shoppingMallAiBackend_admin_coins(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCoin.ICreate;
}): Promise<IShoppingMallAiBackendCoin> {
  const { admin, body } = props;

  // Ownership validation (XOR: only one of customer or seller)
  const hasCustomerId =
    body.shopping_mall_ai_backend_customer_id !== undefined &&
    body.shopping_mall_ai_backend_customer_id !== null;
  const hasSellerId =
    body.shopping_mall_ai_backend_seller_id !== undefined &&
    body.shopping_mall_ai_backend_seller_id !== null;
  if (!hasCustomerId && !hasSellerId) {
    throw new Error(
      "Either shopping_mall_ai_backend_customer_id or shopping_mall_ai_backend_seller_id must be provided.",
    );
  }
  if (hasCustomerId && hasSellerId) {
    throw new Error(
      "A coin wallet can only be owned by a customer OR a seller, not both.",
    );
  }

  // Check uniqueness per owner (active only, i.e., deleted_at == null)
  if (hasCustomerId) {
    const existing =
      await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
        where: {
          shopping_mall_ai_backend_customer_id:
            body.shopping_mall_ai_backend_customer_id,
          deleted_at: null,
        },
      });
    if (existing !== null) {
      throw new Error(
        "A coin wallet already exists for the specified customer.",
      );
    }
  } else {
    const existing =
      await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
        where: {
          shopping_mall_ai_backend_seller_id:
            body.shopping_mall_ai_backend_seller_id,
          deleted_at: null,
        },
      });
    if (existing !== null) {
      throw new Error("A coin wallet already exists for the specified seller.");
    }
  }

  // Prepare created/updated timestamp and ID
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const coinId: string & tags.Format<"uuid"> = v4();

  // Create new coin wallet
  const created = await MyGlobal.prisma.shopping_mall_ai_backend_coins.create({
    data: {
      id: coinId,
      shopping_mall_ai_backend_customer_id: hasCustomerId
        ? body.shopping_mall_ai_backend_customer_id
        : null,
      shopping_mall_ai_backend_seller_id: hasSellerId
        ? body.shopping_mall_ai_backend_seller_id
        : null,
      total_accrued: body.total_accrued,
      usable_coin: body.usable_coin,
      expired_coin: body.expired_coin,
      on_hold_coin: body.on_hold_coin,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Map all fields (ensure type/format for return object)
  return {
    id: created.id,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      created.shopping_mall_ai_backend_seller_id ?? null,
    total_accrued: created.total_accrued,
    usable_coin: created.usable_coin,
    expired_coin: created.expired_coin,
    on_hold_coin: created.on_hold_coin,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
