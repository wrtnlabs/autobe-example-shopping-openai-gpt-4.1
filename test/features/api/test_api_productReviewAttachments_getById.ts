import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductReviewAttachment";

export async function test_api_productReviewAttachments_getById(
  connection: api.IConnection,
) {
  const output: IProductReviewAttachment =
    await api.functional.productReviewAttachments.getById(connection, {
      id: typia.random<string>(),
    });
  typia.assert(output);
}
