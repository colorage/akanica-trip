export interface LayoutBox {
	top: number;
	left: number;
	width: number;
	height: number;
}

export interface LayoutResult {
	boxes: LayoutBox[];
	containerHeight: number;
	rowCounts: number[];
}

export interface LayoutOptions {
	containerWidth: number;
	boxSpacing: number;
	targetRowHeight: number;
	minItemsPerRow?: number;
	maxItemsPerRow?: number;
}

export const MOBILE_LAYOUT_MAX_WIDTH = 767;
export const MIN_ITEMS_PER_ROW = 2;
export const MOBILE_MAX_ITEMS_PER_ROW = 5;

export function maxItemsForWidth(containerWidth: number): number {
	return containerWidth <= MOBILE_LAYOUT_MAX_WIDTH
		? MOBILE_MAX_ITEMS_PER_ROW
		: Number.POSITIVE_INFINITY;
}

export function rowHeightForAspects(
	aspectRatios: number[],
	containerWidth: number,
	boxSpacing: number,
): number {
	if (aspectRatios.length === 0) return 0;
	const spacing = boxSpacing * Math.max(0, aspectRatios.length - 1);
	const totalAspect = aspectRatios.reduce((sum, ratio) => sum + ratio, 0);
	if (totalAspect <= 0) return 0;
	return (containerWidth - spacing) / totalAspect;
}

export function canPack(count: number, minItems: number, maxItems: number): boolean {
	if (count === 0) return true;
	if (count < 0 || maxItems < 1 || minItems < 1) return false;
	if (!Number.isFinite(maxItems)) {
		return count >= minItems;
	}
	const minRows = Math.ceil(count / maxItems);
	const maxRows = Math.floor(count / minItems);
	return minRows <= maxRows;
}

function validRowCounts(
	remaining: number,
	minItems: number,
	maxItems: number,
): number[] {
	if (remaining <= 0) return [];

	const maxCount = Math.min(maxItems, remaining);
	const minCount = Math.min(minItems, remaining);
	const counts: number[] = [];

	for (let count = minCount; count <= maxCount; count++) {
		const leftover = remaining - count;
		if (leftover === 0 || canPack(leftover, minItems, maxItems)) {
			counts.push(count);
		}
	}

	if (counts.length === 0) {
		counts.push(Math.min(remaining, maxItems));
	}

	return counts;
}

function pickRowCount(
	aspectRatios: number[],
	start: number,
	remaining: number,
	options: Required<Pick<LayoutOptions, 'containerWidth' | 'boxSpacing' | 'targetRowHeight'>> & {
		minItems: number;
		maxItems: number;
	},
): number {
	const counts = validRowCounts(remaining, options.minItems, options.maxItems);
	let chosen = counts[counts.length - 1];

	for (const count of counts) {
		const height = rowHeightForAspects(
			aspectRatios.slice(start, start + count),
			options.containerWidth,
			options.boxSpacing,
		);

		chosen = count;
		if (height <= options.targetRowHeight) {
			break;
		}
	}

	return chosen;
}

export function buildRows(aspectRatios: number[], options: LayoutOptions): number[][] {
	const minItems = options.minItemsPerRow ?? MIN_ITEMS_PER_ROW;
	const maxItems = options.maxItemsPerRow ?? Number.POSITIVE_INFINITY;
	const rows: number[][] = [];
	let start = 0;

	while (start < aspectRatios.length) {
		const remaining = aspectRatios.length - start;
		const count = pickRowCount(aspectRatios, start, remaining, {
			containerWidth: options.containerWidth,
			boxSpacing: options.boxSpacing,
			targetRowHeight: options.targetRowHeight,
			minItems,
			maxItems,
		});

		rows.push(aspectRatios.slice(start, start + count));
		start += count;
	}

	rebalanceLastRow(rows, options);

	return rows;
}

function layoutRow(
	aspectRatios: number[],
	containerWidth: number,
	boxSpacing: number,
	maxRowHeight: number,
): LayoutBox[] {
	const justifiedHeight = rowHeightForAspects(aspectRatios, containerWidth, boxSpacing);
	const height = Math.min(justifiedHeight, maxRowHeight);
	let left = 0;

	return aspectRatios.map((ratio) => {
		const width = ratio * height;
		const box = { top: 0, left, width, height };
		left += width + boxSpacing;
		return box;
	});
}

function maxRowHeightFor(containerWidth: number, targetRowHeight: number): number {
	return Math.max(targetRowHeight, Math.min(containerWidth * 0.72, 520));
}

function rebalanceLastRow(rows: number[][], options: LayoutOptions): void {
	if (rows.length < 2) return;

	const minItems = options.minItemsPerRow ?? MIN_ITEMS_PER_ROW;
	const maxItems = options.maxItemsPerRow ?? Number.POSITIVE_INFINITY;
	const maxRowHeight = maxRowHeightFor(options.containerWidth, options.targetRowHeight);
	const tooTall = (row: number[]) =>
		rowHeightForAspects(row, options.containerWidth, options.boxSpacing) > maxRowHeight;

	const lastRow = () => rows[rows.length - 1];
	const prevRow = () => rows[rows.length - 2];

	while (
		tooTall(lastRow()) &&
		lastRow().length < maxItems &&
		prevRow().length > minItems
	) {
		const candidatePrev = prevRow().slice(0, -1);
		const moved = prevRow()[prevRow().length - 1];
		if (moved === undefined || tooTall(candidatePrev)) break;

		prevRow().pop();
		lastRow().unshift(moved);
	}

	if (tooTall(lastRow()) && prevRow().length + lastRow().length <= maxItems) {
		rows[rows.length - 2] = prevRow().concat(lastRow());
		rows.pop();
	}
}

export function computeLayout(aspectRatios: number[], options: LayoutOptions): LayoutResult {
	if (aspectRatios.length === 0) {
		return { boxes: [], containerHeight: 0, rowCounts: [] };
	}

	if (options.containerWidth <= 0) {
		return {
			boxes: aspectRatios.map(() => ({ top: 0, left: 0, width: 0, height: 0 })),
			containerHeight: 0,
			rowCounts: [],
		};
	}

	const rows = buildRows(aspectRatios, options);
	const boxes: LayoutBox[] = [];
	const maxRowHeight = maxRowHeightFor(options.containerWidth, options.targetRowHeight);
	let top = 0;

	for (const row of rows) {
		const rowBoxes = layoutRow(row, options.containerWidth, options.boxSpacing, maxRowHeight);

		for (const box of rowBoxes) {
			boxes.push({ ...box, top });
		}

		top += rowBoxes[0].height + options.boxSpacing;
	}

	return {
		boxes,
		containerHeight: Math.max(0, top - options.boxSpacing),
		rowCounts: rows.map((row) => row.length),
	};
}

export function targetRowHeightForWidth(containerWidth: number): number {
	return Math.max(140, Math.min(280, containerWidth / 3.5));
}
