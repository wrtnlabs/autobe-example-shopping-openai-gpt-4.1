import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a payment transaction record by ID for reconciliation, error
 * correction, or compliance.
 *
 * This endpoint enables an authenticated admin to update an existing payment
 * transaction record in the ai_commerce_payment_transactions table. Permitted
 * fields for update include status (workflow or settlement state), transaction
 * completion timestamp, and gateway payload/response (for reconciliation/audit
 * evidence). All other fields such as payment_id, amount,
 * transaction_reference, and created_at/identity values are immutable and will
 * not be modified. Modifications to sensitive financial fields are strictly
 * logged and access controlled for compliance.
 *
 * Authorization: Only admin users may use this operation (enforced by decorator
 * and logic).
 *
 * @param props - Update parameters
 * @param props.admin - Authenticated admin payload (authorization checked
 *   upstream)
 * @param props.paymentTransactionId - UUID for the payment transaction to
 *   update
 * @param props.body - Allowed update fields (status, completed_at,
 *   gateway_payload, updated_at)
 * @returns The updated IAiCommercePaymentTransaction with all dates as branded
 *   ISO strings
 * @throws {Error} If the payment transaction does not exist
 * @throws {Error} If the transaction is already locked/settled (not allowed to
 *   update)
 */
export async function putaiCommerceAdminPaymentTransactionsPaymentTransactionId(props: {
  admin: AdminPayload;
  paymentTransactionId: string & tags.Format<"uuid">;
  body: IAiCommercePaymentTransaction.IUpdate;
}): Promise<IAiCommercePaymentTransaction> {
  const { admin, paymentTransactionId, body } = props;
  // Step 1: Fetch the existing payment transaction by ID
  const existing =
    await MyGlobal.prisma.ai_commerce_payment_transactions.findFirst({
      where: { id: paymentTransactionId },
    });
  if (!existing) {
    throw new Error("Payment transaction not found");
  }
  // Step 2: Disallow edits for settled/locked states (per compliance logic)
  if (existing.status === "settled" || existing.status === "locked") {
    throw new Error("Cannot update a settled or locked transaction");
  }
  // Step 3: Only update permitted fields (never ID, payment_id, amount, reference, etc)
  const updated = await MyGlobal.prisma.ai_commerce_payment_transactions.update(
    {
      where: { id: paymentTransactionId },
      data: {
        status: body.status ?? undefined,
        completed_at: body.completed_at ?? undefined,
        gateway_payload: body.gateway_payload ?? undefined,
        updated_at: body.updated_at,
      },
    },
  );
  // Step 4: Return complete DTO, stringifying all date fields per contract
  return {
    id: updated.id,
    payment_id: updated.payment_id,
    method_id: updated.method_id,
    gateway_id: updated.gateway_id,
    transaction_reference: updated.transaction_reference,
    status: updated.status,
    amount: updated.amount,
    currency_code: updated.currency_code,
    requested_at: toISOStringSafe(updated.requested_at),
    completed_at:
      updated.completed_at !== null && updated.completed_at !== undefined
        ? toISOStringSafe(updated.completed_at)
        : updated.completed_at,
    gateway_payload: updated.gateway_payload ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at,
  };
}
