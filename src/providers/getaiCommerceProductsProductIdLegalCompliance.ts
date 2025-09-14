import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductLegalCompliance } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductLegalCompliance";

/**
 * Fetch legal and compliance information for a specific product from
 * ai_commerce_product_legal_compliance.
 *
 * Retrieves the legal and compliance metadata entity associated with the given
 * productId from the database. If compliance data does not exist for the target
 * product, returns an object with required fields populated and optional fields
 * left undefined. All users (public endpoint) are permitted to call this
 * method. All date/datetime values are returned as ISO 8601 strings. No
 * authentication is required.
 *
 * @param props - Parameters for this operation
 * @param props.productId - Unique identifier for the product to fetch legal
 *   compliance data for
 * @returns The IAiCommerceProductLegalCompliance entity for the product if
 *   registered; otherwise, a blank/default entity (fields may be
 *   omitted/undefined if compliance data is not found)
 */
export async function getaiCommerceProductsProductIdLegalCompliance(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductLegalCompliance> {
  const record =
    await MyGlobal.prisma.ai_commerce_product_legal_compliance.findFirst({
      where: { product_id: props.productId },
    });
  if (record) {
    return {
      id: record.id,
      product_id: record.product_id,
      compliance_region: record.compliance_region,
      certification_numbers: record.certification_numbers ?? undefined,
      restricted_age: record.restricted_age ?? undefined,
      hazard_flag: record.hazard_flag,
      compliance_status: record.compliance_status,
      last_reviewed_at: record.last_reviewed_at
        ? toISOStringSafe(record.last_reviewed_at)
        : undefined,
      evidence_json: record.evidence_json ?? undefined,
    };
  }
  return {
    id: v4(),
    product_id: props.productId,
    compliance_region: "",
    hazard_flag: false,
    compliance_status: "",
  };
}
