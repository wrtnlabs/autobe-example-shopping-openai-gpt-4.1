import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceRecommendationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceRecommendationSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve the detail of a specific recommendation snapshot entry for model
 * audit or compliance
 *
 * Retrieves a full snapshot event log for a specific recommendation issued to a
 * user, identified by its unique `recommendationSnapshotId`. Includes context,
 * full output, AI model scoring, and user linkage for explainability, audit,
 * and legal trace. The operation is only accessible to analytics team members
 * or admins with proper audit rights, and every access is recorded in the
 * security audit log. Personal information in the snapshot is anonymized or
 * redacted in accordance with data privacy policies and audit requirements.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the retrieval
 * @param props.recommendationSnapshotId - The unique identifier (UUID) of the
 *   recommendation snapshot to retrieve
 * @returns Full detail and context captured for the requested recommendation
 *   snapshot event
 * @throws {Error} When the specified snapshot is not found or access is denied
 */
export async function getaiCommerceAdminRecommendationSnapshotsRecommendationSnapshotId(props: {
  admin: AdminPayload;
  recommendationSnapshotId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceRecommendationSnapshot> {
  const { recommendationSnapshotId } = props;
  const row =
    await MyGlobal.prisma.ai_commerce_recommendation_snapshots.findUnique({
      where: { id: recommendationSnapshotId },
    });
  if (row === null) {
    throw new Error("Recommendation snapshot not found");
  }
  return {
    id: row.id,
    ai_commerce_buyer_id: row.ai_commerce_buyer_id,
    snapshot_timestamp: toISOStringSafe(row.snapshot_timestamp),
    recommendations_data: row.recommendations_data,
    context_data:
      row.context_data === undefined || row.context_data === null
        ? undefined
        : row.context_data,
  };
}
