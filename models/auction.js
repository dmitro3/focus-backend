const mongoose = require("mongoose");
const Auction = mongoose.Schema(
  {
    contractAddress: { type: String, required: true },
    tokenID: { type: Number, required: true },
    owner: { type: String, required: true },
    quantity: { type: Number },
    initialPrice: { type: Number },
    highestBid: { type: Number },
    startTime: { type: Number },
    endTime: { type: Number },
    minBidDifference: { type: Number },
    canceled: { type: Boolean },
    finalizedFailed: { type: Number },
    itemCollection: {type: String, default: "-" }
  },
  {
    timestamps: true,
  }
);
Auction.index(
  { seller: 1, tokenID: -1, contractAddress: -1 },
  { unique: true }
);
Auction.methods.toSimpleJson = function () {
  return {
    contractAddress: this.contractAddress,
    tokenID: this.tokenID,
    owner: this.owner,
    quantity: this.quantity,
    initialPrice: this.initialPrice,
    highestBid: this.highestBid,
    startTime: this.startTime,
    endTime: this.endTime,
    minBidDifference: this.minBidDifference,
    canceled: this.canceled,
    finalizedFailed: this.finalizedFailed,
    itemCollection: this.itemCollection
  };
};
module.exports = mongoose.model("Auction", Auction);
