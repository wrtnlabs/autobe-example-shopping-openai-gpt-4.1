import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductCategoryAssignments } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductCategoryAssignments";

export async function test_api_productCategoryAssignments_post(
  connection: api.IConnection,
) {
  const output: IProductCategoryAssignments =
    await api.functional.productCategoryAssignments.post(connection, {
      body: typia.random<IProductCategoryAssignments.ICreate>(),
    });
  typia.assert(output);
}
