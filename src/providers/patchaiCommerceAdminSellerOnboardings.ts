import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerOnboarding";
import { IPageIAiCommerceSellerOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerOnboarding";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve paginated/searchable seller onboarding application list
 * (ai_commerce_seller_onboarding table).
 *
 * This endpoint allows admins to search, filter, and paginate seller onboarding
 * applications for review and compliance workflow. Supports filtering by
 * onboarding_status, created_at date range, user/store references, and keyword
 * search in application_data. Pagination and sorting are returned for dashboard
 * list views. Results omit KYC/sensitive data and only active (not
 * soft-deleted) applications unless deleted_at is explicitly non-null.
 *
 * @param props - Provider properties
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Search filters and pagination controls for onboarding
 *   applications
 * @returns Paged list of seller onboarding application summaries, with
 *   pagination meta
 * @throws {Error} If admin authentication is invalid or any Prisma error occurs
 */
export async function patchaiCommerceAdminSellerOnboardings(props: {
  admin: AdminPayload;
  body: IAiCommerceSellerOnboarding.IRequest;
}): Promise<IPageIAiCommerceSellerOnboarding.ISummary> {
  const { body } = props;
  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where filter directly for type safety, exclude undefined/null values for required fields
  // Date range for created_at
  const createdAtRange =
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {};

  // Query both paginated list and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_seller_onboarding.findMany({
      where: {
        deleted_at: null,
        ...(body.onboarding_status !== undefined &&
          body.onboarding_status !== null && {
            onboarding_status: body.onboarding_status,
          }),
        ...(body.user_id !== undefined &&
          body.user_id !== null && { user_id: body.user_id }),
        ...(body.store_id !== undefined &&
          body.store_id !== null && { store_id: body.store_id }),
        ...createdAtRange,
        ...(body.search !== undefined &&
          body.search !== null && {
            application_data: { contains: body.search },
          }),
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_seller_onboarding.count({
      where: {
        deleted_at: null,
        ...(body.onboarding_status !== undefined &&
          body.onboarding_status !== null && {
            onboarding_status: body.onboarding_status,
          }),
        ...(body.user_id !== undefined &&
          body.user_id !== null && { user_id: body.user_id }),
        ...(body.store_id !== undefined &&
          body.store_id !== null && { store_id: body.store_id }),
        ...createdAtRange,
        ...(body.search !== undefined &&
          body.search !== null && {
            application_data: { contains: body.search },
          }),
      },
    }),
  ]);

  // Map DB records to DTO with proper date string conversion
  const data = rows.map((row) => {
    return {
      id: row.id,
      user_id: row.user_id,
      store_id: row.store_id === null ? null : row.store_id,
      onboarding_status: row.onboarding_status,
      current_stage: row.current_stage === null ? null : row.current_stage,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
