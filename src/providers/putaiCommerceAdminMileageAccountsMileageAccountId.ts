import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update details for an existing mileage account by unique ID.
 *
 * This operation updates the status of a mileage account (e.g., active,
 * suspended, closed). Only admins may perform this operation, and all changes
 * are audited at the compliance level. Balance adjustments require separate
 * business processes and are never performed here.
 *
 * @param props - The props for the mileage account update.
 * @param props.admin - Authenticated admin performing the update.
 * @param props.mileageAccountId - The mileage account UUID to update.
 * @param props.body - Update fields for the mileage account (only 'status').
 * @returns The updated IAiCommerceMileageAccount object after status change.
 * @throws {Error} If mileage account does not exist.
 */
export async function putaiCommerceAdminMileageAccountsMileageAccountId(props: {
  admin: AdminPayload;
  mileageAccountId: string & tags.Format<"uuid">;
  body: IAiCommerceMileageAccount.IUpdate;
}): Promise<IAiCommerceMileageAccount> {
  const { mileageAccountId, body } = props;

  // Fetch to ensure mileage account exists
  const account = await MyGlobal.prisma.ai_commerce_mileage_accounts.findUnique(
    {
      where: { id: mileageAccountId },
    },
  );
  if (!account) {
    throw new Error("Mileage account not found");
  }

  // Update the only permitted fields: status and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_mileage_accounts.update({
    where: { id: mileageAccountId },
    data: {
      status: body.status === undefined ? account.status : body.status,
      updated_at: now,
    },
  });

  // Fetch updated state for canonical response
  const updated = await MyGlobal.prisma.ai_commerce_mileage_accounts.findUnique(
    {
      where: { id: mileageAccountId },
    },
  );
  if (!updated) {
    throw new Error("Mileage account not found after update");
  }

  return {
    id: updated.id,
    account_code: updated.account_code,
    user_id: updated.user_id,
    balance: updated.balance,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
