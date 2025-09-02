import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a digital coin wallet ledger by its ID (hard delete).
 *
 * This operation performs a hard delete of a coin wallet from the active
 * database, in accordance with business rules: no soft deletion or recovery is
 * supported for coin ledgers. All balances and business records of the wallet
 * are erased (though audit logs may independently retain the event). The
 * operation is restricted to admins with active status; unauthorized or
 * non-existent admins cannot use this function. The function throws if the coin
 * wallet with the specified ID does not exist, or if the admin is not valid.
 *
 * @param props - Function props
 * @param props.admin - The authenticated admin performing this operation
 *   (validated by ID and status)
 * @param props.coinId - Unique identifier (UUID) for the coin wallet to delete
 * @returns Void
 * @throws {Error} If the admin is not authorized or active
 * @throws {Error} If the wallet does not exist or is already deleted
 */
export async function delete__shoppingMallAiBackend_admin_coins_$coinId(props: {
  admin: AdminPayload;
  coinId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, coinId } = props;

  // Step 1: Validate admin (must exist and be active, not soft-deleted)
  const adminRow =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: {
        id: admin.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!adminRow)
    throw new Error("Unauthorized: Admin is not active or does not exist");

  // Step 2: Ensure coin wallet ledger exists before deletion
  const coin = await MyGlobal.prisma.shopping_mall_ai_backend_coins.findUnique({
    where: { id: coinId },
  });
  if (!coin) throw new Error("Coin wallet ledger not found");

  // Step 3: Hard delete the coin wallet
  await MyGlobal.prisma.shopping_mall_ai_backend_coins.delete({
    where: { id: coinId },
  });
}
