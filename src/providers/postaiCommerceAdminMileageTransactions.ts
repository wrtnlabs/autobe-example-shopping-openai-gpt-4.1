import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new mileage transaction record (accrual, redemption, adjustment, or
 * expiration).
 *
 * This operation enables authorized admin actors to create a mileage (point)
 * transaction in the system, such as accrual, redemption, adjustment, or
 * expiration, for a given user's mileage account. The endpoint creates a new
 * row in ai_commerce_mileage_transactions with all schema-required details,
 * including account, type, amount, contextual reference entity, and all
 * system-assigned identifiers and timestamps. The creation is strictly audited
 * and subject to upstream policy checks. No native Date type is used; all
 * datetimes and IDs are formatted and branded appropriately.
 *
 * @param props - Operation parameters: must include admin payload
 *   (authorization) and creation body (transaction details per
 *   IAiCommerceMileageTransaction.ICreate).
 * @param props.admin - The authenticated admin user initiating the creation
 *   (authorization is handled upstream via decorator and security context).
 * @param props.body - Required DTO body with mileage transaction creation
 *   details: mileage_account_id, type ('accrual', 'redemption', etc.), amount,
 *   status, reference_entity (optional), transacted_at (optional).
 * @returns The created mileage transaction record, including system-generated
 *   id and all business fields, in strict DTO format.
 * @throws {Error} If the operation fails to create the record.
 */
export async function postaiCommerceAdminMileageTransactions(props: {
  admin: AdminPayload;
  body: IAiCommerceMileageTransaction.ICreate;
}): Promise<IAiCommerceMileageTransaction> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  const transactedAt: string & tags.Format<"date-time"> =
    props.body.transacted_at ?? now;

  const created = await MyGlobal.prisma.ai_commerce_mileage_transactions.create(
    {
      data: {
        id,
        mileage_account_id: props.body.mileage_account_id,
        type: props.body.type,
        amount: props.body.amount,
        status: props.body.status,
        reference_entity: props.body.reference_entity ?? undefined,
        transacted_at: transactedAt,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    },
  );

  return {
    id: created.id,
    mileage_account_id: created.mileage_account_id,
    type: created.type,
    amount: created.amount,
    status: created.status,
    reference_entity: created.reference_entity ?? null,
    transacted_at: toISOStringSafe(created.transacted_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
