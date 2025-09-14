import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerKyc";
import { IPageIAiCommerceSellerKyc } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerKyc";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list ai_commerce_seller_kyc records (admin, compliance only).
 *
 * This API operation retrieves a paginated and filtered list of seller KYC
 * records from the ai_commerce_seller_kyc table for administrative review and
 * compliance operations. It allows administrators to apply complex filtering on
 * KYC status, document types, onboarding relationships, and creation dates.
 * Pagination is supported for efficient handling of large record sets. Returned
 * results include all KYC fields and are suitable for compliance audit
 * workflows. Authorization is required as admin.
 *
 * @param props - Object containing filter, pagination parameters, and admin
 *   authentication
 * @param props.admin - The authenticated admin making the request
 * @param props.body - The filter/search/pagination parameters for KYC search
 * @returns A paginated list of seller KYC records
 * @throws {Error} If database query fails or if authentication is
 *   missing/invalid
 */
export async function patchaiCommerceAdminSellerKyc(props: {
  admin: AdminPayload;
  body: IAiCommerceSellerKyc.IRequest;
}): Promise<IPageIAiCommerceSellerKyc> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions with proper null/undefined/branding logic
  const where = {
    ...(body.onboarding_id !== undefined && {
      onboarding_id: body.onboarding_id,
    }),
    ...(body.user_id !== undefined && { user_id: body.user_id }),
    ...(body.kyc_status !== undefined && { kyc_status: body.kyc_status }),
    ...(body.document_type !== undefined && {
      document_type: body.document_type,
    }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_seller_kyc.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_seller_kyc.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: items.map((item) => {
      const base = {
        id: item.id,
        user_id: item.user_id,
        onboarding_id: item.onboarding_id,
        kyc_status: item.kyc_status,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
      };
      const out: IAiCommerceSellerKyc = {
        ...base,
        ...(item.document_type !== undefined && item.document_type !== null
          ? { document_type: item.document_type }
          : {}),
        ...(item.document_metadata !== undefined &&
        item.document_metadata !== null
          ? { document_metadata: item.document_metadata }
          : {}),
        ...(item.verification_notes !== undefined &&
        item.verification_notes !== null
          ? { verification_notes: item.verification_notes }
          : {}),
        ...(item.deleted_at !== undefined
          ? {
              deleted_at: item.deleted_at
                ? toISOStringSafe(item.deleted_at)
                : null,
            }
          : {}),
      };
      return out;
    }),
  };
}
