import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductBundle";
import { IPageIAiCommerceProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductBundle";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a paginated list of bundles for a specific product owned by the
 * seller.
 *
 * This function allows an authenticated seller to view all product bundles
 * (composite products) associated with one of their products. Sellers must own
 * the product in question—otherwise, access is denied. Supports advanced
 * filtering, sorting, and pagination by status, name, and other bundle
 * metadata.
 *
 * @param props - Object containing seller payload, product ID, and filter/query
 *   parameters.
 * @param props.seller - Authenticated seller payload (must be the product
 *   owner).
 * @param props.productId - UUID of the product whose bundles are being listed.
 * @param props.body - Request body with filtering, sorting, and pagination
 *   fields.
 * @returns Paginated summary results for all bundles linked to the given
 *   product, according to the filters.
 * @throws {Error} If product does not exist, not owned by seller, or is
 *   soft-deleted; if any DB error occurs.
 */
export async function patchaiCommerceSellerProductsProductIdBundles(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductBundle.IRequest;
}): Promise<IPageIAiCommerceProductBundle.ISummary> {
  const { seller, productId, body } = props;

  // 1. Ownership check: find the product (must not be soft-deleted and owned by seller)
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new Error("Product not found or not owned by seller.");
  }

  // 2. Extract and validate pagination and sorting parameters
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  const skip = (page - 1) * limit;

  // Supported sort fields for bundles (must exist on model)
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "name",
    "status",
    "current_price",
    "bundle_code",
  ];
  const baseSortField = body.sort ?? "created_at";
  const sortField = allowedSortFields.includes(baseSortField)
    ? baseSortField
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // 3. Build filter conditions with strict schema compliance
  const filter: { [key: string]: unknown } = {
    parent_product_id: productId,
    deleted_at: null,
  };
  if (body.status !== undefined && body.status !== null) {
    filter.status = body.status;
  }
  if (body.bundleCode !== undefined && body.bundleCode !== null) {
    filter.bundle_code = body.bundleCode;
  }
  if (body.name !== undefined && body.name !== null) {
    filter.name = { contains: body.name };
  }

  // 4. Query paginated bundles and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_bundles.findMany({
      where: filter,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_bundles.count({ where: filter }),
  ]);

  // 5. Map and assemble summary results fully typed and conformant
  const data = rows.map(
    (bundle): IAiCommerceProductBundle.ISummary => ({
      id: bundle.id,
      bundle_code: bundle.bundle_code,
      name: bundle.name,
      status: bundle.status,
      current_price: bundle.current_price,
      created_at: toISOStringSafe(bundle.created_at),
      updated_at: toISOStringSafe(bundle.updated_at),
    }),
  );

  // 6. Return paginated response structure
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
