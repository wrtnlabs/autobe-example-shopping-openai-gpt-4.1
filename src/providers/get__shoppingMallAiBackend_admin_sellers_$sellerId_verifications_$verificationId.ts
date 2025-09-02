import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific seller verification record (admin-only).
 *
 * Retrieves a single seller verification record's complete detail, identified
 * by the seller and specific verification UUIDs. Reveals all compliance
 * evidence, submission and review state, reference document URI, and change
 * history for regulatory workflows. Accessible only to administrative roles for
 * audit purposes.
 *
 * Exclusively for use by admins for evidentiary and regulatory workflows.
 * Unauthorized access is blocked with a policy violation error. Existence of
 * both seller and verification records is checked, with 404 for invalid
 * identifiers.
 *
 * @param props - Request object containing authentication and path parameters
 * @param props.admin - AdminPayload: Authentication for system administrators
 *   (must have type === 'admin')
 * @param props.sellerId - String & tags.Format<'uuid'>: UUID of the seller
 *   whose verification is retrieved
 * @param props.verificationId - String & tags.Format<'uuid'>: UUID of the
 *   verification record to retrieve
 * @returns The full seller verification record with evidence and timestamps
 *   (IShoppingMallAiBackendSellerVerification)
 * @throws {Error} If not authorized as admin
 * @throws {Error} If the verification record is not found for the given seller
 *   and verification IDs
 */
export async function get__shoppingMallAiBackend_admin_sellers_$sellerId_verifications_$verificationId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendSellerVerification> {
  const { admin, sellerId, verificationId } = props;
  // Authorization: Explicitly check admin type
  if (!admin || admin.type !== "admin") {
    throw new Error("Unauthorized: Admin privileges required");
  }
  const verification =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_verifications.findFirst(
      {
        where: { id: verificationId, seller_id: sellerId },
        select: {
          id: true,
          seller_id: true,
          verification_type: true,
          status: true,
          document_uri: true,
          submitted_at: true,
          verified_at: true,
        },
      },
    );
  if (!verification) {
    throw new Error("Verification record not found");
  }
  return {
    id: verification.id,
    seller_id: verification.seller_id,
    verification_type: verification.verification_type,
    status: verification.status,
    document_uri: verification.document_uri,
    submitted_at: toISOStringSafe(verification.submitted_at),
    verified_at:
      verification.verified_at !== null &&
      verification.verified_at !== undefined
        ? toISOStringSafe(verification.verified_at)
        : null,
  };
}
