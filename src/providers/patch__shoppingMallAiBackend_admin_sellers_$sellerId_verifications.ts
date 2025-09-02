import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";
import { IPageIShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSellerVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search verification records for a seller (admin-only).
 *
 * Allows administrators to retrieve a paginated and filterable list of all
 * verification records for a specific seller account, including KYC/KYB
 * evidence, type, status, and timestamps. Operates on
 * shopping_mall_ai_backend_seller_verifications, with optional filtering by
 * type/status for regulatory workflows. Supports deep compliance review and
 * onboarding state management. Access is limited to admin users.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation (must
 *   have an active admin session)
 * @param props.sellerId - UUID of the seller account for which to list
 *   verifications
 * @param props.body - Filter, pagination, and search criteria for the seller's
 *   verification records
 * @returns Paginated list of seller verification evidence for review or audit
 * @throws {Error} When the seller does not exist (404 Not Found)
 * @throws {Error} When database or internal error occurs
 */
export async function patch__shoppingMallAiBackend_admin_sellers_$sellerId_verifications(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendSellerVerification.IRequest;
}): Promise<IPageIShoppingMallAiBackendSellerVerification> {
  const { admin, sellerId, body } = props;

  // Step 1. Confirm seller exists
  const seller =
    await MyGlobal.prisma.shopping_mall_ai_backend_sellers.findUnique({
      where: { id: sellerId },
    });
  if (!seller) {
    throw new Error("Seller not found");
  }

  // Step 2. Build filter (required: seller_id, optional: status/type/date)
  const filter = {
    seller_id: sellerId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.verification_type !== undefined &&
      body.verification_type !== null && {
        verification_type: body.verification_type,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          submitted_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Step 3. Pagination defaults (page=1, limit=20) with min/max clamping
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
  const limit = Number(rawLimit) > 0 ? Number(rawLimit) : 20;
  const skip = (page - 1) * limit;

  // Step 4. Query records and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_seller_verifications.findMany({
      where: filter,
      orderBy: { submitted_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_seller_verifications.count({
      where: filter,
    }),
  ]);

  // Step 5. Map results to strict DTO, converting all date fields with toISOStringSafe, handling nullable dates
  const data = rows.map((row) => ({
    id: row.id,
    seller_id: row.seller_id,
    verification_type: row.verification_type,
    status: row.status,
    document_uri: row.document_uri,
    submitted_at: toISOStringSafe(row.submitted_at),
    verified_at: row.verified_at ? toISOStringSafe(row.verified_at) : null,
  }));

  // Step 6. Formulate pagination DTO (all fields strictly conform, use Number conversion for int32 brand)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
