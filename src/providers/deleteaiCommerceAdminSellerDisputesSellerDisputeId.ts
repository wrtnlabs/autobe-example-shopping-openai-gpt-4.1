import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove a seller dispute record from ai_commerce_seller_disputes
 * by ID (hard delete, admin-only).
 *
 * This operation allows a platform administrator to irreversibly delete a
 * seller dispute record for legal, correction, or compliance needs. The
 * deletion is a hard delete (not soft), and is performed only after verifying
 * the record exists. If the record does not exist, an error is thrown. This
 * action is strictly limited to admin users. Audit logging for evidence is
 * assumed to be handled at the platform or infrastructure level; no audit trail
 * is generated directly in this function.
 *
 * @param props - Props for the operation
 * @param props.admin - The authenticated admin (authorization enforced by
 *   controller/decorator)
 * @param props.sellerDisputeId - Unique UUID of the seller dispute to delete
 * @returns Void
 * @throws {Error} When the specified seller dispute does not exist or is
 *   already deleted
 */
export async function deleteaiCommerceAdminSellerDisputesSellerDisputeId(props: {
  admin: AdminPayload;
  sellerDisputeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { sellerDisputeId } = props;

  const existing = await MyGlobal.prisma.ai_commerce_seller_disputes.findUnique(
    {
      where: { id: sellerDisputeId },
    },
  );
  if (!existing) {
    throw new Error("Seller dispute record not found");
  }
  await MyGlobal.prisma.ai_commerce_seller_disputes.delete({
    where: { id: sellerDisputeId },
  });
}
