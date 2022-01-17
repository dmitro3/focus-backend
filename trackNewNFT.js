require("dotenv").config();
const { default: axios } = require("axios");
const ethers = require("ethers");
const mongoose = require("mongoose");
const ERC1155CONTRACT = mongoose.model("ERC1155CONTRACT");
const NFTITEM = mongoose.model("NFTITEM");
const ERC1155HOLDING = mongoose.model("ERC1155HOLDING");
const BannedNFT = mongoose.model("BannedNFT");
const SimplifiedERC1155ABI = require("./constants/simplified1155abi.json");
const provider = new ethers.providers.JsonRpcProvider(
  process.env.NETWORK_RPC,
  parseInt(process.env.NETWORK_CHAINID)
);

const toLowerCase = (val) => {
  if (val) return val.toLowerCase();
  else return val;
};
const validatorAddress = "0x0000000000000000000000000000000000000000";
const trackNewERC1155 = async () => {
  const func = async () => {
    // when there are some untracked addresses
    let address = process.env.NFT_CONTRACT_ADDRESS;
    let abi = SimplifiedERC1155ABI;
    let contract = new ethers.Contract(address, abi, provider);
    // register tracker here
    contract.on("TransferSingle", async (operator, from, to, id, value) => {
      console.log("transfer single");
      operator = operator;
      from = from;
      to = to;
      id = parseFloat(id.toString());
      value = parseFloat(value.toString());
      try {
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // if (from == validatorAddress) {
        //   // this is a new mint
        //   let tk = await NFTITEM.findOne({
        //     contractAddress: address,
        //     tokenID: id,
        //   });
        //   if (!tk) {
        //     try {
        //       let existed = await NFTITEM.findOne({
        //         contractAddress: address,
        //         tokenID: id,
        //       });
        //       console.log(existed);
        //       if (existed) {
        //       } else {
        //         let newTk = new NFTITEM();
        //         newTk.contractAddress = address;
        //         newTk.tokenID = id;
        //         newTk.supply = value;
        //         newTk.createdAt = new Date();
        //         newTk.tokenURI = "https://";
        //         newTk.tokenType = 1155;
        //         newTk.minter = to;
        //         await newTk.save();
        //       }
        //     } catch (error) {
        //       console.log("error in saving new tk in single transfer");
        //       console.log(error);
        //     }
        //     try {
        //       // now update the holdings collection
        //       let holding = new ERC1155HOLDING();
        //       holding.contractAddress = address;
        //       holding.tokenID = id;
        //       holding.holderAddress = to;
        //       holding.supplyPerHolder = value;
        //       await holding.save();
        //     } catch (error) {
        //       console.log("error in saving new holding in single transfer");
        //     }
        //   }
        // } 
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        if (from != validatorAddress) {
          // first deduct from sender - from
          let senderHolding = await ERC1155HOLDING.findOne({
            contractAddress: address,
            tokenID: id,
            holderAddress: from,
          });
          if (senderHolding) {
            try {
              senderHolding.supplyPerHolder = parseInt(
                senderHolding.supplyPerHolder - value
              );
              await senderHolding.save();
            } catch (error) {
              console.log("sender holding save failed");
              console.log(error);
            }
          }
          // now add to receiver - to
          let receiverHolding = await ERC1155HOLDING.findOne({
            contractAddress: address,
            tokenID: id,
            holderAddress: to,
          });
          if (receiverHolding) {
            try {
              receiverHolding.supplyPerHolder =
                parseInt(receiverHolding.supplyPerHolder) + value;
              await receiverHolding.save();
            } catch (error) {
              console.log("receiver holding failed in single transfer");
              console.log(error);
            }
          } else {
            try {
              let _receiverHolding = new ERC1155HOLDING();
              _receiverHolding.contractAddress = address;
              _receiverHolding.tokenID = id;
              _receiverHolding.holderAddress = to;
              _receiverHolding.supplyPerHolder = value;
              await _receiverHolding.save();
            } catch (error) {
              console.log("error in single transfer updating receiver");
              console.log(error);
            }
          }
        }
      } catch (error) {
        console.log("overall error");
        console.log(error);
      }
    });
    contract.on("TransferBatch", async (operator, from, to, ids, values) => {
      let promises = ids.map(async (_, index) => {
        operator = operator;
        from = from;
        to = to;
        let id = ids[index];
        id = parseFloat(id.toString());
        let value = values[index];
        value = parseFloat(value.toString());
        try {
          if (from == validatorAddress) {
            let tk = await NFTITEM.findOne({
              contractAddress: address,
              tokenID: id,
            });
            if (!tk) {
              try {
                let bannedItem = await BannedNFT.findOne({
                  contractAddress: address,
                  tokenID: id,
                });
                if (bannedItem) {
                } else {
                  let newTk = new NFTITEM();
                  newTk.contractAddress = address;
                  newTk.tokenID = id;
                  newTk.supply = value;
                  newTk.createdAt = new Date();
                  newTk.tokenURI = "https://";
                  newTk.tokenType = 1155;
                  newTk.minter = to;
                  await newTk.save();
                }
              } catch (error) {
                console.log("error in saving new tk");
                console.log(error);
              }
              try {
                // update holding here
                let holding = new ERC1155HOLDING();
                holding.contractAddress = address;
                holding.holderAddress = to;
                holding.tokenID = id;
                holding.supplyPerHolder = value;
                await holding.save();
              } catch (error) {
                console.log("single transfer save new holding error");
                console.log(error);
              }
            }
          } else {
            // first deduct from sender - from
            let senderHolding = await ERC1155HOLDING.findOne({
              contractAddress: address,
              tokenID: id,
              holderAddress: from,
            });
            if (senderHolding) {
              try {
                senderHolding.supplyPerHolder = parseInt(
                  senderHolding.supplyPerHolder - value
                );
                await senderHolding.save();
              } catch (error) {
                console.log("error in batch transfer updating existing sender");
                console.log(error);
              }
            }
            // now add to receiver - to
            let receiverHolding = await ERC1155HOLDING.findOne({
              contractAddress: address,
              tokenID: id,
              holderAddress: to,
            });
            if (receiverHolding) {
              try {
                receiverHolding.supplyPerHolder =
                  parseInt(receiverHolding.supplyPerHolder) + value;
                await receiverHolding.save();
              } catch (error) {
                console.log(
                  "error in batch transfer updating receiver holding"
                );
                console.log(error);
              }
            } else {
              try {
                let _receiverHolding = new ERC1155HOLDING();
                _receiverHolding.contractAddress = address;
                _receiverHolding.tokenID = id;
                _receiverHolding.holderAddress = to;
                _receiverHolding.supplyPerHolder = value;
                await _receiverHolding.save();
              } catch (error) {
                console.log("batch transfer cannot save new holding");
                console.log(error);
              }
            }
          }
        } catch (error) {
          console.log("batch transfer error");
          console.log(error);
        }
      });
      Promise.all(promises);
    });

    // contract.on("URI", async (value, id) => {
    //   console.log("uri 1", value, id);

    //   setTimeout(async () => {
    //     id = parseFloat(id.toString());
    //     let tk = await NFTITEM.findOne({
    //       contractAddress: address,
    //       tokenID: id,
    //     });
    //     console.log(tk);
    //     try {

    //       if (!tk) {
    //         let sk = new NFTITEM();
    //         sk.tokenURI = value;
    //         let metadata = await axios.get(value);
    //         sk.imageURL = metadata.data.imageURL;
    //         sk.name = metadata.data.name;
    //         sk.royalty = metadata.data.royalty;
    //         sk.description = metadata.data.description;
    //         await sk.save();
    //       } else {
    //         let _tkURI = tk.tokenURI;

    //         if (_tkURI == "https://") {
    //           tk.tokenURI = value;
    //           let metadata = await axios.get(value);
    //           tk.imageURL = metadata.data.imageURL;
    //           tk.name = metadata.data.name;
    //           tk.royalty = metadata.data.royalty;
    //           tk.description = metadata.data.description;
    //         }
    //         await tk.save();
    //       }
    //     } catch (err) {
    //       console.log(err);
    //     }
    //   }, 1000);
    // });
  };
  func();
};

module.exports = trackNewERC1155;
