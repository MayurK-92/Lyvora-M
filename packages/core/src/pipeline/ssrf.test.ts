import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  UnsafeUrlError,
  assertPublicHttpUrl,
  fetchPublicHttp,
  isBlockedIp,
} from "./ssrf.ts";

const PUBLIC_LOOKUP = async () => ["93.184.216.34"];

describe("isBlockedIp", () => {
  test("blocks loopback, RFC1918, and link-local IPv4", () => {
    assert.equal(isBlockedIp("127.0.0.1"), true);
    assert.equal(isBlockedIp("10.0.0.5"), true);
    assert.equal(isBlockedIp("172.16.0.1"), true);
    assert.equal(isBlockedIp("172.31.255.1"), true);
    assert.equal(isBlockedIp("192.168.1.1"), true);
    assert.equal(isBlockedIp("169.254.169.254"), true);
    assert.equal(isBlockedIp("0.0.0.0"), true);
  });

  test("allows public IPv4 just outside private ranges", () => {
    assert.equal(isBlockedIp("8.8.8.8"), false);
    assert.equal(isBlockedIp("1.1.1.1"), false);
    assert.equal(isBlockedIp("172.32.0.1"), false);
    assert.equal(isBlockedIp("11.0.0.1"), false);
  });

  test("blocks loopback, ULA, and link-local IPv6", () => {
    assert.equal(isBlockedIp("::1"), true);
    assert.equal(isBlockedIp("fc00::1"), true);
    assert.equal(isBlockedIp("fd12:3456:789a::1"), true);
    assert.equal(isBlockedIp("fe80::1"), true);
  });

  test("blocks IPv4-mapped private addresses", () => {
    assert.equal(isBlockedIp("::ffff:127.0.0.1"), true);
    assert.equal(isBlockedIp("::ffff:10.0.0.1"), true);
    assert.equal(isBlockedIp("::ffff:169.254.169.254"), true);
  });

  test("allows public IPv6", () => {
    assert.equal(isBlockedIp("2001:4860:4860::8888"), false);
  });
});

describe("assertPublicHttpUrl", () => {
  test("rejects non-http(s) schemes", async () => {
    await assert.rejects(
      () => assertPublicHttpUrl("file:///etc/passwd"),
      UnsafeUrlError,
    );
    await assert.rejects(
      () => assertPublicHttpUrl("ftp://example.com/file"),
      UnsafeUrlError,
    );
    await assert.rejects(
      () => assertPublicHttpUrl("javascript:alert(1)"),
      UnsafeUrlError,
    );
  });

  test("rejects private and metadata IP literals", async () => {
    await assert.rejects(
      () => assertPublicHttpUrl("http://127.0.0.1/admin"),
      UnsafeUrlError,
    );
    await assert.rejects(
      () => assertPublicHttpUrl("http://192.168.1.10/"),
      UnsafeUrlError,
    );
    await assert.rejects(
      () => assertPublicHttpUrl("http://169.254.169.254/latest/meta-data/"),
      UnsafeUrlError,
    );
    await assert.rejects(
      () => assertPublicHttpUrl("http://[::1]/"),
      UnsafeUrlError,
    );
  });

  test("rejects localhost and internal hostnames before DNS", async () => {
    await assert.rejects(
      () => assertPublicHttpUrl("http://localhost/secret", PUBLIC_LOOKUP),
      UnsafeUrlError,
    );
    await assert.rejects(
      () =>
        assertPublicHttpUrl(
          "http://metadata.google.internal/",
          PUBLIC_LOOKUP,
        ),
      UnsafeUrlError,
    );
  });

  test("rejects hostnames that resolve to a private IP", async () => {
    await assert.rejects(
      () =>
        assertPublicHttpUrl("https://intranet.example/", async () => [
          "10.0.0.8",
        ]),
      UnsafeUrlError,
    );
  });

  test("rejects mixed DNS records when any address is private", async () => {
    await assert.rejects(
      () =>
        assertPublicHttpUrl("https://mixed.example/", async () => [
          "93.184.216.34",
          "127.0.0.1",
        ]),
      UnsafeUrlError,
    );
  });

  test("allows public http(s) URLs", async () => {
    const url = await assertPublicHttpUrl(
      "https://example.com/path?q=1",
      PUBLIC_LOOKUP,
    );
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "example.com");
  });
});

describe("fetchPublicHttp", () => {
  test("does not follow a redirect onto a private IP", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const href = String(input);
      if (href.startsWith("https://safe.example")) {
        return new Response(null, {
          status: 302,
          headers: { Location: "http://127.0.0.1/secret" },
        });
      }
      throw new Error(`unexpected fetch: ${href}`);
    };

    await assert.rejects(
      () =>
        fetchPublicHttp(
          "https://safe.example/page",
          {},
          { fetch: fetchImpl, lookup: PUBLIC_LOOKUP },
        ),
      UnsafeUrlError,
    );
  });

  test("follows a redirect to another public URL", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const href = String(input);
      if (href === "https://safe.example/old") {
        return new Response(null, {
          status: 301,
          headers: { Location: "https://safe.example/new" },
        });
      }
      if (href === "https://safe.example/new") {
        return new Response("ok", { status: 200 });
      }
      throw new Error(`unexpected fetch: ${href}`);
    };

    const response = await fetchPublicHttp(
      "https://safe.example/old",
      {},
      { fetch: fetchImpl, lookup: PUBLIC_LOOKUP },
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
  });
});
