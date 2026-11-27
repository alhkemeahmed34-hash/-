import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("assets", { recursive: true });
await sharp("assets/tasnim-icon.svg").resize(1024, 1024).png().toFile("assets/tasnim-icon.png");
await sharp("assets/tasnim-logo.svg").resize({ width: 900, height: 1100, fit: "contain", background: "#FFFFFF" }).png().toFile("assets/tasnim-logo.png");
console.log("Generated Tasnim app icon and full logo assets");
