interface LayoutBox {
	top: number;
	left: number;
	width: number;
	height: number;
}

interface LayoutResult {
	boxes: LayoutBox[];
	containerHeight: number;
}

interface LayoutOptions {
	containerWidth: number;
	boxSpacing: number;
	targetRowHeight: number;
}

function rowHeightForAspects(
	aspectRatios: number[],
	containerWidth: number,
	boxSpacing: number,
): number {
	const spacing = boxSpacing * Math.max(0, aspectRatios.length - 1);
	const totalAspect = aspectRatios.reduce((sum, ratio) => sum + ratio, 0);
	return (containerWidth - spacing) / totalAspect;
}

function layoutJustifiedRow(
	aspectRatios: number[],
	containerWidth: number,
	boxSpacing: number,
): LayoutResult {
	const rowHeight = rowHeightForAspects(aspectRatios, containerWidth, boxSpacing);
	let left = 0;

	const boxes = aspectRatios.map((ratio) => {
		const width = ratio * rowHeight;
		const box = { top: 0, left, width, height: rowHeight };
		left += width + boxSpacing;
		return box;
	});

	return { boxes, containerHeight: rowHeight };
}

function buildRows(aspectRatios: number[], options: LayoutOptions): number[][] {
	const { containerWidth, boxSpacing, targetRowHeight } = options;
	const minRowHeight = targetRowHeight * 0.55;
	const rows: number[][] = [];
	let row: number[] = [];

	for (const ratio of aspectRatios) {
		row.push(ratio);
		const height = rowHeightForAspects(row, containerWidth, boxSpacing);

		if (height <= targetRowHeight && height >= minRowHeight) {
			rows.push(row);
			row = [];
		}
	}

	if (row.length > 0) {
		rows.push(row);
	}

	return rows;
}

function computeLayout(aspectRatios: number[], options: LayoutOptions): LayoutResult {
	if (aspectRatios.length === 0) {
		return { boxes: [], containerHeight: 0 };
	}

	if (options.containerWidth <= 0) {
		return {
			boxes: aspectRatios.map(() => ({ top: 0, left: 0, width: 0, height: 0 })),
			containerHeight: 0,
		};
	}

	const rows = buildRows(aspectRatios, options);
	const boxes: LayoutBox[] = [];
	let top = 0;

	for (const row of rows) {
		const rowLayout = layoutJustifiedRow(row, options.containerWidth, options.boxSpacing);

		for (const box of rowLayout.boxes) {
			boxes.push({ ...box, top });
		}

		top += rowLayout.containerHeight + options.boxSpacing;
	}

	return { boxes, containerHeight: Math.max(0, top - options.boxSpacing) };
}

function getBoxSpacing(): number {
	return window.matchMedia('(min-width: 640px)').matches ? 16 : 12;
}

function targetRowHeightForWidth(containerWidth: number): number {
	return Math.max(140, Math.min(280, containerWidth / 3.5));
}

function layoutGallery(container: HTMLElement): void {
	const items = [...container.querySelectorAll<HTMLElement>('.photo-grid__item')];
	if (items.length === 0) return;

	const aspectRatios = items.map((item) => Number.parseFloat(item.dataset.aspectRatio ?? '1'));
	const containerWidth = container.clientWidth;
	const boxSpacing = getBoxSpacing();

	const layout = computeLayout(aspectRatios, {
		containerWidth,
		boxSpacing,
		targetRowHeight: targetRowHeightForWidth(containerWidth),
	});

	container.style.height = `${layout.containerHeight}px`;

	items.forEach((item, index) => {
		const box = layout.boxes[index];
		item.style.width = `${box.width}px`;
		item.style.height = `${box.height}px`;
		item.style.transform = `translate(${box.left}px, ${box.top}px)`;
	});
}

let initialized = false;

export function initJustifiedGalleries(): void {
	if (initialized) return;
	initialized = true;

	const galleries = [...document.querySelectorAll<HTMLElement>('.photo-grid')];
	if (galleries.length === 0) return;

	const relayoutAll = () => {
		for (const gallery of galleries) {
			layoutGallery(gallery);
		}
	};

	relayoutAll();

	const observer = new ResizeObserver(() => {
		window.requestAnimationFrame(relayoutAll);
	});

	for (const gallery of galleries) {
		observer.observe(gallery);
	}
}
