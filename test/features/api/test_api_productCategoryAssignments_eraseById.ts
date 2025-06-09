import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductCategoryAssignments } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductCategoryAssignments";

export async function test_api_productCategoryAssignments_eraseById(
  connection: api.IConnection,
) {
  const output: IProductCategoryAssignments =
    await api.functional.productCategoryAssignments.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
