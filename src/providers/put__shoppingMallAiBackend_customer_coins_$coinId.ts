import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update digital coin ledger information by coinId.
 *
 * This endpoint allows an authenticated user (customer) to update the balance
 * fields of their own coin ledger. Only the account owner may update their own
 * coin ledger. Admin and seller ledgers must be updated via other endpoints.
 * The operation enforces full audit, cannot circumvent business or schema
 * constraints, and only mutable fields (balances) may be adjusted.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making this request; only
 *   this user can update their coin ledger
 * @param props.coinId - The UUID identifier of the coin ledger to update
 * @param props.body - Update fields (any subset of total_accrued, usable_coin,
 *   expired_coin, on_hold_coin)
 * @returns The updated coin ledger object (with updated audit fields and
 *   business integrity guarantees)
 * @throws {Error} If the coin ledger does not exist, is deleted, or user is not
 *   the owner
 * @throws {Error} If any attempted coin value is negative (business and schema
 *   compliance)
 */
export async function put__shoppingMallAiBackend_customer_coins_$coinId(props: {
  customer: CustomerPayload;
  coinId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCoin.IUpdate;
}): Promise<IShoppingMallAiBackendCoin> {
  const { customer, coinId, body } = props;

  // Fetch the coin ledger (must exist and not be soft deleted)
  const coin = await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
    where: {
      id: coinId,
      deleted_at: null,
    },
  });
  if (!coin) throw new Error("Coin ledger not found or already deleted");

  // Ownership check
  if (coin.shopping_mall_ai_backend_customer_id !== customer.id)
    throw new Error("Forbidden: Only the owner may update this coin ledger");

  // Defensive: No negative balances allowed
  if (body.total_accrued !== undefined && body.total_accrued < 0)
    throw new Error("Invalid: total_accrued must be non-negative");
  if (body.usable_coin !== undefined && body.usable_coin < 0)
    throw new Error("Invalid: usable_coin must be non-negative");
  if (body.expired_coin !== undefined && body.expired_coin < 0)
    throw new Error("Invalid: expired_coin must be non-negative");
  if (body.on_hold_coin !== undefined && body.on_hold_coin < 0)
    throw new Error("Invalid: on_hold_coin must be non-negative");

  // Compose update input - only set provided fields, always update updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_ai_backend_coins.update({
    where: { id: coinId },
    data: {
      total_accrued: body.total_accrued ?? undefined,
      usable_coin: body.usable_coin ?? undefined,
      expired_coin: body.expired_coin ?? undefined,
      on_hold_coin: body.on_hold_coin ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_seller_id:
      updated.shopping_mall_ai_backend_seller_id,
    total_accrued: updated.total_accrued,
    usable_coin: updated.usable_coin,
    expired_coin: updated.expired_coin,
    on_hold_coin: updated.on_hold_coin,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
