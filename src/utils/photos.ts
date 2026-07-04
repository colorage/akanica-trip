import path from 'node:path';
import sharp from 'sharp';

export interface PhotoMeta {
	src: string;
	width: number;
	height: number;
}

export function photoUrl(folder: string, filename: string): string {
	const base = import.meta.env.BASE_URL;
	const encodedFolder = folder.split('/').map(encodeURIComponent).join('/');
	return `${base}photos/${encodedFolder}/${filename}`;
}

export function getPhotoFilenames(): string[] {
	return Array.from({ length: 10 }, (_, i) => `photo_${i + 1}.jpeg`);
}

export async function getImageMeta(
	folder: string,
	filename: string,
): Promise<PhotoMeta> {
	const filePath = path.join(process.cwd(), 'public', 'photos', folder, filename);
	const { width, height } = await sharp(filePath).metadata();

	if (!width || !height) {
		throw new Error(`Could not read dimensions for ${filePath}`);
	}

	return {
		src: photoUrl(folder, filename),
		width,
		height,
	};
}

export function formatTripDate(date: string): string {
	return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
