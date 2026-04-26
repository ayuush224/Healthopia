const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToClodinary(req, _res, next) {
    if (!req.file?.path) {
        req.cloudinary = {
            public_id: '',
            secure_url: ''
        };

        next();
        return;
    }

    const localfilePath = req.file.path;

    try {
        const response = await cloudinary.uploader.upload(localfilePath, {
            resource_type: "auto"
        });

        req.cloudinary = {
            public_id: response.public_id,
            secure_url: response.secure_url
        };

        await fs.promises.unlink(localfilePath).catch(() => {});
        next();
        return;
    }
    catch (err) {
        await fs.promises.unlink(localfilePath).catch(() => {});
        next(err);
        return;
    }
}


module.exports = { uploadToClodinary };
