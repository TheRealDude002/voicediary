// src/config/cloudinary.js
// Cloudinary client — used for audio file storage. Audio is uploaded
// with `resource_type: "video"` (Cloudinary treats audio as a sub-type
// of video).

import { v2 as cloudinary } from "cloudinary";
import { config } from "./env.js";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };
