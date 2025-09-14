import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerKyc";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves the detailed KYC (Know Your Customer) record for a specific seller
 * KYC application by its unique ID.
 *
 * This operation allows authorized administrators or compliance staff to view
 * the full KYC record from the ai_commerce_seller_kyc table during compliance
 * reviews, audits, or forensic investigations. The returned data includes all
 * KYC fields, document metadata, reviewer notes, status, and precise
 * timestamps, ensuring rigorous type and privacy compliance.
 *
 * Authorization is enforced via the admin parameter and access control
 * decorators. Any attempt to access a non-existent record or insufficient
 * permissions results in an error. All date fields are returned as
 * ISO-formatted strings, and nullable/optional fields are normalized for API
 * contract fidelity.
 *
 * @param props - Properties required for retrieval
 * @param props.admin - Authenticated administrator context
 * @param props.sellerKycId - Unique identifier for the seller KYC record
 * @returns Full seller KYC record conforming to IAiCommerceSellerKyc
 * @throws {Error} If the KYC record does not exist, or access is denied
 */
export async function getaiCommerceAdminSellerKycSellerKycId(props: {
  admin: AdminPayload;
  sellerKycId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSellerKyc> {
  const kyc = await MyGlobal.prisma.ai_commerce_seller_kyc.findUniqueOrThrow({
    where: { id: props.sellerKycId },
    select: {
      id: true,
      user_id: true,
      onboarding_id: true,
      kyc_status: true,
      document_type: true,
      document_metadata: true,
      verification_notes: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: kyc.id,
    user_id: kyc.user_id,
    onboarding_id: kyc.onboarding_id,
    kyc_status: kyc.kyc_status,
    document_type: kyc.document_type ?? undefined,
    document_metadata: kyc.document_metadata ?? undefined,
    verification_notes: kyc.verification_notes ?? undefined,
    created_at: toISOStringSafe(kyc.created_at),
    updated_at: toISOStringSafe(kyc.updated_at),
    deleted_at:
      kyc.deleted_at != null ? toISOStringSafe(kyc.deleted_at) : undefined,
  };
}
