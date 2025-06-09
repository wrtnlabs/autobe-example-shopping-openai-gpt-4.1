import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_productAttributes_eraseById(
  connection: api.IConnection,
) {
  const output = await api.functional.productAttributes.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
