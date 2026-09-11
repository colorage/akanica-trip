import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	MOBILE_MAX_ITEMS_PER_ROW,
	buildRows,
	canPack,
	computeLayout,
	maxItemsForWidth,
	rowHeightForAspects,
} from './justified-layout.ts';

const mobile = {
	containerWidth: 390,
	boxSpacing: 12,
	targetRowHeight: 140,
	minItemsPerRow: 2,
	maxItemsPerRow: MOBILE_MAX_ITEMS_PER_ROW,
};

const desktop = {
	containerWidth: 1400,
	boxSpacing: 16,
	targetRowHeight: 280,
	minItemsPerRow: 2,
	maxItemsPerRow: Number.POSITIVE_INFINITY,
};

function assertRowBounds(rows: number[][], min: number, max: number, total: number) {
	const counts = rows.map((row) => row.length);
	const used = counts.reduce((sum, count) => sum + count, 0);
	assert.equal(used, total);

	for (const count of counts) {
		if (total >= min) {
			assert.ok(count >= min, `row of ${count} is below min ${min}: ${counts.join(',')}`);
		}
		assert.ok(count <= max, `row of ${count} is above max ${max}: ${counts.join(',')}`);
	}
}

test('canPack accepts rows that stay within min/max', () => {
	assert.equal(canPack(0, 2, 5), true);
	assert.equal(canPack(1, 2, 5), false);
	assert.equal(canPack(2, 2, 5), true);
	assert.equal(canPack(5, 2, 5), true);
	assert.equal(canPack(6, 2, 5), true);
	assert.equal(canPack(7, 2, 5), true);
	assert.equal(canPack(11, 2, 5), true);
	assert.equal(canPack(1, 2, Number.POSITIVE_INFINITY), false);
	assert.equal(canPack(6, 2, Number.POSITIVE_INFINITY), true);
});

test('maxItemsForWidth is 5 on mobile and unlimited on desktop', () => {
	assert.equal(maxItemsForWidth(390), 5);
	assert.equal(maxItemsForWidth(767), 5);
	assert.equal(maxItemsForWidth(768), Number.POSITIVE_INFINITY);
	assert.equal(maxItemsForWidth(1400), Number.POSITIVE_INFINITY);
});

test('mobile never uses a single photo when two or more remain', () => {
	const landscapes = Array.from({ length: 9 }, () => 1.8);
	const rows = buildRows(landscapes, mobile);
	assertRowBounds(rows, 2, 5, landscapes.length);
});

test('mobile never exceeds 5 photos in a row for portraits', () => {
	const portraits = Array.from({ length: 23 }, () => 0.45);
	const rows = buildRows(portraits, mobile);
	assertRowBounds(rows, 2, 5, portraits.length);
	assert.ok(rows.every((row) => row.length <= 5));
});

test('mobile leftover 6 portraits splits without a 5+1 orphan', () => {
	const portraits = Array.from({ length: 6 }, () => 0.5);
	const rows = buildRows(portraits, mobile);
	assertRowBounds(rows, 2, 5, 6);
	assert.ok(rows.every((row) => row.length >= 2 && row.length <= 5));
});

test('desktop never uses a single ultra-wide photo row', () => {
	const mixed = [4.8, 1.6, 1.5, 0.7, 1.4, 1.8, 2.1, 1.3];
	const rows = buildRows(mixed, desktop);
	assertRowBounds(rows, 2, Number.POSITIVE_INFINITY, mixed.length);
});

test('a lone leftover photo is merged instead of sitting alone', () => {
	const aspects = [1.5, 1.5, 1.5, 4.9];
	const rows = buildRows(aspects, desktop);
	assertRowBounds(rows, 2, Number.POSITIVE_INFINITY, aspects.length);
	assert.ok(rows.every((row) => row.length >= 2));
});

test('desktop leftover of one photo is not packed as its own row', () => {
	const aspects = Array.from({ length: 27 }, (_, index) => (index === 26 ? 0.6 : 1.55));
	const rows = buildRows(aspects, desktop);
	assertRowBounds(rows, 2, Number.POSITIVE_INFINITY, aspects.length);
	assert.equal(rows.at(-1)?.length === 1, false);
});

test('single photo galleries are allowed to keep one item', () => {
	const rows = buildRows([1.5], desktop);
	assert.deepEqual(
		rows.map((row) => row.length),
		[1],
	);
});

test('two photos always share a row', () => {
	const rows = buildRows([0.6, 0.6], desktop);
	assert.deepEqual(
		rows.map((row) => row.length),
		[2],
	);
});

test('computeLayout caps extremely tall leftover portrait rows', () => {
	const layout = computeLayout([0.55, 0.55], desktop);
	assert.deepEqual(layout.rowCounts, [2]);
	assert.ok(layout.boxes[0].height <= 520);
	assert.ok(layout.boxes[0].width + desktop.boxSpacing + layout.boxes[1].width < desktop.containerWidth);
});

test('desktop leftover portraits are rebalanced to fill the row', () => {
	const aspects = [1.6, 1.5, 1.7, 1.55, 1.62, 0.55, 0.55];
	const layout = computeLayout(aspects, desktop);
	assert.ok(layout.rowCounts.every((count) => count >= 2));
	assert.equal(layout.rowCounts.reduce((sum, count) => sum + count, 0), aspects.length);

	const lastTop = Math.max(...layout.boxes.map((box) => box.top));
	const lastRow = layout.boxes.filter((box) => box.top === lastTop);
	const rightEdge = Math.max(...lastRow.map((box) => box.left + box.width));
	assert.ok(rightEdge > desktop.containerWidth * 0.9);
	assert.ok(lastRow.length >= 2);
});

test('computeLayout fills width for typical landscape rows', () => {
	const aspects = [1.6, 1.5, 1.7];
	const layout = computeLayout(aspects, desktop);
	const last = layout.boxes[layout.boxes.length - 1];
	const rightEdge = last.left + last.width;
	assert.ok(Math.abs(rightEdge - desktop.containerWidth) < 1);
});

test('row height decreases as more photos are added', () => {
	const two = rowHeightForAspects([1, 1], 1000, 10);
	const three = rowHeightForAspects([1, 1, 1], 1000, 10);
	assert.ok(three < two);
});
