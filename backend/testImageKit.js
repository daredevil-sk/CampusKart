require('dotenv').config();
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const testImageKit = async () => {
    try {
        console.log('Testing ImageKit Connection...');
        console.log('Public Key:', process.env.IMAGEKIT_PUBLIC_KEY);
        console.log('URL Endpoint:', process.env.IMAGEKIT_URL_ENDPOINT);
        
        // We test with a sample remote URL provided by ImageKit
        const response = await imagekit.upload({
            file: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png", 
            fileName: "test_upload.png"
        });

        console.log('SUCCESS! Image Uploaded.');
        console.log('File URL:', response.url);
    } catch (error) {
        console.error('FAILURE! Connection failed.');
        console.error('Error Details:', error.message);
    }
};

testImageKit();
