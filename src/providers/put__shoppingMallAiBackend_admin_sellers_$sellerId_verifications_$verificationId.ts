import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a seller's verification record (admin-only).
 *
 * Updates the verification_type, status, document_uri, or verified_at fields
 * for an existing seller verification record, identified by both sellerId and
 * verificationId. Only admin users can invoke this operation. All changes are
 * audit-tracked and compliant.
 *
 * @param props - Request parameter object
 * @param props.admin - The authenticated admin making this request
 * @param props.sellerId - UUID of the seller for whom the verification is being
 *   updated
 * @param props.verificationId - UUID of the verification record to update
 * @param props.body - New values for the verification record (type, status,
 *   URI, etc.)
 * @returns The updated verification record as
 *   IShoppingMallAiBackendSellerVerification, with all date fields as ISO
 *   strings
 * @throws {Error} If the verification record does not exist or does not match
 *   the specified seller
 */
export async function put__shoppingMallAiBackend_admin_sellers_$sellerId_verifications_$verificationId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  verificationId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendSellerVerification.IUpdate;
}): Promise<IShoppingMallAiBackendSellerVerification> {
  const { admin, sellerId, verificationId, body } = props;

  // Fetch and validate the seller verification record
  const verification =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_verifications.findUnique(
      {
        where: { id: verificationId },
      },
    );
  if (!verification || verification.seller_id !== sellerId) {
    throw new Error(
      "Seller verification record not found for the specified seller.",
    );
  }
  // Prepare updated fields: only include them if present in body
  //   - For verified_at, if undefined: skip update, if null: set null, if string: toISOStringSafe
  //   - For the other updatable fields, use undefined if missing
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_verifications.update({
      where: { id: verificationId },
      data: {
        verification_type: body.verification_type ?? undefined,
        status: body.status ?? undefined,
        document_uri: body.document_uri ?? undefined,
        verified_at:
          body.verified_at === undefined
            ? undefined
            : body.verified_at === null
              ? null
              : toISOStringSafe(body.verified_at),
      },
    });
  // Return with proper ISO date conversion for all date fields
  return {
    id: updated.id,
    seller_id: updated.seller_id,
    verification_type: updated.verification_type,
    status: updated.status,
    document_uri: updated.document_uri,
    submitted_at: toISOStringSafe(updated.submitted_at),
    verified_at:
      updated.verified_at !== null && updated.verified_at !== undefined
        ? toISOStringSafe(updated.verified_at)
        : null,
  };
}
