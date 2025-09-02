import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete a mileage ledger for compliance/evidence purposes.
 *
 * Marks a mileage/point ledger as deleted (logical deletion) for
 * business/institutional compliance. Only authorized platform admins or
 * automated back-office processes can perform this action. Sets deleted_at;
 * does not physically erase record, supporting audit and compliance evidence.
 *
 * Ensures no further accrual/use events are permitted; all history remains
 * queryable for authorized review, but invisible in normal user queries. Errors
 * may occur if mileageId does not exist or is already deleted. Susceptible to
 * audit logging and security review.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication (must be valid and active)
 * @param props.mileageId - UUID of the mileage ledger to be soft-deleted
 * @returns Void
 * @throws {Error} If mileage ledger does not exist or is already logically
 *   deleted
 */
export async function delete__shoppingMallAiBackend_admin_mileages_$mileageId(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve mileage ledger by id
  const mileage =
    await MyGlobal.prisma.shopping_mall_ai_backend_mileages.findUnique({
      where: { id: props.mileageId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (!mileage) {
    throw new Error("Mileage ledger not found");
  }
  if (mileage.deleted_at !== null) {
    throw new Error("Mileage ledger already deleted");
  }
  // 2. Soft delete (set deleted_at)
  await MyGlobal.prisma.shopping_mall_ai_backend_mileages.update({
    where: { id: props.mileageId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
