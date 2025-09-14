import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full detail of a specific payment transaction by its transaction ID
 *
 * This operation fetches and returns the complete metadata and status for a
 * payment transaction, identified by its unique transaction ID, from the
 * ai_commerce_payment_transactions table. It is intended for use by admins for
 * compliance, transaction audit, payment workflow investigation, and for
 * reporting or support scenarios. All date fields are converted to ISO 8601
 * strings, nullable fields are handled per the DTO specification, and all
 * foreign-key IDs are exposed in the response. Only admins may access this
 * endpoint; all actions are auditable.
 *
 * @param props - Object containing props.admin (the authenticated admin) and
 *   props.paymentTransactionId (the transaction UUID)
 * @param props.admin - Authenticated admin performing the request
 * @param props.paymentTransactionId - Unique payment transaction ID to fetch
 * @returns The complete business and metadata payload for the requested payment
 *   transaction
 * @throws {Error} If no transaction is found for the given ID, or if
 *   unauthorized
 */
export async function getaiCommerceAdminPaymentTransactionsPaymentTransactionId(props: {
  admin: AdminPayload;
  paymentTransactionId: string & tags.Format<"uuid">;
}): Promise<IAiCommercePaymentTransaction> {
  const { paymentTransactionId } = props;
  const transaction =
    await MyGlobal.prisma.ai_commerce_payment_transactions.findUniqueOrThrow({
      where: { id: paymentTransactionId },
      select: {
        id: true,
        payment_id: true,
        method_id: true,
        gateway_id: true,
        transaction_reference: true,
        status: true,
        amount: true,
        currency_code: true,
        requested_at: true,
        completed_at: true,
        gateway_payload: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  // Convert all date fields using toISOStringSafe, ensure nullables handled as undefined if null, or converted to ISO string if present
  return {
    id: transaction.id,
    payment_id: transaction.payment_id,
    method_id: transaction.method_id,
    gateway_id: transaction.gateway_id,
    transaction_reference: transaction.transaction_reference,
    status: transaction.status,
    amount: transaction.amount,
    currency_code: transaction.currency_code,
    requested_at: toISOStringSafe(transaction.requested_at),
    completed_at: transaction.completed_at
      ? toISOStringSafe(transaction.completed_at)
      : undefined,
    gateway_payload: transaction.gateway_payload ?? undefined,
    created_at: toISOStringSafe(transaction.created_at),
    updated_at: toISOStringSafe(transaction.updated_at),
    deleted_at: transaction.deleted_at
      ? toISOStringSafe(transaction.deleted_at)
      : undefined,
  };
}
