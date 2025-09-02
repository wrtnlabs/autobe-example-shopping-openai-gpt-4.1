import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve details for a specific digital coin ledger by coinId.
 *
 * This function fetches the coin wallet ledger belonging to an authenticated
 * customer by its unique coinId. It verifies ownership, excludes deleted
 * ledgers, and returns all business and audit fields formatted for API
 * consumers.
 *
 * @param props -
 *
 *   - Customer: Authenticated customer JWT payload ({ id: UUID, type: "customer" })
 *   - CoinId: UUID of the coin ledger to retrieve
 *
 * @returns Full coin ledger business/audit fields per
 *   IShoppingMallAiBackendCoin format
 * @throws {Error} If the coin ledger is missing, deleted, or the user is not
 *   the owner
 */
export async function get__shoppingMallAiBackend_customer_coins_$coinId(props: {
  customer: CustomerPayload;
  coinId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCoin> {
  const { customer, coinId } = props;
  const coin = await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
    where: {
      id: coinId,
      deleted_at: null,
    },
  });
  if (!coin) throw new Error("Coin ledger not found");
  if (coin.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: Not coin owner");
  }
  return {
    id: coin.id,
    shopping_mall_ai_backend_customer_id:
      coin.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      coin.shopping_mall_ai_backend_seller_id ?? null,
    total_accrued: coin.total_accrued,
    usable_coin: coin.usable_coin,
    expired_coin: coin.expired_coin,
    on_hold_coin: coin.on_hold_coin,
    created_at: toISOStringSafe(coin.created_at),
    updated_at: toISOStringSafe(coin.updated_at),
    deleted_at: coin.deleted_at ? toISOStringSafe(coin.deleted_at) : null,
  };
}
