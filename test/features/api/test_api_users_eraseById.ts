import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_users_eraseById(connection: api.IConnection) {
  const output = await api.functional.users.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
