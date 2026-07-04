import path from 'node:path';
import sharp from 'sharp';

export interface PhotoMeta {
	src: string;
	thumbSrc: string;
	width: number;
	height: number;
	thumbWidth: number;
	thumbHeight: number;
}

export function photoUrl(folder: string, filename: string): string {
	const base = import.meta.env.BASE_URL;
	const encodedFolder = folder.split('/').map(encodeURIComponent).join('/');
	return `${base}photos/${encodedFolder}/${filename}`;
}

export function thumbFilename(filename: string): string {
	return filename.replace(/\.jpe?g$/i, '.thumb.webp');
}

export function thumbUrl(folder: string, filename: string): string {
	return photoUrl(folder, thumbFilename(filename));
}

export function getPhotoFilenames(): string[] {
	return Array.from({ length: 10 }, (_, i) => `photo_${i + 1}.jpeg`);
}

export async function getImageMeta(
	folder: string,
	filename: string,
): Promise<PhotoMeta> {
	const filePath = path.join(process.cwd(), 'public', 'photos', folder, filename);
	const thumbPath = path.join(
		process.cwd(),
		'public',
		'photos',
		folder,
		thumbFilename(filename),
	);

	const [original, thumb] = await Promise.all([
		sharp(filePath).metadata(),
		sharp(thumbPath).metadata(),
	]);

	if (!original.width || !original.height) {
		throw new Error(`Could not read dimensions for ${filePath}`);
	}

	if (!thumb.width || !thumb.height) {
		throw new Error(`Could not read dimensions for ${thumbPath}`);
	}

	return {
		src: photoUrl(folder, filename),
		thumbSrc: thumbUrl(folder, filename),
		width: original.width,
		height: original.height,
		thumbWidth: thumb.width,
		thumbHeight: thumb.height,
	};
}

export function formatTripDate(date: string): string {
	return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
