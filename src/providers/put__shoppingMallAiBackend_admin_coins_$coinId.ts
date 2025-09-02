import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update coin wallet ledger information by ID.
 *
 * Update wallet metadata for an identified digital coin wallet, including owner
 * linkage, current balance totals, or wallet status. The operation requires the
 * coinId path parameter and a body specifying the update fields. Permission
 * controls restrict access to credentialed admins, with all modifications
 * audit-logged for financial compliance. Common update use cases include fixing
 * discrepancies, campaign adjustments, or system reconciliations. Related
 * endpoints support searching ledgers and viewing their histories.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the coin wallet
 *   update
 * @param props.coinId - UUID of the coin wallet to update
 * @param props.body - Fields to update in the coin wallet ledger (balances)
 * @returns The updated coin wallet entity
 * @throws {Error} If the coin wallet is not found or is soft-deleted
 */
export async function put__shoppingMallAiBackend_admin_coins_$coinId(props: {
  admin: AdminPayload;
  coinId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCoin.IUpdate;
}): Promise<IShoppingMallAiBackendCoin> {
  const { admin, coinId, body } = props;
  // Step 1: Ensure the coin wallet exists and is not soft deleted
  const coin = await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
    where: {
      id: coinId,
      deleted_at: null,
    },
  });
  if (!coin) {
    throw new Error("Coin wallet not found");
  }

  // Step 2: Perform the update with only allowable fields
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

  // Step 3: Map and return the updated wallet with audit fields as date-time strings
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
