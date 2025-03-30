import { v2 as cloudinary } from "cloudinary";
import { env } from "process";

cloudinary.config({
    cloud_name: env.CLOUD_NAME,
    api_key: env.API_KEY,
    api_secret: env.API_SECRET,
    secure: true,
});

class CloudFileHandling {
    async uploadFile(path) {
        try {
            const result = await cloudinary.uploader.upload(path, {
                use_filename: true,
                unique_filename: true,
                resource_type: "raw",
            });

            console.log(result);

            return {
                cloudPublicId: result.public_id,
                cloudUrl: result.secure_url,
            };
        } catch (error) {
            console.log(error);
        }
    }

    async deleteFile(publicId) {
        try {
            let result = "";

            if (Array.isArray(publicId)) {
                if (publicId.length > 100) {
                    // Loop needed for this "case"

                    return;
                }

                result = await cloudinary.api.delete_resources(publicId, {
                    resource_type: "raw",
                });
            } else {
                result = await cloudinary.uploader.destroy(publicId, {
                    resource_type: "raw",
                });
            }

            console.log(result);
        } catch (error) {
            console.log(error);
        }
    }
}

export let cloudFileHandling = new CloudFileHandling();
