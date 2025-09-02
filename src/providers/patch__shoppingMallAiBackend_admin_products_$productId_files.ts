import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import { IPageIShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductFile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated and optionally filtered list of files attached to a
 * product, supporting AI-powered shopping mall scenarios such as multi-image
 * product pages, asset management, and rich content experiences.
 *
 * This operation is crucial for both sellers and channel administrators to
 * visualize, audit, or update the product's media assets. The endpoint is based
 * on the shopping_mall_ai_backend_product_files table and respects visibility
 * rules as well as soft deletion status. It allows abuse-resistant search,
 * filtering by file type or display order, and supports future extensions for
 * AI-driven content recommendations or moderation.
 *
 * @param props - Request context
 * @param props.admin - AdminPayload for authorization
 * @param props.productId - Target product id (uuid)
 * @param props.body - Filter, pagination, sort parameters
 * @returns Paginated list of product file summaries.
 * @throws {Error} If product does not exist or other system/database errors.
 */
export async function patch__shoppingMallAiBackend_admin_products_$productId_files(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductFile.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductFile> {
  const { admin, productId, body } = props;

  // 1. Confirm product exists (throws if missing)
  await MyGlobal.prisma.shopping_mall_ai_backend_products.findUniqueOrThrow({
    where: { id: productId },
    select: { id: true },
  });

  // 2. Construct where clause with non-deleted and scoped to target product
  const where = {
    shopping_mall_ai_backend_products_id: productId,
    deleted_at: null,
    ...(body.file_type !== undefined && { file_type: body.file_type }),
    ...(body.display_order !== undefined && {
      display_order: body.display_order,
    }),
    ...(body.is_primary !== undefined && { is_primary: body.is_primary }),
  };

  // 3. Compose orderBy
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const [field, direction] = body.sort.split(":");
    const allowedFields = ["created_at", "display_order"];
    const allowedDirections = ["asc", "desc"];
    if (
      allowedFields.includes(field) &&
      allowedDirections.includes(direction)
    ) {
      orderBy = { [field]: direction as "asc" | "desc" };
    }
  }

  // 4. Pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 5. Query for results and count
  const [files, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_files.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_files.count({ where }),
  ]);

  // 6. Map to summary objects
  const data = files.map((f) => ({
    id: f.id as string & tags.Format<"uuid">,
    file_uri: f.file_uri,
    file_type: f.file_type,
    is_primary: f.is_primary,
    display_order: f.display_order as number & tags.Type<"int32">,
  }));

  // 7. Build pagination structure
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
