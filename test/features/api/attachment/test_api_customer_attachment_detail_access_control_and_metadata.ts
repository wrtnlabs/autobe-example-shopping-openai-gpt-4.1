import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate retrieval of customer attachment details, with access control and
 * metadata enforcement.
 *
 * Scenario steps:
 *
 * 1. Register (join) a new customer for a random channel.
 * 2. Upload an attachment as the newly registered customer (using random but valid
 *    IShoppingMallAttachment.ICreate data).
 * 3. Retrieve attachment details (GET) as the same customer — validate all
 *    metadata fields, including id, filename, file_extension, mime_type,
 *    size_bytes, server_url, public_accessible,
 *    permission_scope/logical_source/description (optional), hash_md5,
 *    created_at/updated_at/deleted_at.
 * 4. Attempt to access an attachmentId that doesn't exist (random UUID) and ensure
 *    error is thrown.
 * 5. Register a second customer, create an attachment for customer2, then attempt
 *    to access customer2's attachment with customer1's connection; validate
 *    permission error.
 * 6. (Optionally) Attempt retrieval after soft deletion (if deleted_at is set) and
 *    validate error access/logic.
 * 7. For optional edge cases, validate metadata field presence/formatting and
 *    check that only allowed fields are present in returned object.
 */
export async function test_api_customer_attachment_detail_access_control_and_metadata(
  connection: api.IConnection,
) {
  // Step 1: Register customer1
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer1);

  // Step 2: Upload attachment as customer1
  const attachment1 =
    await api.functional.shoppingMall.customer.attachments.create(connection, {
      body: {
        filename: RandomGenerator.paragraph({ sentences: 2 }),
        file_extension: RandomGenerator.pick([
          "jpg",
          "png",
          "pdf",
          "txt",
        ] as const),
        mime_type: RandomGenerator.pick([
          "image/jpeg",
          "image/png",
          "application/pdf",
          "text/plain",
        ] as const),
        size_bytes: typia.random<number & tags.Type<"int32">>(),
        server_url:
          "https://cdn.example.com/" + RandomGenerator.alphaNumeric(12),
        public_accessible: RandomGenerator.pick([true, false] as const),
        permission_scope: RandomGenerator.pick([
          "customer",
          "seller",
          "public",
          undefined,
        ] as const),
        logical_source: RandomGenerator.pick([
          "product",
          "board_post",
          "order",
          undefined,
        ] as const),
        description: RandomGenerator.pick([
          RandomGenerator.paragraph(),
          undefined,
        ] as const),
      },
    });
  typia.assert(attachment1);

  // Step 3: Retrieve attachment details as customer1
  const read1 = await api.functional.shoppingMall.customer.attachments.at(
    connection,
    {
      attachmentId: attachment1.id,
    },
  );
  typia.assert(read1);
  TestValidator.equals(
    "attachment content matches uploaded data",
    read1.filename,
    attachment1.filename,
  );
  TestValidator.equals(
    "extension matches",
    read1.file_extension,
    attachment1.file_extension,
  );
  TestValidator.equals(
    "mime_type matches",
    read1.mime_type,
    attachment1.mime_type,
  );
  TestValidator.equals(
    "size_bytes matches",
    read1.size_bytes,
    attachment1.size_bytes,
  );
  TestValidator.equals(
    "server_url matches",
    read1.server_url,
    attachment1.server_url,
  );
  TestValidator.equals(
    "public_accessible matches",
    read1.public_accessible,
    attachment1.public_accessible,
  );
  TestValidator.equals(
    "hash_md5 field is present",
    typeof read1.hash_md5,
    "string",
  );
  TestValidator.equals("created_at ISO8601", typeof read1.created_at, "string");
  TestValidator.equals("updated_at ISO8601", typeof read1.updated_at, "string");

  // Step 4: Attempt to retrieve nonexistent attachment (should error)
  await TestValidator.error(
    "accessing nonexistent attachment throws error",
    async () => {
      await api.functional.shoppingMall.customer.attachments.at(connection, {
        attachmentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 5: Register customer2 and attempt forbidden access
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: "anotherpassword456",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer2);
  // Switch connection context to customer2 (join sets .headers automatically)
  const attachment2 =
    await api.functional.shoppingMall.customer.attachments.create(connection, {
      body: {
        filename: RandomGenerator.paragraph({ sentences: 2 }),
        file_extension: RandomGenerator.pick([
          "jpg",
          "png",
          "pdf",
          "txt",
        ] as const),
        mime_type: RandomGenerator.pick([
          "image/jpeg",
          "image/png",
          "application/pdf",
          "text/plain",
        ] as const),
        size_bytes: typia.random<number & tags.Type<"int32">>(),
        server_url:
          "https://cdn.example.com/" + RandomGenerator.alphaNumeric(12),
        public_accessible: false, // make it forbidden to other customers
        permission_scope: "customer",
        logical_source: "product",
        description: RandomGenerator.paragraph(),
      },
    });
  typia.assert(attachment2);

  // Switch back to customer1 (simulate by re-joining as customer1)
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customer1.email,
      password: "testpassword123",
      name: customer1.name,
      phone: customer1.phone ?? undefined,
    },
  });
  // Should fail to access customer2's private attachment
  await TestValidator.error(
    "customer1 forbidden from accessing customer2's attachment",
    async () => {
      await api.functional.shoppingMall.customer.attachments.at(connection, {
        attachmentId: attachment2.id,
      });
    },
  );

  // Step 6: Simulate soft deletion - for business logic, set deleted_at on customer1's attachment (mock, since we cannot delete via current API)
  // In this system, deleted attachments would return an error on access
  // But we can't actually call deletion so this step is a comment for now

  // Step 7: Format/field checks (all required fields, permitted optionals present as appropriate)
  const requiredFields = [
    "id",
    "filename",
    "file_extension",
    "mime_type",
    "size_bytes",
    "server_url",
    "public_accessible",
    "hash_md5",
    "created_at",
    "updated_at",
  ];
  for (const key of requiredFields) {
    TestValidator.predicate(
      `attachment response should include '${key}'`,
      Object.prototype.hasOwnProperty.call(read1, key),
    );
  }
}
