/**
 * Unit tests for grocery categorization
 * Run with: node --test party/grocery-categorizer.test.ts
 */

import { test } from "node:test";
import assert from "node:assert";
import { categorizeItem } from "./grocery-categorizer.ts";

test("salmon should be mapped to Fish Market", () => {
  const result = categorizeItem("salmon");
  assert.strictEqual(result, "Fish Market");
});

test("canned salmon should be mapped to Pantry", () => {
  const result = categorizeItem("canned salmon");
  assert.strictEqual(result, "Pantry");
});

test("toilet paper should be mapped to Costco", () => {
  const result = categorizeItem("toilet paper");
  assert.strictEqual(result, "Costco");
});

test("chicken sausage should be mapped to New Seasons", () => {
  const result = categorizeItem("chicken sausage");
  assert.strictEqual(result, "New Seasons");
});

// Additional verification tests
test("scallops should be mapped to Fish Market", () => {
  const result = categorizeItem("scallops");
  assert.strictEqual(result, "Fish Market");
});

test("pesto should be mapped to Costco", () => {
  const result = categorizeItem("pesto");
  assert.strictEqual(result, "Costco");
});

test("chai concentrate should be mapped to Trader Joe's", () => {
  const result = categorizeItem("chai concentrate");
  assert.strictEqual(result, "Trader Joe's");
});

test("apples should be mapped to Produce", () => {
  const result = categorizeItem("apples");
  assert.strictEqual(result, "Produce");
});

test("milk should be mapped to Dairy & Eggs", () => {
  const result = categorizeItem("milk");
  assert.strictEqual(result, "Dairy & Eggs");
});

test("bread should be mapped to Bakery", () => {
  const result = categorizeItem("bread");
  assert.strictEqual(result, "Bakery");
});

test("ice cream should be mapped to Frozen Foods", () => {
  const result = categorizeItem("ice cream");
  assert.strictEqual(result, "Frozen Foods");
});

test("pasta should be mapped to Pantry", () => {
  const result = categorizeItem("pasta");
  assert.strictEqual(result, "Pantry");
});

test("shampoo should be mapped to Stuff", () => {
  const result = categorizeItem("shampoo");
  assert.strictEqual(result, "Stuff");
});

test("unknown item should be mapped to Other", () => {
  const result = categorizeItem("some weird unknown item xyz123");
  assert.strictEqual(result, "Other");
});

test("nuggies should be mapped to Frozen Foods", () => {
  const result = categorizeItem("nuggies");
  assert.strictEqual(result, "Frozen Foods");
});

test("Veggie dogs should be mapped to Meat, Seafood & Deli", () => {
  const result = categorizeItem("Veggie dogs");
  assert.strictEqual(result, "Meat, Seafood & Deli");
});
