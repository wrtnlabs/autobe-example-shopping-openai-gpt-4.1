import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft-deletes (marks as deleted_at) a digital coin ledger by coinId for
 * regulatory compliance.
 *
 * This function marks a specified coin ledger (wallet) as deleted by setting
 * the deleted_at timestamp in the shopping_mall_ai_backend_coins table.
 * Soft-deletion ensures records are retained for evidence, regulatory audit,
 * and future recovery in line with business and legal requirements.
 *
 * Only the ledger's owner (customer) may initiate deletion via this endpoint.
 * Once soft-deleted, the ledger is hidden from general access, and further
 * transactions are blocked. Attempts to delete non-existent or unauthorized
 * coin ledgers result in error signaling. Full deletion is not allowed
 * (preserves audit/evidence).
 *
 * @param props - Props with authenticated customer payload and coin ledger
 *   UUID.
 * @param props.customer - Authenticated customer payload (must own the coin
 *   ledger).
 * @param props.coinId - ID of the coin ledger to be soft-deleted (UUID).
 * @returns Void
 * @throws {Error} If the coin ledger does not exist, is already deleted, or the
 *   caller is not its owner.
 */
export async function delete__shoppingMallAiBackend_customer_coins_$coinId(props: {
  customer: CustomerPayload;
  coinId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, coinId } = props;

  // 1. Fetch coin ledger and verify status
  const coin = await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
    where: { id: coinId },
    select: {
      id: true,
      shopping_mall_ai_backend_customer_id: true,
      deleted_at: true,
    },
  });
  if (!coin || coin.deleted_at !== null) {
    throw new Error("Coin ledger not found or already deleted");
  }
  if (coin.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You are not the owner of this coin ledger");
  }

  // 2. Soft delete by updating deleted_at (do not use Date in any declaration or type)
  await MyGlobal.prisma.shopping_mall_ai_backend_coins.update({
    where: { id: coinId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No return value
}
