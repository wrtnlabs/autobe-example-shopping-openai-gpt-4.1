import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { IPageIShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of all products with advanced filtering
 * and search.
 *
 * This API enables authenticated sellers and administrators to retrieve a
 * comprehensive, paginated, and filterable list of products in the marketplace.
 * Advanced search criteria include product title, slug, product_type,
 * business_status (draft, active, paused, etc.), category membership, and
 * full-text search on title and description.
 *
 * Results may be sorted by last updated, creation time, popularity, or business
 * priority, and can be used for both administrative management and
 * seller-centric product portfolios. Response format may include only summary
 * product attributes for efficiency. Sensitive/unpublished records may be
 * scoped for admin users only as per business policy.
 *
 * This endpoint is essential for catalog management, bulk operations,
 * analytics, and UI/UX experiences where list retrieval is needed.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication payload (validated via decorator)
 * @param props.body - Filtering, searching, sorting, and pagination parameters
 * @returns Paginated and filtered product list meeting search criteria
 * @throws {Error} When underlying DB or logic error occurs, or invalid
 *   parameters are given
 */
export async function patch__shoppingMallAiBackend_admin_products(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendProduct.IRequest;
}): Promise<IPageIShoppingMallAiBackendProduct.ISummary> {
  const { admin, body } = props;
  // Pagination with 1-based index (default page=1, limit=20)
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;

  // Allowed sort fields for ordering
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "title",
    "product_type",
    "business_status",
    "tax_code",
    "min_order_quantity",
    "max_order_quantity",
  ];
  const sort_by = allowedSortFields.includes(body.sort_by || "")
    ? body.sort_by!
    : "created_at";
  const sort_dir = body.sort_dir === "asc" ? "asc" : "desc";

  // Query main data and total count in parallel (no intermediate variables for where/orderBy)
  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_products.findMany({
      where: {
        deleted_at: null,
        ...(body.title && {
          title: { contains: body.title, mode: "insensitive" as const },
        }),
        ...(body.product_type && { product_type: body.product_type }),
        ...(body.business_status && { business_status: body.business_status }),
        ...(body.tax_code && { tax_code: body.tax_code }),
      },
      orderBy: { [sort_by]: sort_dir },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        product_type: true,
        business_status: true,
        tax_code: true,
        min_order_quantity: true,
        max_order_quantity: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_products.count({
      where: {
        deleted_at: null,
        ...(body.title && {
          title: { contains: body.title, mode: "insensitive" as const },
        }),
        ...(body.product_type && { product_type: body.product_type }),
        ...(body.business_status && { business_status: body.business_status }),
        ...(body.tax_code && { tax_code: body.tax_code }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: products.map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      product_type: product.product_type,
      business_status: product.business_status,
      tax_code: product.tax_code,
      min_order_quantity: product.min_order_quantity,
      max_order_quantity: product.max_order_quantity,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
    })),
  };
}
