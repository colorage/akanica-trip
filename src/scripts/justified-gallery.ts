import {
	computeLayout,
	maxItemsForWidth,
	MIN_ITEMS_PER_ROW,
	targetRowHeightForWidth,
} from '../lib/justified-layout';

function getBoxSpacing(): number {
	return window.matchMedia('(min-width: 640px)').matches ? 16 : 12;
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
		minItemsPerRow: MIN_ITEMS_PER_ROW,
		maxItemsPerRow: maxItemsForWidth(containerWidth),
	});

	container.style.height = `${layout.containerHeight}px`;
	container.classList.add('is-laid-out');

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
