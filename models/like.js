const mongoose = require("mongoose");
const Like = mongoose.Schema(
  {
    address: { type: String, required: true },
    nftitem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NFTITEM",
    },
  },
  {
    timestamps: true,
  }
);
Like.index({ address: 1, nftitem: -1 }, { unique: true });
Like.methods.toSimpleJson = function () {
  return {
    address: this.address,
    nftitem: this.nftitem.toSimpleJson(),
  };
};

module.exports = mongoose.model("Like", Like);
