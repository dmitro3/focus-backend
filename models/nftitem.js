const mongoose = require("mongoose");
const NFTITEM = mongoose.Schema(
  {
    contractAddress: { type: String, required: true },
    tokenID: { type: Number, required: true },
    tokenURI: { type: String, required: true },
    imageURL: { type: String },
    thumbnailPath: { type: String, default: "-" },
    symbol: { type: String },
    name: { type: String }, //for search filter
    minter: { type: String },
    description: { type: String },
    supply: { type: Number, default: 1 },
    royalty: { type: Number, default: 0 },
    category: [{ type: String }],
    price: { type: Number, default: 0 }, //for most expensive
    lastSalePrice: { type: Number, default: 0 }, //for highest last sale price
    viewed: { type: Number, default: 0 }, //for mostly viewed
    createdAt: { type: Date }, //for recently created
    listedAt: { type: Date }, //for recently listed
    soldAt: { type: Date }, //for recently sold
    saleEndsAt: { type: Date }, //for auction
    tokenType: { type: Number, default: 1155 },
    liked: { type: Number, default: 0, index: true },
    shared: {type: Number, default: 0},
    signature: { type: String, default: "" }
  },
  {
    timestamps: true,
  }
);

NFTITEM.index(
  { tokenURI: 1, tokenID: -1, contractAddress: -1 },
  { unique: true }
);

NFTITEM.methods.toSimpleJson = function () {
  return {
    contractAddress: this.contractAddress,
    tokenID: this.tokenID,
    minter: this.minter,
    tokenURI: this.tokenURI,
    price: this.price,
    imageURL: this.imageURL,
    name: this.name,
    supply: this.supply,
    description: this.description,
    shared: this.shared,
    viewed: this.viewed,
    liked: this.liked,
    signature: this.signature
  };
};
module.exports = mongoose.model("NFTITEM", NFTITEM);
