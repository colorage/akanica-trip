import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const PHOTOS_DIR = path.join(process.cwd(), 'public', 'photos');
const THUMB_MAX_WIDTH = 1200;
const COVER_MAX_WIDTH = 2400;
const WEBP_QUALITY = 80;

function thumbPathFor(jpegPath) {
	return jpegPath.replace(/\.jpe?g$/i, '.thumb.webp');
}

async function needsRegeneration(sourcePath, outputPath) {
	try {
		const [sourceStat, outputStat] = await Promise.all([
			fs.stat(sourcePath),
			fs.stat(outputPath),
		]);
		return outputStat.mtimeMs < sourceStat.mtimeMs;
	} catch {
		return true;
	}
}

async function optimizePhoto(sourcePath, maxWidth) {
	const outputPath = thumbPathFor(sourcePath);

	if (!(await needsRegeneration(sourcePath, outputPath))) {
		return { skipped: true, outputPath };
	}

	await sharp(sourcePath)
		.rotate()
		.resize({ width: maxWidth, withoutEnlargement: true })
		.webp({ quality: WEBP_QUALITY })
		.toFile(outputPath);

	return { skipped: false, outputPath };
}

async function walkJpegs(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await walkJpegs(entryPath)));
			continue;
		}

		if (/\.jpe?g$/i.test(entry.name)) {
			files.push(entryPath);
		}
	}

	return files;
}

async function main() {
	let created = 0;
	let skipped = 0;

	const jpegFiles = await walkJpegs(PHOTOS_DIR);

	for (const sourcePath of jpegFiles) {
		const filename = path.basename(sourcePath);
		const maxWidth = filename === 'cover.jpeg' ? COVER_MAX_WIDTH : THUMB_MAX_WIDTH;
		const result = await optimizePhoto(sourcePath, maxWidth);

		if (result.skipped) {
			skipped += 1;
		} else {
			created += 1;
			console.log(`optimized ${path.relative(PHOTOS_DIR, sourcePath)}`);
		}
	}

	console.log(`done: ${created} created, ${skipped} up to date`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
