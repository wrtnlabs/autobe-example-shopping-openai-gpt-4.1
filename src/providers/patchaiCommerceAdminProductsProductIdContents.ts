import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import { IPageIAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductContent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and paginate content records for a product from
 * ai_commerce_product_contents
 *
 * Retrieves a filtered and paginated list of product content records for a
 * specified product. Allows admins to search, sort, and page through structured
 * content blocks (description, spec, etc) per business rules. Ensures product
 * existence, applies advanced filtering, sorting, and delivers
 * IPageIAiCommerceProductContent for UI.
 *
 * @param props - Admin: Authenticated admin payload (authorization enforced
 *   upstream) productId: UUID string & tags.Format<'uuid'> of the target
 *   product body: IAiCommerceProductContent.IRequest - filtering, searching,
 *   and pagination criteria
 * @returns Paginated summary with IPageIAiCommerceProductContent for list UIs
 * @throws Error if the product does not exist or is soft-deleted
 */
export async function patchaiCommerceAdminProductsProductIdContents(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductContent.IRequest;
}): Promise<IPageIAiCommerceProductContent> {
  const { productId, body } = props;
  // 1. Verify product exists (not soft-deleted)
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId, deleted_at: null },
    select: { id: true },
  });
  if (!product) throw new Error("Product not found");
  // 2. Prepare pagination variables
  const page = typeof body.page === "number" ? Number(body.page) : 0;
  const limit = typeof body.limit === "number" ? Number(body.limit) : 20;
  const skip = page * limit;
  // 3. Dynamic filters
  const where = {
    product_id: productId,
    deleted_at: null,
    ...(body.content_type !== undefined && { content_type: body.content_type }),
    ...(body.format !== undefined && { format: body.format }),
    ...(body.locale !== undefined && { locale: body.locale }),
    ...(typeof body.search === "string" &&
      body.search.length > 0 && {
        content_body: { contains: body.search },
      }),
  };
  // 4. Sorting (safe fields only)
  const allowedSortFields = [
    "content_type",
    "format",
    "locale",
    "display_order",
    "id",
  ];
  const sortKey =
    typeof body.sortBy === "string" && allowedSortFields.includes(body.sortBy)
      ? body.sortBy
      : "display_order";
  const sortOrder = body.order === "desc" ? "desc" : "asc";
  // 5. Query rows and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_contents.findMany({
      where,
      orderBy: { [sortKey]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_contents.count({ where }),
  ]);
  // 6. Map rows to DTOs
  const data = rows.map((row) => {
    const obj: IAiCommerceProductContent = {
      id: row.id,
      product_id: row.product_id,
      content_type: row.content_type,
      format: row.format,
      content_body: row.content_body,
      display_order: row.display_order,
    };
    if (row.locale !== undefined) {
      if (row.locale === null) obj.locale = null;
      else obj.locale = row.locale;
    }
    return obj;
  });
  // 7. Compose pagination data
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(Number(total) / (limit === 0 ? 1 : Number(limit))),
  };
  return {
    pagination,
    data,
  };
}
