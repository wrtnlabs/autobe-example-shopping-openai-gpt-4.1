import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove a mileage account by its unique ID (hard delete, not
 * reversible).
 *
 * This operation performs a permanent removal (hard delete) of a mileage
 * account from the ai_commerce_mileage_accounts table. Admin authentication is
 * required. The account must be in an active/deletable state and have zero
 * balance; if not, the operation will throw an error.
 *
 * @param props - Object containing admin authentication and the
 *   mileageAccountId to delete
 * @param props.admin - The authenticated admin performing the operation
 * @param props.mileageAccountId - Unique UUID of the mileage account to delete
 * @returns Void (no return value on success)
 * @throws {Error} If account does not exist (active), is already deleted, or
 *   has nonzero balance
 */
export async function deleteaiCommerceAdminMileageAccountsMileageAccountId(props: {
  admin: AdminPayload;
  mileageAccountId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { mileageAccountId } = props;

  // Step 1: Find the mileage account, ensure it's not soft-deleted
  const account = await MyGlobal.prisma.ai_commerce_mileage_accounts.findFirst({
    where: {
      id: mileageAccountId,
      deleted_at: null,
    },
    select: { id: true, balance: true },
  });
  if (!account) {
    throw new Error("Mileage account not found or already deleted");
  }

  // Step 2: Ensure account balance is zero
  if (account.balance !== 0) {
    throw new Error("Cannot delete mileage account with nonzero balance");
  }

  // Step 3: Perform hard delete
  await MyGlobal.prisma.ai_commerce_mileage_accounts.delete({
    where: { id: mileageAccountId },
  });
}
