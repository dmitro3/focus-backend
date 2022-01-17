const mongoose = require("mongoose");
const User = mongoose.Schema(
  {
    address: { type: String, required: true },
    name: { type: String },
    coverImage: { type: String },
    avatar: { type: String },
    twitter: { type: String },
    instagram: { type: String },
    biography: { type: String },
    soldAmount: { type: Number },
  },
  {
    timestamps: true,
  }
);
User.index({ address: 1 }, { unique: true });
User.methods.toSimpleJson = function () {
  return {
    address: this.address,
    avatar: this.avatar,
    name: this.name,
    coverImage: this.coverImage,
    twitter: this.twitter,
    instagram: this.instagram,
    biography: this.biography,
    soldAmount: this.soldAmount,
  };
};

User.methods.toPrimaryJson = function () {
  return {
    address: this.address,
    avatar: this.avatar,
    name: this.name,
    coverImage: this.coverImage,
    biography: this.biography,
    soldAmount: this.soldAmount,
  };
};
module.exports = mongoose.model("User", User);
