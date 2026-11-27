import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("assets", { recursive: true });
const original = "assets/tasnim-original.svg";
await sharp(original).resize(2048, 2048, { fit: "contain", background: "#FFFFFF", kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile("assets/tasnim-icon.png");
await sharp(original).resize({ width: 1800, height: 2200, fit: "contain", background: "#FFFFFF", kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile("assets/tasnim-logo.png");
console.log("Generated app icon and splash from the approved original Tasnim logo");
