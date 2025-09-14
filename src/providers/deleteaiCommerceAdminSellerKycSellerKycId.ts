import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a seller KYC record for audit/audit-compliance.
 *
 * Marks the specified ai_commerce_seller_kyc row as deleted by setting the
 * deleted_at timestamp. Only admins may perform this operation. If the record
 * is already deleted, or has a status that prohibits deletion, an error is
 * thrown.
 *
 * @param props - Request parameters and authenticated admin context
 * @param props.admin - Authenticated admin payload
 * @param props.sellerKycId - UUID of the seller KYC record to delete
 * @returns Void
 * @throws {Error} When seller KYC does not exist, already deleted, or under
 *   legal hold/investigation
 */
export async function deleteaiCommerceAdminSellerKycSellerKycId(props: {
  admin: AdminPayload;
  sellerKycId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, sellerKycId } = props;
  // Fetch the seller KYC row for business/soft-delete checks
  const kyc = await MyGlobal.prisma.ai_commerce_seller_kyc.findFirst({
    where: { id: sellerKycId },
  });
  if (!kyc) {
    throw new Error("Seller KYC record not found");
  }
  if (kyc.deleted_at !== null) {
    throw new Error("This KYC record is already deleted");
  }
  // Enforce business: cannot delete while under review or legal lock
  const prohibited = ["under_investigation", "legal_hold"];
  if (prohibited.includes(kyc.kyc_status)) {
    throw new Error(
      "Cannot delete KYC record under investigation or legal hold",
    );
  }
  // Mark as deleted (soft delete)
  await MyGlobal.prisma.ai_commerce_seller_kyc.update({
    where: { id: sellerKycId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
