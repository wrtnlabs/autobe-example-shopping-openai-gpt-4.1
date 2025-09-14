import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductLegalCompliance } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductLegalCompliance";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putaiCommerceAdminProductsProductIdLegalCompliance(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductLegalCompliance.IUpdate;
}): Promise<IAiCommerceProductLegalCompliance> {
  const { admin, productId, body } = props;

  // 1. Check if product exists
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new Error("Product not found");
  }
  // 2. Look up existing compliance record (workaround composite unique bug)
  const oldCompliance =
    await MyGlobal.prisma.ai_commerce_product_legal_compliance.findFirst({
      where: {
        product_id: productId,
        compliance_region: body.compliance_region,
      },
    });
  const beforeJson = oldCompliance
    ? JSON.stringify({
        id: oldCompliance.id,
        product_id: oldCompliance.product_id,
        compliance_region: oldCompliance.compliance_region,
        certification_numbers: oldCompliance.certification_numbers ?? null,
        restricted_age: oldCompliance.restricted_age ?? null,
        hazard_flag: oldCompliance.hazard_flag,
        compliance_status: oldCompliance.compliance_status,
        last_reviewed_at: oldCompliance.last_reviewed_at
          ? toISOStringSafe(oldCompliance.last_reviewed_at)
          : null,
        evidence_json: oldCompliance.evidence_json ?? null,
      })
    : null;
  let result;
  if (oldCompliance) {
    // updateMany workaround since no named composite unique exists
    await MyGlobal.prisma.ai_commerce_product_legal_compliance.updateMany({
      where: {
        product_id: productId,
        compliance_region: body.compliance_region,
      },
      data: {
        certification_numbers: body.certification_numbers ?? null,
        restricted_age: body.restricted_age ?? null,
        hazard_flag: body.hazard_flag,
        compliance_status: body.compliance_status,
        last_reviewed_at: body.last_reviewed_at
          ? toISOStringSafe(body.last_reviewed_at)
          : null,
        evidence_json: body.evidence_json ?? null,
      },
    });
    // fetch updated row
    result =
      await MyGlobal.prisma.ai_commerce_product_legal_compliance.findFirst({
        where: {
          product_id: productId,
          compliance_region: body.compliance_region,
        },
      });
    if (!result) {
      throw new Error("Failed to update or fetch updated compliance info");
    }
  } else {
    result = await MyGlobal.prisma.ai_commerce_product_legal_compliance.create({
      data: {
        id: v4(),
        product_id: productId,
        compliance_region: body.compliance_region,
        certification_numbers: body.certification_numbers ?? null,
        restricted_age: body.restricted_age ?? null,
        hazard_flag: body.hazard_flag,
        compliance_status: body.compliance_status,
        last_reviewed_at: body.last_reviewed_at
          ? toISOStringSafe(body.last_reviewed_at)
          : null,
        evidence_json: body.evidence_json ?? null,
      },
    });
  }
  // 4. Write audit log
  try {
    await MyGlobal.prisma.ai_commerce_product_audit_logs.create({
      data: {
        id: v4(),
        product_id: productId,
        event_type: oldCompliance ? "UPDATE_COMPLIANCE" : "CREATE_COMPLIANCE",
        actor_id: admin.id,
        before_json: beforeJson,
        after_json: JSON.stringify({
          id: result.id,
          product_id: result.product_id,
          compliance_region: result.compliance_region,
          certification_numbers: result.certification_numbers ?? null,
          restricted_age: result.restricted_age ?? null,
          hazard_flag: result.hazard_flag,
          compliance_status: result.compliance_status,
          last_reviewed_at: result.last_reviewed_at
            ? toISOStringSafe(result.last_reviewed_at)
            : null,
          evidence_json: result.evidence_json ?? null,
        }),
        created_at: toISOStringSafe(new Date()),
      },
    });
  } catch (_) {
    // Swallow errors writing audit log (non-fatal)
  }
  return {
    id: result.id,
    product_id: result.product_id,
    compliance_region: result.compliance_region,
    certification_numbers: result.certification_numbers ?? null,
    restricted_age: result.restricted_age ?? null,
    hazard_flag: result.hazard_flag,
    compliance_status: result.compliance_status,
    last_reviewed_at: result.last_reviewed_at
      ? toISOStringSafe(result.last_reviewed_at)
      : null,
    evidence_json: result.evidence_json ?? null,
  };
}
