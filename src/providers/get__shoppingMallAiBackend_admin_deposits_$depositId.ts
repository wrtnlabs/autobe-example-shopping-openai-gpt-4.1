import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get full detail of a specific deposit ledger by its unique ID.
 *
 * Retrieves full details and audit snapshot of a specific cash deposit ledger
 * for a customer or seller by deposit ID. Queries the
 * shopping_mall_ai_backend_deposits table for all business, balance, status,
 * and audit metadata. Only system administrators (admin) may perform this
 * operation; each query is logged for evidence.
 *
 * This API is used for admin compliance review, incident response, account
 * investigations, and business support. Returns all ledger, timestamp, and
 * status fields if present; returns null for optional fields not present. Soft
 * deleted records (deleted_at not null) are not returned. Throws an Error if no
 * such deposit ledger is found for the supplied ID.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user (AdminPayload) required for
 *   access
 * @param props.depositId - UUID of the deposit ledger to retrieve
 * @returns The complete detail (business, status, audit, financial fields) of
 *   the deposit ledger
 * @throws {Error} When the specified deposit ledger does not exist or is soft
 *   deleted
 */
export async function get__shoppingMallAiBackend_admin_deposits_$depositId(props: {
  admin: AdminPayload;
  depositId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendDeposit> {
  const { admin, depositId } = props;
  // Lookup deposit by ID, excluding soft-deleted
  const deposit =
    await MyGlobal.prisma.shopping_mall_ai_backend_deposits.findFirst({
      where: {
        id: depositId,
        deleted_at: null,
      },
    });
  if (!deposit) throw new Error("Deposit ledger not found");
  return {
    id: deposit.id,
    shopping_mall_ai_backend_customer_id:
      deposit.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      deposit.shopping_mall_ai_backend_seller_id ?? null,
    total_accrued: deposit.total_accrued,
    usable_balance: deposit.usable_balance,
    expired_balance: deposit.expired_balance,
    on_hold_balance: deposit.on_hold_balance,
    created_at: toISOStringSafe(deposit.created_at),
    updated_at: toISOStringSafe(deposit.updated_at),
    deleted_at: deposit.deleted_at ? toISOStringSafe(deposit.deleted_at) : null,
  };
}
