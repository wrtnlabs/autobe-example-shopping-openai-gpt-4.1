import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductCategoryAssignments } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductCategoryAssignments";

export async function test_api_productCategoryAssignments_getById(
  connection: api.IConnection,
) {
  const output: IProductCategoryAssignments =
    await api.functional.productCategoryAssignments.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
