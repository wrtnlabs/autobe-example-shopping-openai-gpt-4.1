import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductCategoryAssignments } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductCategoryAssignments";

export async function test_api_productCategoryAssignments_putById(
  connection: api.IConnection,
) {
  const output: IProductCategoryAssignments =
    await api.functional.productCategoryAssignments.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IProductCategoryAssignments.IUpdate>(),
    });
  typia.assert(output);
}
