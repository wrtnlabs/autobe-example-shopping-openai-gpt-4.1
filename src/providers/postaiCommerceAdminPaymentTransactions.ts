import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Manually create a payment transaction record for reconciliation or admin
 * purposes
 *
 * This operation allows an authenticated admin to create a new record in the
 * ai_commerce_payment_transactions table. It is intended for back-office/admin
 * users to insert transactions for exception handling, platform reconciliation,
 * or correcting gateway transaction history. Buyer-initiated payment
 * transactions are not supported here.
 *
 * @param props - The parameters for the payment transaction
 * @param props.admin - The authenticated admin performing the operation
 * @param props.body - The request body including all fields necessary to create
 *   the transaction
 * @returns The full created payment transaction record with complete metadata
 * @throws {Error} If the referenced payment, gateway, or method does not exist
 *   (foreign key constraint), or transaction_reference is not globally unique
 */
export async function postaiCommerceAdminPaymentTransactions(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentTransaction.ICreate;
}): Promise<IAiCommercePaymentTransaction> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ai_commerce_payment_transactions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        payment_id: props.body.payment_id,
        method_id: props.body.method_id,
        gateway_id: props.body.gateway_id,
        transaction_reference: props.body.transaction_reference,
        status: props.body.status,
        amount: props.body.amount,
        currency_code: props.body.currency_code,
        requested_at: props.body.requested_at,
        gateway_payload: props.body.gateway_payload ?? undefined,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id,
    payment_id: created.payment_id,
    method_id: created.method_id,
    gateway_id: created.gateway_id,
    transaction_reference: created.transaction_reference,
    status: created.status,
    amount: created.amount,
    currency_code: created.currency_code,
    requested_at: created.requested_at,
    completed_at:
      typeof created.completed_at === "undefined"
        ? undefined
        : created.completed_at === null
          ? null
          : toISOStringSafe(created.completed_at),
    gateway_payload:
      typeof created.gateway_payload === "undefined"
        ? undefined
        : created.gateway_payload,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at:
      typeof created.deleted_at === "undefined"
        ? undefined
        : created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
  };
}
