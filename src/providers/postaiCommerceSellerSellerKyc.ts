import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerKyc";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new seller KYC verification submission (onboarding, compliance).
 *
 * Creates a new seller KYC (Know Your Customer) record in the
 * ai_commerce_seller_kyc table. This function can only be used by authenticated
 * sellers for their own onboarding context; sellers cannot submit KYC records
 * for other users. All domain constraints and schema rules are enforced.
 *
 * @param props - Properties for KYC creation
 * @param props.seller - Authenticated seller payload (may only create KYC for
 *   their user_id)
 * @param props.body - KYC details (user_id, onboarding_id, kyc_status, optional
 *   document fields)
 * @returns Newly created KYC record, including all fields and audit metadata
 * @throws {Error} If seller attempts to create a KYC for another user_id
 */
export async function postaiCommerceSellerSellerKyc(props: {
  seller: SellerPayload;
  body: IAiCommerceSellerKyc.ICreate;
}): Promise<IAiCommerceSellerKyc> {
  const { seller, body } = props;
  if (seller.id !== body.user_id) {
    throw new Error(
      "Forbidden: You may only submit KYC for your own onboarding/user_id.",
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.ai_commerce_seller_kyc.create({
    data: {
      id: id,
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
    document_type: created.document_type,
    document_metadata: created.document_metadata,
    verification_notes: created.verification_notes,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
