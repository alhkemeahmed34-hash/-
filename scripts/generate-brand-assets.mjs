import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("assets", { recursive: true });
const original = "assets/tasnim-original.svg";
await sharp(original).resize(1024, 1024, { fit: "contain", background: "#FFFFFF" }).png().toFile("assets/tasnim-icon.png");
await sharp(original).resize({ width: 900, height: 1100, fit: "contain", background: "#FFFFFF" }).png().toFile("assets/tasnim-logo.png");
console.log("Generated app icon and splash from the approved original Tasnim logo");
