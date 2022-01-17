const mongoose = require("mongoose");
const Collection = mongoose.Schema(
  {
    address: { type: String, sparse: true },
    name: { type: String , unique:true},
    imageURL: { type: String },
    quantity: { type: Number }
  },
  {
    timestamps: true,
  }
);

Collection.index({ address: 1 }, { unique: true });

Collection.methods.toSimpleJson = function () {
  return {
    address: this.address,
    name: this.name,
    imageURL: this.imageURL,
    quantity: this.quantity
  };
};

module.exports = mongoose.model("Collection", Collection);
