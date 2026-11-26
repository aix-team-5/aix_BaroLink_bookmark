// extension/js/ui.js 테스트 — 앱 아이콘에 파비콘을 쓸지 정하는 계산 (팀원 D · 이슈 #16 · 명세 N44)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// 화면을 그리는 appIcon 자체는 크롬에서 확인한다 (tests/console-checks.md C-ICON). 여기서는 픽셀 계산만 본다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { iconSourceSize, isIconSharp } from "../extension/js/ui.js";

// 원래 크기 source인 그림을 size로 정수배 키운 RGBA 바이트 (크롬 _favicon처럼 픽셀을 그대로 복제)
// 원래 그림은 칸마다 색이 다른 바둑판이다
function upscaled(source, size) {
  const factor = size / source;
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.floor(x / factor);
      const sy = Math.floor(y / factor);
      const at = (y * size + x) * 4;
      pixels[at] = (sx * 37 + sy * 11) % 256;
      pixels[at + 1] = (sx + sy) % 2 ? 255 : 0;
      pixels[at + 2] = (sy * 53) % 256;
      pixels[at + 3] = 255;
    }
  }
  return pixels;
}

test("iconSourceSize: 16px를 64px로 키운 그림(4×4 덩어리)은 16", () => {
  assert.equal(iconSourceSize(upscaled(16, 64), 64, 64), 16);
});

test("iconSourceSize: 32px를 64px로 키운 그림(2×2 덩어리)은 32", () => {
  assert.equal(iconSourceSize(upscaled(32, 64), 64, 64), 32);
});

test("iconSourceSize: 키우지 않은 64px 그림은 64", () => {
  assert.equal(iconSourceSize(upscaled(64, 64), 64, 64), 64);
});

test("iconSourceSize: 8px를 키운 그림은 8, 덩어리 크기로 나누어떨어지지 않는 그림은 받은 크기", () => {
  assert.equal(iconSourceSize(upscaled(8, 64), 64, 64), 8);
  assert.equal(iconSourceSize(upscaled(30, 30), 30, 30), 30);
});

test("iconSourceSize: 덩어리 안의 한 칸만 달라도 그 크기의 덩어리로 보지 않는다", () => {
  const one = upscaled(16, 64);
  one[(1 * 64 + 1) * 4] ^= 1; // 첫 4×4 덩어리 안의 한 칸 → 2×2 덩어리도 깨진다
  assert.equal(iconSourceSize(one, 64, 64), 64);
  const quarter = upscaled(16, 64);
  for (const [x, y] of [[2, 2], [3, 2], [2, 3], [3, 3]]) quarter[(y * 64 + x) * 4] ^= 1; // 4×4 덩어리 안의 2×2만 바꿈
  assert.equal(iconSourceSize(quarter, 64, 64), 32);
});

test("iconSourceSize: 크기가 없거나 바이트가 모자라면 0", () => {
  assert.equal(iconSourceSize(new Uint8ClampedArray(0), 0, 0), 0);
  assert.equal(iconSourceSize(new Uint8ClampedArray(10), 64, 64), 0);
  assert.equal(iconSourceSize(null, 64, 64), 0);
});

test("isIconSharp: 원래 크기가 보여 줄 크기의 절반 이상이면 쓴다", () => {
  // 56px 타일 → 보여 줄 크기 34px (0.6배)
  assert.equal(isIconSharp(16, 34), false);
  assert.equal(isIconSharp(17, 34), true);
  assert.equal(isIconSharp(32, 34), true);
  assert.equal(isIconSharp(64, 34), true);
  // 44px 타일 → 26px: 16px 그림도 절반(13) 이상이라 쓴다
  assert.equal(isIconSharp(16, 26), true);
});

test("isIconSharp: 크기를 모르면 쓰지 않는다", () => {
  assert.equal(isIconSharp(0, 34), false);
  assert.equal(isIconSharp(NaN, 34), false);
  assert.equal(isIconSharp(32, 0), false);
});
