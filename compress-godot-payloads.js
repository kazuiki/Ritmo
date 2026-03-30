#!/usr/bin/env node

/**
 * Compression script for Godot payloads
 * Compresses project.binary and assets.sparsepck files to .gz format
 * Run with: node compress-godot-payloads.js
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { pipeline } = require("stream");

const GAMES = ["school", "eatgame", "brushgame", "bathgame", "makehair"];
// Note: full_main.pck already has minimal compression benefit, skip it for faster delivery
const FILES_TO_COMPRESS = ["project.binary", "assets.sparsepck"];
const ASSETS_DIR = path.join(__dirname, "android/app/src/main/assets");

function getGameDir(game) {
	if (game === "school") {
		return ASSETS_DIR; // Root folder for school game
	}
	return path.join(ASSETS_DIR, game);
}

function compressFile(inputPath, outputPath) {
	return new Promise((resolve, reject) => {
		const gzip = zlib.createGzip({ level: 9 }); // Maximum compression
		const source = fs.createReadStream(inputPath);
		const dest = fs.createWriteStream(outputPath);

		pipeline(source, gzip, dest, (err) => {
			if (err) {
				reject(err);
			} else {
				const inputSize = fs.statSync(inputPath).size;
				const outputSize = fs.statSync(outputPath).size;
				const ratio = ((1 - outputSize / inputSize) * 100).toFixed(2);
				resolve({ inputSize, outputSize, ratio });
			}
		});
	});
}

async function compressPayloads() {
	console.log("Starting Godot payload compression...\n");

	let totalOriginal = 0;
	let totalCompressed = 0;

	for (const game of GAMES) {
		const gameDir = getGameDir(game);
		console.log(`\nCompressing ${game} payloads:`);

		if (!fs.existsSync(gameDir)) {
			console.log(`  ⚠️  Game directory not found: ${gameDir}`);
			continue;
		}

		for (const file of FILES_TO_COMPRESS) {
			const inputPath = path.join(gameDir, file);
			const outputPath = `${inputPath}.gz`;

			if (!fs.existsSync(inputPath)) {
				console.log(`  ⚠️  File not found: ${file}`);
				continue;
			}

			try {
				console.log(`  Compressing ${file}...`);
				const { inputSize, outputSize, ratio } = await compressFile(inputPath, outputPath);

				const inputSizeMB = (inputSize / 1024 / 1024).toFixed(2);
				const outputSizeMB = (outputSize / 1024 / 1024).toFixed(2);

				console.log(
					`    ✓ ${file}: ${inputSizeMB}MB → ${outputSizeMB}MB (${ratio}% reduction)`
				);

				totalOriginal += inputSize;
				totalCompressed += outputSize;
			} catch (error) {
				console.error(`    ✗ Failed to compress ${file}: ${error.message}`);
			}
		}
	}

	console.log("\n" + "=".repeat(60));
	console.log("COMPRESSION SUMMARY");
	console.log("=".repeat(60));
	console.log(`Total original size:   ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
	console.log(`Total compressed size: ${(totalCompressed / 1024 / 1024).toFixed(2)} MB`);
	console.log(
		`Total reduction:       ${((1 - totalCompressed / totalOriginal) * 100).toFixed(2)}%`
	);
	console.log("=".repeat(60));

	console.log("\n✅ Compression complete!");
	console.log(
		"\nNext steps:"
	);
	console.log("1. Upload .gz files to your CDN");
	console.log("2. Update CDN URLs in godotPayloadService.ts");
	console.log("3. Install pako:  npm install pako --save");
	console.log("4. Build and test the app");
}

compressPayloads().catch((error) => {
	console.error("Compression failed:", error);
	process.exit(1);
});
