import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update permitted fields of a deposit transaction (by UUID), strictly audited
 * and business-rule constrained.
 *
 * This endpoint allows finance administrators to update editable business
 * fields (status, reference, performed_at) of a specific deposit transaction,
 * as per financial and compliance policy. Amount, account binding, and type are
 * immutable; any attempt to change those will be rejected upstream and is not
 * supported here. Soft-deleted transactions cannot be edited.
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated AdminPayload (authorization enforced by
 *   decorator)
 * @param props.depositTransactionId - UUID of the deposit transaction to update
 * @param props.body - Object specifying which updateable fields to modify
 *   (status, counterparty_reference, performed_at)
 * @returns The updated IAiCommerceDepositTransaction entity object as per API
 *   contract
 * @throws {Error} When the transaction doesn't exist or has been soft-deleted
 */
export async function putaiCommerceAdminDepositTransactionsDepositTransactionId(props: {
  admin: AdminPayload;
  depositTransactionId: string & tags.Format<"uuid">;
  body: IAiCommerceDepositTransaction.IUpdate;
}): Promise<IAiCommerceDepositTransaction> {
  // Step 1: Fetch and authorize existence; exclude soft-deleted
  const tx = await MyGlobal.prisma.ai_commerce_deposit_transactions.findFirst({
    where: {
      id: props.depositTransactionId,
      deleted_at: null,
    },
  });
  if (!tx) {
    throw new Error("Deposit transaction not found or has been deleted.");
  }
  // Step 2: Apply allowable updates only
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updates = {
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.counterparty_reference !== undefined && {
      counterparty_reference: props.body.counterparty_reference,
    }),
    ...(props.body.performed_at !== undefined && {
      performed_at: props.body.performed_at,
    }),
    updated_at: now,
  };
  // Step 3: Persist update
  const updated = await MyGlobal.prisma.ai_commerce_deposit_transactions.update(
    {
      where: { id: props.depositTransactionId },
      data: updates,
    },
  );
  // Step 4: Return as DTO with correct date formatting and null/undefined handling
  return {
    id: updated.id,
    deposit_account_id: updated.deposit_account_id,
    type: updated.type,
    amount: updated.amount,
    status: updated.status,
    counterparty_reference:
      updated.counterparty_reference === null
        ? undefined
        : updated.counterparty_reference,
    performed_at: toISOStringSafe(updated.performed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
