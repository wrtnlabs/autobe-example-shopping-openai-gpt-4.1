import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update/correct metadata or status of a specific mileage transaction event.
 *
 * This operation updates an existing mileage transaction entry identified by
 * mileageTransactionId. Update actions are highly restricted—used solely for
 * correction of erroneous metadata, operational status, or compliance
 * justification. It does not allow direct modification of amounts for finalized
 * transactions except by official audit/correction.
 *
 * Accepts request body formatted as IAiCommerceMileageTransaction.IUpdate,
 * supporting changes only to allowed schema fields. Attempts to update
 * immutable or business-critical fields will result in errors.
 *
 * All changes must be audit-logged, including actor, timestamp, before/after
 * state, and rationale for correction. Only administrators and
 * compliance-authorized actors may use this endpoint. Use may require
 * justification in practice.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.admin - The authenticated admin performing the update
 * @param props.mileageTransactionId - UUID of the mileage transaction to update
 * @param props.body - Fields for updating mileage transaction metadata, status,
 *   or compliance reason
 * @returns The updated mileage transaction record in DTO format (all
 *   date/datetime fields are string & tags.Format<'date-time'>)
 * @throws {Error} If the transaction is not found or already deleted
 * @throws {Error} If attempt to modify restricted/immutable fields
 */
export async function putaiCommerceAdminMileageTransactionsMileageTransactionId(props: {
  admin: AdminPayload;
  mileageTransactionId: string & tags.Format<"uuid">;
  body: IAiCommerceMileageTransaction.IUpdate;
}): Promise<IAiCommerceMileageTransaction> {
  const { admin, mileageTransactionId, body } = props;

  // 1. Find transaction (must not be already soft-deleted)
  const prev = await MyGlobal.prisma.ai_commerce_mileage_transactions.findFirst(
    {
      where: { id: mileageTransactionId, deleted_at: null },
    },
  );
  if (!prev)
    throw new Error("Mileage transaction not found or already deleted");

  // 2. Prepare updatable fields per schema/DTO
  // Immutable: id, mileage_account_id, created_at (never update)
  // Allow: type, amount, status, reference_entity, transacted_at, deleted_at
  // Always set updated_at to now
  // If field is undefined, skip (allow update for null where allowed)
  const updateData = {
    ...(body.type !== undefined ? { type: body.type } : {}),
    ...(body.amount !== undefined ? { amount: body.amount } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.reference_entity !== undefined
      ? { reference_entity: body.reference_entity }
      : {}),
    ...(body.transacted_at !== undefined
      ? { transacted_at: body.transacted_at }
      : {}),
    ...(body.deleted_at !== undefined ? { deleted_at: body.deleted_at } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.ai_commerce_mileage_transactions.update(
    {
      where: { id: mileageTransactionId },
      data: updateData,
    },
  );

  // 3. Return result as IAiCommerceMileageTransaction (convert date fields with toISOStringSafe)
  return {
    id: updated.id,
    mileage_account_id: updated.mileage_account_id,
    type: updated.type as
      | "accrual"
      | "redemption"
      | "adjustment"
      | "expiration",
    amount: updated.amount,
    status: updated.status,
    reference_entity:
      updated.reference_entity === null ||
      updated.reference_entity === undefined
        ? undefined
        : updated.reference_entity,
    transacted_at: toISOStringSafe(updated.transacted_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
