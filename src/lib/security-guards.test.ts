import {describe, it, expect} from "vitest";
import {trustedAvatarUrl, hasImageSignature, isSafeAvatarBlob} from "./security-guards";
import {escapeHtml} from "./html";

describe("avatar URL allowlist", () => {
  it("accepts public user-avatar storage and Google photo hosts", () => {
    expect(trustedAvatarUrl("https://myshop.supabase.co/storage/v1/object/public/avatars/123e4567-e89b-12d3-a456-426614174000/avatar.webp")).toBeTruthy();
    expect(trustedAvatarUrl("https://lh3.googleusercontent.com/a/photo?s=96")).toBeTruthy();
  });
  it("rejects untrusted, spoofed and non-HTTPS origins", () => {
    for (const url of [
      "https://tracker.example/picture.jpg",
      "http://lh3.googleusercontent.com/a/photo",
      "https://lh3.googleusercontent.com.tracker.example/photo",
      "https://myshop.supabase.co/storage/v1/object/public/products/item.jpg",
      "https://user:pass@lh3.googleusercontent.com/photo"
    ]) expect(trustedAvatarUrl(url)).toBeNull();
  });
  it("escapes quotes and angle brackets in attributes", () => {
    expect(escapeHtml('Hello " <world>')).toBe("Hello &quot; &lt;world&gt;");
  });
});

describe("image signature and size", () => {
  it("recognizes the three approved image formats", () => {
    expect(hasImageSignature(new Uint8Array([255,216,255,224]), "image/jpeg")).toBe(true);
    expect(hasImageSignature(new Uint8Array([137,80,78,71,13,10,26,10]), "image/png")).toBe(true);
    expect(hasImageSignature(new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80]), "image/webp")).toBe(true);
  });
  it("rejects mismatched content types and zero-length files", async () => {
    expect(hasImageSignature(new Uint8Array([0,0,0,0]), "image/png")).toBe(false);
    expect(await isSafeAvatarBlob(new Blob([],{type:"image/png"}))).toBe(false);
    expect(await isSafeAvatarBlob(new Blob(["not a jpeg"],{type:"image/jpeg"}))).toBe(false);
  });
  it("does not allow files above the public avatar bucket limit", async () => {
    const tooLarge=new Blob([new Uint8Array(2*1024*1024+1)],{type:"image/png"});
    expect(await isSafeAvatarBlob(tooLarge)).toBe(false);
  });
});
