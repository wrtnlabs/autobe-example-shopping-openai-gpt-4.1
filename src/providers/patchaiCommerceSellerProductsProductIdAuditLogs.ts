import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductAuditLog";
import { IPageIAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductAuditLog";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and retrieve audit logs of a product (ai_commerce_product_audit_logs).
 *
 * Provides filtered, paginated, and authorized retrieval of audit logs for a
 * specific product. Ensures only the owner seller can access their product's
 * audit trail. Supports advanced filtering by event type and actor, with robust
 * pagination. Returns a full paginated list of audit events, each detailing
 * before/after state and timestamp. No modification or redaction is performed
 * here; higher-level compliance policies should be enforced at the
 * controller/service layer as needed.
 *
 * @param props - Request object containing seller authentication, productId,
 *   and filter parameters
 * @param props.seller - Authenticated seller's payload (role: Seller)
 * @param props.productId - UUID of product to retrieve audit logs for
 * @param props.body - IAiCommerceProductAuditLog.IRequest: advanced filter and
 *   pagination
 * @returns IPageIAiCommerceProductAuditLog - paginated audit logs conforming to
 *   strict DTO typing
 * @throws {Error} If product does not exist or seller is not authorized to
 *   access audit logs
 */
export async function patchaiCommerceSellerProductsProductIdAuditLogs(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductAuditLog.IRequest;
}): Promise<IPageIAiCommerceProductAuditLog> {
  // 1. Ownership validation: must be seller's product
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: props.productId, seller_id: props.seller.id },
  });
  if (!product) {
    throw new Error(
      "Unauthorized: Product not found or does not belong to seller",
    );
  }

  // 2. Build filter for audit logs based on API contract and parameter rules
  const filter: Record<string, unknown> = {
    product_id: props.productId,
    ...(props.body.event_type !== undefined &&
      props.body.event_type !== null && { event_type: props.body.event_type }),
    ...(props.body.actor_id !== undefined &&
      props.body.actor_id !== null && { actor_id: props.body.actor_id }),
  };

  // 3. Pagination calculation and normalization
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 4. Query total count for pagination
  const total = await MyGlobal.prisma.ai_commerce_product_audit_logs.count({
    where: filter,
  });

  // 5. Retrieve paginated results
  const logs = await MyGlobal.prisma.ai_commerce_product_audit_logs.findMany({
    where: filter,
    orderBy: { created_at: "desc" },
    skip,
    take: Number(limit),
  });

  // 6. Map DB models to IAiCommerceProductAuditLog DTO structure
  const data: IAiCommerceProductAuditLog[] = logs.map((log) => ({
    id: log.id,
    product_id: log.product_id,
    event_type: log.event_type,
    actor_id: log.actor_id,
    before_json: log.before_json === null ? undefined : log.before_json,
    after_json: log.after_json === null ? undefined : log.after_json,
    created_at: toISOStringSafe(log.created_at),
  }));

  // 7. Return strict paginated output as IPageIAiCommerceProductAuditLog
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
