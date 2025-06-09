import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategory";

export async function test_api_categories_eraseById(
  connection: api.IConnection,
) {
  const output: ICategory = await api.functional.categories.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
