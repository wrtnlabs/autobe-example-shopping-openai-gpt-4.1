import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerKyc";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new seller KYC verification submission (onboarding, compliance).
 *
 * Creates a new seller KYC (Know Your Customer) verification submission in the
 * ai_commerce_seller_kyc table. This is used by sellers or authorized
 * onboarding actors to submit new KYC documentation for compliance verification
 * during or after onboarding. Stores all document metadata, KYC status, and
 * audit fields for subsequent review and approval workflow.
 *
 * This API operation allows a seller or an authorized onboarding workflow to
 * create a new KYC submission by providing necessary KYC data in the request
 * body. The sent data includes details like document type, provided metadata,
 * and onboarding references, as required by the ai_commerce_seller_kyc schema.
 *
 * Upon submission, the record is stored with status field set to a
 * workflow-appropriate initial value (such as 'pending'). Further processing,
 * review, or approval will follow according to compliance workflow. All fields
 * and relationships from the schema must be supplied.
 *
 * This operation can be used by the onboarding automation system or authorized
 * sellers. Access control should prevent unauthorized KYC creation by limiting
 * to sellers in the onboarding stage or admins acting on behalf of applicants.
 *
 * @param props - Parameters for KYC creation
 * @param props.admin - Authenticated administrator role (AdminPayload)
 * @param props.body - KYC creation payload (IAiCommerceSellerKyc.ICreate)
 * @returns The newly created seller KYC record, fully populated per schema
 * @throws {Error} If the database operation fails
 */
export async function postaiCommerceAdminSellerKyc(props: {
  admin: AdminPayload;
  body: IAiCommerceSellerKyc.ICreate;
}): Promise<IAiCommerceSellerKyc> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_seller_kyc.create({
    data: {
      id: v4(),
      user_id: body.user_id,
      onboarding_id: body.onboarding_id,
      kyc_status: body.kyc_status,
      document_type: body.document_type ?? null,
      document_metadata: body.document_metadata ?? null,
      verification_notes: body.verification_notes ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    user_id: created.user_id,
    onboarding_id: created.onboarding_id,
    kyc_status: created.kyc_status,
    document_type: created.document_type ?? undefined,
    document_metadata: created.document_metadata ?? undefined,
    verification_notes: created.verification_notes ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
