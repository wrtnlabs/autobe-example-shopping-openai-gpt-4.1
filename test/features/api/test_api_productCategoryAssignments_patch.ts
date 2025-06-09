import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductCategoryAssignments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductCategoryAssignments";
import { IProductCategoryAssignments } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductCategoryAssignments";

export async function test_api_productCategoryAssignments_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductCategoryAssignments =
    await api.functional.productCategoryAssignments.patch(connection, {
      body: typia.random<IProductCategoryAssignments.IRequest>(),
    });
  typia.assert(output);
}
