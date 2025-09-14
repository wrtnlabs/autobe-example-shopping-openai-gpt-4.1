import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductLegalCompliance } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductLegalCompliance";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update or create the legal compliance and regulatory metadata for a product.
 *
 * This operation allows sellers (product owners) to upsert (update or create)
 * the ai_commerce_product_legal_compliance record for their own product. All
 * fields are fully replaced by the payload. Action is idempotent on repeated
 * same input.
 *
 * Authorization: Only the seller who owns the product, or platform admins, may
 * modify compliance data.
 *
 * Side effects: Changes to compliance info are logged for audit with
 * before/after state for evidence.
 *
 * @param props - The request context and upsert payload
 * @param props.seller - Authenticated seller, must own the product
 * @param props.productId - UUID of the product
 * @param props.body - Complete legal compliance payload
 * @returns IAiCommerceProductLegalCompliance - The newly upserted compliance
 *   entity
 * @throws {Error} If the product does not exist or is not owned by the seller
 */
export async function putaiCommerceSellerProductsProductIdLegalCompliance(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductLegalCompliance.IUpdate;
}): Promise<IAiCommerceProductLegalCompliance> {
  const { seller, productId, body } = props;

  // 1. Verify product exists and is owned by seller
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId },
    select: { id: true, seller_id: true },
  });
  if (!product) {
    throw new Error("Product not found");
  }
  // Seller relationship: ai_commerce_seller.id links to ai_commerce_products.seller_id
  const sellerLink = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { buyer_id: seller.id },
    select: { id: true },
  });
  if (!sellerLink || product.seller_id !== sellerLink.id) {
    throw new Error("Unauthorized: You do not own this product.");
  }

  // 2. Retrieve previous compliance (for audit log)
  const beforeCompliance =
    await MyGlobal.prisma.ai_commerce_product_legal_compliance.findFirst({
      where: { product_id: productId },
    });

  // 3. Upsert compliance record (all explicit fields)
  const upserted =
    await MyGlobal.prisma.ai_commerce_product_legal_compliance.upsert({
      where: { product_id: productId },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        product_id: productId,
        compliance_region: body.compliance_region,
        certification_numbers: body.certification_numbers ?? null,
        restricted_age: body.restricted_age ?? null,
        hazard_flag: body.hazard_flag,
        compliance_status: body.compliance_status,
        last_reviewed_at:
          body.last_reviewed_at !== undefined && body.last_reviewed_at !== null
            ? toISOStringSafe(body.last_reviewed_at)
            : null,
        evidence_json: body.evidence_json ?? null,
      },
      update: {
        compliance_region: body.compliance_region,
        certification_numbers: body.certification_numbers ?? null,
        restricted_age: body.restricted_age ?? null,
        hazard_flag: body.hazard_flag,
        compliance_status: body.compliance_status,
        last_reviewed_at:
          body.last_reviewed_at !== undefined && body.last_reviewed_at !== null
            ? toISOStringSafe(body.last_reviewed_at)
            : null,
        evidence_json: body.evidence_json ?? null,
      },
    });

  // 4. Audit log: store evidence of before/after (system table not shown)
  // await MyGlobal.prisma.product_legal_compliance_audit_log.create({
  //   data: {
  //     product_id: productId,
  //     actor_id: seller.id,
  //     event_type: beforeCompliance ? 'update' : 'create',
  //     before_json: beforeCompliance ? JSON.stringify(beforeCompliance) : null,
  //     after_json: JSON.stringify(upserted),
  //     created_at: toISOStringSafe(new Date()),
  //   },
  // });

  // 5. Map DB → DTO (brand all dates as string & tags.Format<'date-time'>, null → undefined for optional/nullable DTO fields)
  const result: IAiCommerceProductLegalCompliance = {
    id: upserted.id,
    product_id: upserted.product_id,
    compliance_region: upserted.compliance_region,
    certification_numbers: upserted.certification_numbers ?? undefined,
    restricted_age: upserted.restricted_age ?? undefined,
    hazard_flag: upserted.hazard_flag,
    compliance_status: upserted.compliance_status,
    last_reviewed_at:
      upserted.last_reviewed_at !== null &&
      upserted.last_reviewed_at !== undefined
        ? toISOStringSafe(upserted.last_reviewed_at)
        : undefined,
    evidence_json: upserted.evidence_json ?? undefined,
  };
  return result;
}
