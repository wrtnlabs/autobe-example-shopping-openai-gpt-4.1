import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific coin wallet by ID.
 *
 * Returns full details for an individual digital coin wallet ledger identified
 * by its unique ID. Coin wallets track the total, usable, expired, and on-hold
 * coins for a user or seller in the shopping mall AI backend. Wallets are used
 * for business processes such as coupon events, promotional rewards, or
 * campaign credits. Access is limited to admins and the wallet owner. Used to
 * review a user's wallet, settlement status, or for ledger corrections.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin (AdminPayload)
 * @param props.coinId - Unique identifier for the target digital coin wallet
 *   ledger
 * @returns All data for the coin wallet, including balances and metadata. Dates
 *   are ISO 8601 strings; null if soft-deleted.
 * @throws {Error} When the coin wallet is not found or is soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_coins_$coinId(props: {
  admin: AdminPayload;
  coinId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCoin> {
  const { coinId } = props;
  const coin = await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
    where: {
      id: coinId,
      deleted_at: null,
    },
  });
  if (!coin) {
    throw new Error("Coin wallet not found");
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
