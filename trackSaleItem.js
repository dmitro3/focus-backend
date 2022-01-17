require("dotenv").config();
const { default: axios } = require("axios");
const ethers = require("ethers");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const SaleItem = mongoose.model("SaleItem");
const FocusMarketplaceABI = require("./constants/FocusMarketplace.json");
const provider = new ethers.providers.JsonRpcProvider(
  process.env.NETWORK_RPC,
  parseInt(process.env.NETWORK_CHAINID)
);
const toLowerCase = (val) => {
  if (val) return val.toLowerCase();
  else return val;
};
const validatorAddress = "0x0000000000000000000000000000000000000000";
const trackSaleItem = async () => {
  const func = async () => {
    // when there are some untracked addresses
    let contract = new ethers.Contract(
      process.env.MARKETPLACE_CONTRACT_ADDRESS,
      FocusMarketplaceABI,
      provider
    );
    // register tracker here
    contract.on(
      "ItemListed",
      async (
        owner,
        nft,
        tokenId,
        quantity,
        pricePerItem,
        startingTime,
        isPrivate,
        allowedAddress
      ) => {
        // console.log(
        //   `ItemListed: ${owner} ${nft} ${tokenId} ${quantity} ${pricePerItem} ${startingTime} ${isPrivate} ${allowedAddress}`
        // );
        // owner = toLowerCase(owner);
        // nft = toLowerCase(nft);
        // tokenId = parseFloat(tokenId.toString());
        // quantity = parseFloat(quantity.toString());
        // pricePerItem = parseFloat(pricePerItem.toString());
        // startingTime = parseFloat(startingTime.toString());
        // allowedAddress = toLowerCase(allowedAddress);
        // try {
        //   let tk = await SaleItem.findOne({
        //     contractAddress: nft,
        //     tokenID: tokenId,
        //     owner: owner,
        //   });
        //   if (!tk) {
        //     let newOne = new SaleItem();
        //     newOne.contractAddress = nft;
        //     newOne.tokenID = tokenId;
        //     newOne.owner = owner;
        //     newOne.quantity = quantity;
        //     newOne.pricePerItem = pricePerItem;
        //     newOne.startingTime = startingTime;
        //     newOne.allowedAddress = allowedAddress;
        //     newOne.createdAt = new Date();
        //     await newOne.save();
        //   } else {
        //     tk.contractAddress = nft;
        //     tk.tokenID = tokenId;
        //     tk.owner = owner;
        //     tk.quantity = quantity;
        //     tk.pricePerItem = pricePerItem;
        //     tk.startingTime = startingTime;
        //     tk.allowedAddress = allowedAddress;
        //     tk.updatedAt = new Date();
        //     await tk.save();
        //   }
        // } catch (error) {
        //   console.log("overall error");
        //   console.log(error);
        // }
      }
    );
    contract.on(
      "ItemSold",
      async (seller, buyer, nft, tokenId, quantity, price) => {
        console.log(
          `ItemSold: ${seller} ${buyer} ${nft} ${tokenId} ${quantity} ${price}`
        );
        seller = seller;
        buyer = buyer;
        nft = nft;
        tokenId = parseFloat(tokenId.toString());
        quantity = parseFloat(quantity.toString());
        price = parseFloat(price.toString());

        try {
          let tk = await SaleItem.findOne({
            contractAddress: nft,
            tokenID: tokenId,
            owner: seller,
          });
          if (tk.quantity - quantity <= 0) {
            await tk.remove();
          } else {
            tk.quantity = tk.quantity - quantity;
            await tk.save();
          }
        } catch (error) {
          console.log("overall error");
          console.log(error);
        }

        try {
          let user = await User.findOne({
            address: seller,
          });
          if (user) {
            user.soldAmount = Number.isNaN(user.soldAmount)
              ? Number(user.soldAmount) + Number(quantity) * Number(price)
              : Number(quantity) * Number(price);
          } else {
            user = new User();
            user.address = seller;
            user.soldAmount = Number(quantity) * Number(price);
          }
          await user.save();
        } catch (error) {
          console.log("overall error");
          console.log(error);
        }
      }
    );
    contract.on("ItemCanceled", async (owner, nft, tokenId) => {
      console.log(`ItemCanceled: ${owner} ${nft} ${tokenId}`);
      owner = owner;
      nft = nft;
      tokenId = parseFloat(tokenId.toString());
      try {
        let tk = await SaleItem.findOne({
          contractAddress: nft,
          tokenID: tokenId,
          owner: owner,
        });
        if (tk) {
          await tk.remove();
        }
      } catch (error) {
        console.log("overall error");
        console.log(error);
      }
    });
    contract.on("ItemUpdated", async (owner, nft, tokenId, newPrice) => {
      console.log(`ItemUpdated: ${owner} ${nft} ${tokenId} ${newPrice}`);
      owner = owner;
      nft = nft;
      tokenId = parseFloat(tokenId.toString());
      newPrice = parseFloat(newPrice.toString());
      try {
        let tk = await SaleItem.findOne({
          contractAddress: nft,
          tokenID: tokenId,
          owner: owner,
        });
        if (tk) {
          tk.pricePerItem = newPrice;
          await tk.save();
        } else {
          let newOne = new SaleItem();
          newOne.contractAddress = nft;
          newOne.tokenID = tokenId;
          newOne.owner = owner;
          newOne.quantity = 1;
          newOne.pricePerItem = newPrice;
          newOne.startingTime = new Date().getTime() / 1000;
          newOne.allowedAddress = validatorAddress;
          newOne.createdAt = new Date();
          await newOne.save();
        }
      } catch (error) {
        console.log("overall error");
        console.log(error);
      }
    });
  };
  func();
};
module.exports = trackSaleItem;