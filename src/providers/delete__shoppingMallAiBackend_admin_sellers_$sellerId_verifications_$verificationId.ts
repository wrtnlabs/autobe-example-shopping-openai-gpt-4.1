import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove a seller verification record (admin-only).
 *
 * Permanently remove a specific seller verification record, targeted by
 * sellerId and verificationId. All deletions are executed by admin and logged
 * in audit trail for future evidence needs. Operation is not reversible and
 * must comply with regulatory and business policy.
 *
 * Attempting to delete non-existent or already removed verification records
 * returns an error. This is critical for compliance, KYC/KYB evidence
 * management, and onboarding workflows.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 *   (AdminPayload)
 * @param props.sellerId - UUID of the seller whose verification is to be
 *   deleted
 * @param props.verificationId - UUID of the verification record to remove
 * @returns Void
 * @throws {Error} When the verification record does not exist or does not
 *   belong to the seller
 */
export async function delete__shoppingMallAiBackend_admin_sellers_$sellerId_verifications_$verificationId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  verificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, sellerId, verificationId } = props;
  // Confirm the verification exists and belongs to the given seller
  const verification =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_verifications.findUnique(
      {
        where: { id: verificationId },
      },
    );
  if (!verification || verification.seller_id !== sellerId) {
    throw new Error("Seller verification record not found");
  }
  await MyGlobal.prisma.shopping_mall_ai_backend_seller_verifications.delete({
    where: { id: verificationId },
  });
}
