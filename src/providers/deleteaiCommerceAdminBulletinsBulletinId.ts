import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Erase a bulletin by ID (soft delete in ai_commerce_bulletins for compliance).
 *
 * This operation marks a bulletin (announcement/notice) as deleted by setting
 * the `deleted_at` field to the current ISO 8601 timestamp, rather than
 * physically removing it from the database. Only administrators may perform
 * this operation. Throws an error if the bulletin does not exist or has already
 * been deleted.
 *
 * @param props - Operation parameters
 * @param props.admin - Authenticated admin user (must have active status)
 * @param props.bulletinId - The unique identifier of the bulletin to erase
 * @returns Void
 * @throws {Error} If the bulletin does not exist or has already been deleted
 */
export async function deleteaiCommerceAdminBulletinsBulletinId(props: {
  admin: AdminPayload;
  bulletinId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, bulletinId } = props;
  // Ensure the bulletin exists and has not already been deleted
  const bulletin = await MyGlobal.prisma.ai_commerce_bulletins.findFirst({
    where: {
      id: bulletinId,
      deleted_at: null,
    },
  });
  if (bulletin == null) {
    throw new Error("Bulletin not found or already deleted");
  }
  // Set deleted_at to now (ISO string) to perform soft delete
  await MyGlobal.prisma.ai_commerce_bulletins.update({
    where: { id: bulletinId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
