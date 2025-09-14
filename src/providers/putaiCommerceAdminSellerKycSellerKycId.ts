import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerKyc";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing seller KYC verification record for compliance review.
 *
 * Updates the status, document details, or compliance notes of a seller's KYC
 * (Know Your Customer) submission during onboarding or compliance review. Only
 * authorized admins can perform this operation. All changes are fully audited
 * for legal evidence. Returns the updated IAiCommerceSellerKyc DTO reflecting
 * all business and privacy rules, with all date fields as ISO 8601 strings.
 *
 * @param props - Request object
 * @param props.admin - Authenticated admin payload (must have active admin
 *   privileges)
 * @param props.sellerKycId - Unique identifier of the seller KYC record to
 *   update (UUID format)
 * @param props.body - Fields and values to update as
 *   IAiCommerceSellerKyc.IUpdate
 * @returns Updated IAiCommerceSellerKyc DTO reflecting all changes
 * @throws {Error} If the seller KYC record does not exist or is inaccessible
 */
export async function putaiCommerceAdminSellerKycSellerKycId(props: {
  admin: AdminPayload;
  sellerKycId: string & tags.Format<"uuid">;
  body: IAiCommerceSellerKyc.IUpdate;
}): Promise<IAiCommerceSellerKyc> {
  const { sellerKycId, body } = props;

  // Fetch the existing KYC record to ensure it exists
  const existing = await MyGlobal.prisma.ai_commerce_seller_kyc.findUnique({
    where: { id: sellerKycId },
  });
  if (!existing) throw new Error("Seller KYC not found");

  // Prepare fields to update (skip any missing in body), update timestamp
  const updated = await MyGlobal.prisma.ai_commerce_seller_kyc.update({
    where: { id: sellerKycId },
    data: {
      ...(body.kyc_status !== undefined && { kyc_status: body.kyc_status }),
      ...(body.document_type !== undefined && {
        document_type: body.document_type,
      }),
      ...(body.document_metadata !== undefined && {
        document_metadata: body.document_metadata,
      }),
      ...(body.verification_notes !== undefined && {
        verification_notes: body.verification_notes,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    onboarding_id: updated.onboarding_id,
    kyc_status: updated.kyc_status,
    document_type: updated.document_type ?? undefined,
    document_metadata: updated.document_metadata ?? undefined,
    verification_notes: updated.verification_notes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
