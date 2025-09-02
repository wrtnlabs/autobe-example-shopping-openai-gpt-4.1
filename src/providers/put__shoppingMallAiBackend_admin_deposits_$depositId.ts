import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update business or status information for a specific deposit ledger.
 *
 * This operation allows an authorized admin to update the business, status, or
 * financial information of an existing deposit ledger, such as correcting
 * balances, transferring ownership, or handling compliance incidents. It
 * requires the deposit ledger not to be soft-deleted. All updates record the
 * new updated_at timestamp.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the request (authorization
 *   already enforced)
 * @param props.depositId - The deposit ledger's unique identifier
 * @param props.body - The fields to update (any subset of allowed fields)
 * @returns The updated deposit ledger object with all fields correctly
 *   formatted.
 * @throws {Error} If the target deposit ledger does not exist (not found or
 *   soft-deleted)
 */
export async function put__shoppingMallAiBackend_admin_deposits_$depositId(props: {
  admin: AdminPayload;
  depositId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendDeposit.IUpdate;
}): Promise<IShoppingMallAiBackendDeposit> {
  const { depositId, body } = props;
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_deposits.findFirst({
      where: {
        id: depositId,
        deleted_at: null,
      },
    });
  if (!existing) throw new Error("Deposit ledger not found");

  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_deposits.update({
      where: { id: depositId },
      data: {
        shopping_mall_ai_backend_customer_id:
          body.shopping_mall_ai_backend_customer_id ?? undefined,
        shopping_mall_ai_backend_seller_id:
          body.shopping_mall_ai_backend_seller_id ?? undefined,
        total_accrued: body.total_accrued ?? undefined,
        usable_balance: body.usable_balance ?? undefined,
        expired_balance: body.expired_balance ?? undefined,
        on_hold_balance: body.on_hold_balance ?? undefined,
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
    usable_balance: updated.usable_balance,
    expired_balance: updated.expired_balance,
    on_hold_balance: updated.on_hold_balance,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
