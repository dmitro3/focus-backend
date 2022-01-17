const fs = require('fs');
const pinataSDK = require("@pinata/sdk");
require('dotenv').config();

const pinata = pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_API_KEY
);

const pinFileToIPFS = async (path, name) => {
  const options = {
    pinataMetadata: {
      name: name,
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  const readableStreamForFile = fs.createReadStream(path);
  try {
    let result = await pinata.pinFileToIPFS(readableStreamForFile, options);
    return result;
  } catch (error) {
    console.log(error);
    return "failed to pin file to ipfs";
  }
};

const pinJsonToIPFS = async (jsonMetadata) => {
  const options = {
    pinataMetadata: jsonMetadata,
    pinataOptions: {
      cidVersion: 0,
    },
  };
  try {
    let result = await pinata.pinJSONToIPFS(jsonMetadata, options);
    return result;
  } catch (error) {
    console.log(error);
    return "failed to pin json to ipfs";
  }
};


module.exports = {
  pinFileToIPFS,
  pinJsonToIPFS
}