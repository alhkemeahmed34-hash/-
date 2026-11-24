import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("assets", { recursive: true });
await sharp("assets/tasnim-icon.svg").resize(1024, 1024).png().toFile("assets/tasnim-icon.png");
console.log("Generated assets/tasnim-icon.png");
