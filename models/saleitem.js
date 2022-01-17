const mongoose = require("mongoose");
const SaleItem = mongoose.Schema( 
  {
    contractAddress: { type: String, required: true },
    tokenID: { type: Number, required: true },
    owner: { type: String, required: true },
    quantity: { type: Number },
    pricePerItem: { type: Number },
    startingTime: { type: Number },
    allowedAddress: { type: String },
    itemCollection: { type: String,required: true, default: "-" }
  },
  {
    timestamps: true,
  }
);
SaleItem.index(
  { owner: 1, tokenID: -1, contractAddress: -1 },
  { unique: true }
);
SaleItem.methods.toSimpleJson = function () {
  return {
    contractAddress: this.contractAddress,
    tokenID: this.tokenID,
    owner: this.owner,
    quantity: this.quantity,
    pricePerItem: this.pricePerItem,
    startingTime: this.startingTime,
    allowedAddress: this.allowedAddress,
  };
};
module.exports = mongoose.model("SaleItem", SaleItem);
