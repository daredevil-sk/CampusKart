const ImageKit = require('imagekit');
const multer = require('multer');

// Initialize ImageKit with user's credentials from .env
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Configure Multer with strict 10MB file size limit to prevent server overload
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 1MB limit
});

// Helper function to handle the ImageKit upload process
const uploadToImageKit = async (file) => {
    try {
        const response = await imagekit.upload({
            file: file.buffer.toString('base64'), // ImageKit expects base64 or file path
            fileName: `${Date.now()}-${file.originalname}`,
            folder: '/campuskart_products',
            useUniqueFileName: true
        });
        return response.url;
    } catch (error) {
        console.error('ImageKit Upload Error:', error);
        throw new Error('Failed to upload image to ImageKit');
    }
};

module.exports = { upload, uploadToImageKit };
