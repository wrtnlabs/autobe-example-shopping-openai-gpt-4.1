import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new payment record (pending or issued) in the ai_commerce_payments
 * subsystem for transaction tracking and settlement.
 *
 * This API allows an authenticated admin to create a new payment entry in the
 * ai_commerce_payments table. The resulting record is used for payment
 * tracking, future confirmation, audit, and compliance. Uniqueness of
 * payment_reference is enforced; duplicate payment_reference will cause an
 * error.
 *
 * @param props - Operation props
 * @param props.admin - Authenticated admin user making the request (payload
 *   checked by authorization guard)
 * @param props.body - Payment creation object (IAiCommercePayment.ICreate)
 *   specifying reference, status, amount, currency, etc.
 * @returns The full created payment record (IAiCommercePayment)
 * @throws {Error} If payment_reference is not unique or if creation fails
 */
export async function postaiCommerceAdminPayments(props: {
  admin: AdminPayload;
  body: IAiCommercePayment.ICreate;
}): Promise<IAiCommercePayment> {
  const { body } = props;
  // Prepare ISO strings for now
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    // Create record in DB; id required as no default in schema.
    const created = await MyGlobal.prisma.ai_commerce_payments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        payment_reference: body.payment_reference,
        status: body.status,
        amount: body.amount,
        currency_code: body.currency_code,
        issued_at: body.issued_at,
        // Only include confirmed_at/failure_reason when provided, else undefined
        confirmed_at: body.confirmed_at ?? undefined,
        failure_reason: body.failure_reason ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    });
    // Map all date fields to strings (already are), convert nullable/optional as needed
    return {
      id: created.id,
      payment_reference: created.payment_reference,
      status: created.status,
      amount: created.amount,
      currency_code: created.currency_code,
      issued_at: created.issued_at,
      confirmed_at: created.confirmed_at ?? undefined,
      failure_reason: created.failure_reason ?? undefined,
      created_at: created.created_at,
      updated_at: created.updated_at,
      deleted_at: created.deleted_at ?? undefined,
    };
  } catch (err) {
    // Prisma code: P2002 = Unique constraint failed
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Duplicate payment_reference.");
    }
    throw err;
  }
}
