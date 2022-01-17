require("dotenv").config();
const { default: axios } = require("axios");
const ethers = require("ethers");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Auction = mongoose.model("Auction");
const FocusAuctionABI = require("./constants/FocusAuction.json");
const provider = new ethers.providers.JsonRpcProvider(
  process.env.NETWORK_RPC,
  parseInt(process.env.NETWORK_CHAINID)
);


const toLowerCase = (val) => {
  if (val) return val.toLowerCase();
  else return val;
};




const trackAuctions = async () => {
  const wallet = (new ethers.Wallet(process.env.AUCTION_CONTRACT_OWNER_PRIVATE_KEY)).connect(provider)
  
  const func = async () => {
    // when there are some untracked addresses
    let contract = new ethers.Contract(
      process.env.AUCTION_CONTRACT_ADDRESS,
      FocusAuctionABI,
      wallet
    );

    async function finalizeAuctions() {
      const nowInSenconds = parseInt(Date.now() / 1000)
      const auctions = await Auction.find({
        endTime: { $lt: nowInSenconds },
        canceled: false,
        finalizedFailed: { $lt: 3 }
      })

      // console.log(auctions)

      auctions.forEach(async (auction) => {
        try {
          await contract.finalizeAuction(auction.contractAddress, auction.tokenID)
          console.log("auction finalized", auction.contractAddress, auction.tokenID)
          try {
          let user = await User.findOne({
            address: auction.owner,
          });
          const thisItemAmountSold = Number(auction.quantity) * Number(auction.highestBid)
          if (user) {
            user.soldAmount = Number(user.soldAmount) || 0 + thisItemAmountSold
          } else {
            user = new User();
            user.address = seller;
            user.soldAmount = thisItemAmountSold
          }
          await user.save();
        } catch (error) {
          console.log("overall error");
          console.log(error);
        }
          await auction.remove()
        } catch (e) {
          console.error(e)
          auction.finalizedFailed += 1
          await auction.save()
        }
      })
    }


    setInterval(finalizeAuctions, 60 * 1000)
    finalizeAuctions()
  
    // register tracker here
    contract.on(
      "AuctionCreated",
      async (
        nftAddress,
        tokenId,
        seller,
        startTime,
        endTime,
        initialPrice,
        prolongEndTimeAtBidBySeconds,
        minBidDifference,
        amount
      ) => {
        console.log(
          `AuctionCreated: ${nftAddress} ${tokenId} ${seller} ${startTime} ${endTime} ${initialPrice} ${prolongEndTimeAtBidBySeconds} ${minBidDifference} ${amount}`
        );

        nftAddress = nftAddress;
        tokenId = parseFloat(tokenId.toString());
        seller = seller;
        startTime = parseFloat(startTime.toString());
        endTime = parseFloat(endTime.toString());
        initialPrice = parseFloat(initialPrice.toString());
        prolongEndTimeAtBidBySeconds = parseFloat(prolongEndTimeAtBidBySeconds.toString());
        minBidDifference = parseFloat(minBidDifference.toString());
        amount = parseFloat(amount.toString());

        try {
          let auction = await Auction.findOne({
            contractAddress: nftAddress,
            tokenID: tokenId,
            seller: seller,
          });
          if (!auction) {
            let newOne = new Auction();

            newOne.contractAddress = nftAddress
            newOne.tokenID = tokenId
            newOne.owner = seller
            newOne.quantity = amount
            newOne.initialPrice = initialPrice
            newOne.highestBid = 0
            newOne.startTime = startTime
            newOne.endTime = endTime
            newOne.minBidDifference = minBidDifference
            newOne.canceled = false
            newOne.finalizedFailed = 0

            newOne.createdAt = new Date();

            await newOne.save();
          } else {
            auction.contractAddress = nftAddress
            auction.tokenID = tokenId
            auction.owner = seller
            auction.quantity = amount
            auction.initialPrice = initialPrice
            auction.highestBid = 0
            auction.startTime = startTime
            auction.endTime = endTime
            auction.minBidDifference = minBidDifference
            auction.finalizedFailed = 0

            auction.updatedAt = new Date();
            await auction.save();
          }
        } catch (error) {
          console.log("overall error");
          console.log(error);
        }
      }
    )


    contract.on(
      "AuctionCanceled",
      async (
        nftAddress,
        tokenId
      ) => {
        console.log(
          `AuctionCanceled: ${nftAddress} ${tokenId}`
        );

        nftAddress = nftAddress;
        tokenId = parseFloat(tokenId.toString());


        try {
          let auction = await Auction.findOne({
            contractAddress: contractAddress,
            tokenID: tokenId,
            seller: seller,
          });
          if (!auction) {
            return
          } else {
            auction.canceled = true

            auction.updatedAt = new Date();
            await auction.save();
          }
        } catch (error) {
          console.log("overall error");
          console.log(error);
        }
      }
    )
    
    

    contract.on(
      "BidPlaced",
      async (
        nftAddress,
        tokenId,
        bidder,
        value,
        fullBid,
        endTime,
        seller
      ) => {
        console.log(
          `BidPlaced: ${seller} ${bidder} ${nftAddress} ${tokenId} ${value} ${fullBid}`
        );


        seller = seller;
        // bidder = bidder;
        nftAddress = nftAddress;
        tokenId = parseFloat(tokenId.toString());
        // quantity = parseFloat(quantity.toString());
        // price = parseFloat(price.toString());
        endTime = parseFloat(endTime.toString());

        try {
          let auction = await Auction.findOne({
            contractAddress: nftAddress,
            tokenID: tokenId,
            owner: seller,
          });
          

          if(!auction) {
            return
          }

          auction.highestBid = fullBid
          auction.endTime = endTime

          auction.save()
        } catch (error) {
          

          console.log("overall error");
          console.log(error);
        }
      }
    );
    

  };
  func();
};
module.exports = trackAuctions;
