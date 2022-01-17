require("dotenv").config();

const fs = require("fs");
const ethers = require("ethers");
const mongoose = require("mongoose");
const User = require("./models/user");
const Collection = require("./models/collection");
const Like = require("./models/like");
const NFTItem = require("./models/nftitem");
const SaleItem = require("./models/saleitem");
const Auction = require("./models/auction");
const BannedNFT = require("./models/bannednft");
const ERC1155Holding = require("./models/erc1155holding");
const ERC1155Contract = require("./models/erc1155contract");
const ERC1155Distribution = require("./trackNFT");
const TrackNewERC1155 = require("./trackNewNFT");
const TrackSaleItem = require("./trackSaleItem");
const TrackAuctions = require("./trackAuctions");
const { pinFileToIPFS, pinJsonToIPFS } = require("./ipfs");
let Contractaddress = process.env.NFT_CONTRACT_ADDRESS;
const contractABI = require("./constants/simplified1155abi.json");
const provider = new ethers.providers.JsonRpcProvider(
  process.env.NETWORK_RPC,
  parseInt(process.env.NETWORK_CHAINID)
);
let contract = new ethers.Contract(Contractaddress, contractABI, provider);


// const certFileBuf = fs.readFileSync("./rds-combined-ca-bundle.pem");

async function TrackNFTFunction() {
  console.log('xdxdxd')
  await mongoose.connect(process.env.MONGO_ADDRESS, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const users = await User.find({});
  for (let i = 0; i < users.length; i++) {
    users[i].address = String(users[i].address);
    await users[i].save();
  }

  console.log("Initalizing NFT distribution");
  await ERC1155Distribution();

  console.log("Listening the events");
  TrackNewERC1155();

  console.log("Tracking SaleItem");
  TrackSaleItem();

  if(process.env.AUCTION_CONTRACT_OWNER_PRIVATE_KEY) {
    console.log("Tracking Auction");
    TrackAuctions();
  } else {
    console.log("missing auction contract address env variable")
  }
}
TrackNFTFunction();

const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const { constants } = require("buffer");
const nftitem = require("./models/nftitem");

app.use(express.json());
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.get("/", function (req, res) {
  res.send("Focus Marketplace Backend Service");
});

app.get("/health", async function (req, res, next) {
  res.send(true)
})
app.post(
  "/upload-file",
  upload.single("avatar"),
  async function (req, res, next) {
    console.log("upload file")
    try {
      const { IpfsHash } = await pinFileToIPFS(
        req.file.path,
        req.file.filename
      );
      fs.unlinkSync(req.file.path);

      return res.status(200).json({ url: `https://ipfs.io/ipfs/${IpfsHash}` });
    } catch (err) {
      return res.status(500).json({ err });
    }
  }
);

app.post("/upload-json", async function (req, res, next) {
  const { json } = req.body;
  const { IpfsHash } = await pinJsonToIPFS(json);

  return res.status(200).json({ url: `https://ipfs.io/ipfs/${IpfsHash}` });
});

app.get("/sale-item", async function (req, res, next) {
  const { page, address, keyword, searchField, filter } = req.query;
  try {
    let result = [];
    let count = 0;

    if (address) {
      if (searchField) {
        result = await SaleItem.find({ owner: address, itemCollection: "-" }).sort({
          [searchField]: filter,
        });
        count = await SaleItem.count({ owner: address, itemCollection: "-" }).sort({
          [searchField]: filter,
        });
      } else {
        result = await SaleItem.find({ owner: address});
        console.log(result)
        count = await SaleItem.count({ owner: address});
      }
    } else {
      result = await SaleItem.find({ itemCollection: "-" })
        .sort({ [searchField]: Number(filter) })
        .limit(15)
        .skip(page * 15);
      count = await SaleItem.count({});
    }

    for (let i = 0; i < result.length; i++) {
      const nftItem = await NFTItem.findOne({ tokenID: result[i].tokenID });
      let ownerInfo;
      let minterInfo;
      try {
        ownerItem = await User.findOne({ address: result[i].owner });
        minterInfo = await User.findOne({ address: nftItem.minter });
      } catch (err) {
        console.log("===sale-item===", err);
      }
      result[i] = {
        ...result[i].toSimpleJson(),
        imageURL: nftItem ? nftItem.imageURL : "",
        tokenURI: nftItem ? nftItem.tokenURI : "",
        name: nftItem ? nftItem.name : "",
        minter: nftItem ? nftItem.minter : "",
        liked: nftItem ? nftItem.liked : "",
        shared: nftItem ? nftItem.shared : "",
        viewed: nftItem ? nftItem.viewed : "",
        ownerAvatar: ownerInfo ? ownerInfo.avatar : "",
        minterAvatar: minterInfo ? minterInfo.avatar : "",
      };
    }
    if (keyword && keyword !== "") {
      result = result.filter((it) =>
        String(it.name).toLowerCase().includes(String(keyword).toLowerCase())
      );
    }

    return res.status(200).json({ items: result, totalCount: count });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
});

app.get("/auction", async function (req, res, next) {
  const { page, address, keyword, searchField, filter } = req.query;
  try {
    let result = [];
    let count = 0;
    if (address) {
      if (searchField) {
        result = await Auction.find({ owner: address }).sort({
          [searchField]: filter,
        });
        count = await Auction.count({ owner: address }).sort({
          [searchField]: filter,
        });
      } else {
        result = await Auction.find({ owner: address });
        count = await Auction.count({ owner: address });
      }
    } else {
      result = await Auction.find({})
        .sort({ [searchField]: Number(filter) })
        .limit(15)
        .skip(page * 15);
      count = await Auction.count({});
    }

    for (let i = 0; i < result.length; i++) {
      const nftItem = await NFTItem.findOne({ tokenID: result[i].tokenID });
      let ownerInfo;
      let minterInfo;
      try {
        ownerItem = await User.findOne({ address: result[i].owner });
        minterInfo = await User.findOne({ address: nftItem.minter });
      } catch (err) {
        console.log("===auction===", err);
      }
      result[i] = {
        ...result[i].toSimpleJson(),
        imageURL: nftItem ? nftItem.imageURL : "",
        tokenURI: nftItem ? nftItem.tokenURI : "",
        name: nftItem ? nftItem.name : "",
        minter: nftItem ? nftItem.minter : "",
        ownerAvatar: ownerInfo ? ownerInfo.avatar : "",
        minterAvatar: minterInfo ? minterInfo.avatar : "",
      };
    }
    if (keyword && keyword !== "") { 
      result = result.filter((it) =>
        String(it.name).toLowerCase().includes(String(keyword).toLowerCase())
      );
    }

    return res.status(200).json({ items: result, totalCount: count });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err });
  }
});

app.get("/collectible", async function (req, res, next) {
  const { tokenID } = req.query;
  try {
    const nftItem = await NFTItem.findOne({ tokenID: tokenID });
    const result = nftItem.toSimpleJson();
    console.log(result)

    return res.status(200).json({ item: result });
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.get("/created", async function (req, res, next) {
  const { minter } = req.query;
  try {
    const nftItems = await NFTItem.find({ minter: minter });

    return res.status(200).json({ items: nftItems });
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.get("/holding", async function (req, res, next) {
  const { address, tokenID } = req.query;

  try {
    let holdings;
    if (tokenID){

        holdings = await ERC1155Holding.find({
        holderAddress: address,
        tokenID: tokenID,
      })

    }else {
      holdings = await ERC1155Holding.find({ holderAddress: address });
    }
    for (let i = 0; i < holdings.length; i++) {
      const nftItem = await NFTItem.findOne({ tokenID: holdings[i].tokenID });
      console.log(nftItem)
      const ownerInfo = await User.findOne({
        address: String(address),
      });
      const minterInfo = await User.findOne({ address: nftItem.minter });
      holdings[i] = {
        ...holdings[i].toSimpleJson(),
        ...nftItem.toSimpleJson(),
        minterAvatar: minterInfo ? minterInfo.avatar : "",
        ownerAvatar: ownerInfo ? ownerInfo.avatar : "",
        ownerName: ownerInfo ? ownerInfo.name : "",
        minterName: minterInfo ? minterInfo.name : "",
        liked:nftItem.liked,
        viewed:nftItem.viewed,

      };
    }
    console.log(holdings)
    return res.status(200).json({ items: holdings });
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.get("/user", async function (req, res, next) {
  const { signature } = req.headers;
  let address = null;

  if (signature) {
    address = await ethers.utils.verifyMessage(
      "We ask you to sign this message to prove ownership of this account.",
      signature
    );

    address = address;
  } else {
    return res.status(401).json({ message: "Authorization Error" });
  }


  if (address) {
    let existingUser = await User.findOne({
      address: address,
    });
    if (existingUser) {
      return res.status(200).json({ user: existingUser.toSimpleJson() });
    } else {
      let newUser = new User();
      newUser.address = address;
      await newUser.save();
      return res.status(200).json({ user: newUser.toSimpleJson() });
    }
  }

  return res.status(200).json({ user: {} });
});

app.get("/account", async function (req, res, next) {
  const { address, keyword } = req.query;

  if (address) {
    let existingUser = await User.findOne({
      address: address,
    });
    if (existingUser) {
      return res.status(200).json({ user: existingUser.toSimpleJson() });
    }
  } else if (keyword || keyword === "") {
    let users = await User.find({});
    if (keyword && keyword !== "") {
      users = users.filter((it) =>
        String(it.name).toLowerCase().includes(String(keyword).toLowerCase())
      );
    }
    users = users.map((it) => it.toPrimaryJson());
    return res.status(200).json({ users: users });
  }

  return res.status(200).json({ user: {} });
});

app.get("/top-sellers", async function (req, res, next) {
  const LIMIT_COUNT = 5;
  let result = await User.find({}).sort({ soldAmount: -1 });
  result = result.map((it) => it.toPrimaryJson()).slice(0, LIMIT_COUNT);

  return res.status(200).json({ items: result });
});

app.post("/user", async function (req, res, next) {
  const { address, avatar, name, coverImage, twitter, instagram, biography, msg } =
    req.body;
  const { signature } = req.headers;

  if (signature) {
    const verifyAddress = await ethers.utils.verifyMessage(
      "We ask you to sign this message to prove ownership of this account.",
      signature
    );
    if (String(verifyAddress).toLowerCase() !== String(address).toLowerCase())
      return res.status(401).json({ message: "Authorization Error" });
  } else {
    return res.status(401).json({ message: "Authorization Error" });
  }

  try {
    let existingUser = await User.findOne({
      address: address,
    });
    if (existingUser) {
      existingUser.avatar = avatar;
      existingUser.coverImage = coverImage;
      existingUser.twitter = twitter;
      existingUser.instagram = instagram;
      existingUser.biography = biography;
      existingUser.name = name;
      existingUser.address = address;
      await existingUser.save();
      return res.status(200).json({ user: existingUser.toSimpleJson() });
    } else {
      let newUser = new User();
      newUser.address = address;
      newUser.name = name;
      newUser.avatar = avatar;
      newUser.coverImage = coverImage;
      newUser.twitter = twitter;
      newUser.instagram = instagram;
      newUser.biography = biography;
      await newUser.save();
      return res.status(200).json({ user: newUser.toSimpleJson() });
    }
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.post("/lazy-mint", async function (req, res, next) {
  let to = req.body.minter;
  let id = req.body.id;
  let value = req.body.value;
  let account = req.body.account;
  let amount = req.body.amount;
  let signature = req.body.signature;
  let name = req.body.name;
  let desc = req.body.desc;
  let startingTime = req.body.startingTime
  let contractAddress = process.env.NFT_CONTRACT_ADDRESS
  let tokenURI = req.body.tokenURI
  let imageURL = req.body.imageURL

  let tk = await NFTItem.findOne({
    contractAddress: contractAddress,
    tokenID: id,
  });
  if (!tk) {
    try {
      let newTk = new NFTItem();
      newTk.contractAddress = contractAddress;
      newTk.tokenID = id;
      newTk.supply = value;
      newTk.createdAt = new Date();
      newTk.tokenURI = tokenURI;
      newTk.imageURL = imageURL;
      newTk.tokenType = 1155;
      newTk.minter = to;
      newTk.name = name;
      newTk.price = amount;
      newTk.description = desc;
      newTk.signature = signature;
      newTk.liked = 0;
      newTk.viewed = 0;
      newTk.shared = 0;
      await newTk.save();
    } catch (error) {
      console.log("error in saving new tk in single transfer");
      console.log(error);
    }
    try {
      // now update the holdings collection
      let holding = new ERC1155Holding();
      holding.contractAddress = contractAddress;
      holding.tokenID = id;
      holding.holderAddress = to;
      holding.supplyPerHolder = value;
      await holding.save();
    } catch (error) {
      console.log("error in saving new holding in single transfer");
    }
  } else {
    res.status(500).json(`NFT with id ${id} already exists`);
  }
})

app.post("/list-item", async (req, res, next) => {
  let owner = req.body.account
  let nft = process.env.NFT_CONTRACT_ADDRESS;
  let tokenId = req.body.id;
  let quantity = req.body.amount;
  let pricePerItem = req.body.value;
  let startingTime = new Date().now;
  let allowedAddress = '0x0000000000000000000000000000000000000000';
  let collection = req.body.collection
  let imageURL = req.body.imageURL;

  let existingCollection = await Collection.findOne({
    name: collection
  });
  console.log(collection)
  try {
    collectionDetails = 0;
    console.log(collection);

    if (!existingCollection && collection != '') {
      let newCollection = new Collection();
      newCollection.address = owner;
      newCollection.name = collection;
      newCollection.imageURL = imageURL
      newCollection.quantity = 0
      await newCollection.save()

      collectionDetails = await Collection.findOne({ name: collection });
      console.log(collectionDetails);
    } else {
      console.log('Collection '+collection+' already exists, adding nft to existing collection!')
      collectionDetails = existingCollection
    }

    let item = await SaleItem.findOne({
      contractAddress: nft,
      tokenID: tokenId,
      owner: owner,
    });
    if (!item) {
      let newOne = new SaleItem();
      newOne.contractAddress = nft;
      newOne.tokenID = tokenId;
      newOne.owner = owner;
      newOne.quantity = quantity;
      newOne.pricePerItem = pricePerItem;
      newOne.startingTime = startingTime;
      newOne.allowedAddress = allowedAddress;
      newOne.createdAt = new Date();
      newOne.itemCollection = collectionDetails ? collectionDetails._id : "-";
      await newOne.save();
    }
  } catch (error) {
    console.log("Error in saving sale item");
    console.log(error);
  }
})

app.post("/get-collections", async (req, res, next) => {
  let result = await Collection.find({ })
  
  res.status(200).send(result)
})

app.post("/collection-items", async (req, res, next) => {
  let { creator, id } = req.body;
  let result = await SaleItem.find({ owner: creator, itemCollection: id })
  let resultAucs = await Auction.find({ owner: creator, itemCollection: id })

  res.status(200).send({ fixedPrice: result, auctions: resultAucs })
})

app.post("/buy-item", async (req, res, next) => {
  console.log('aaa');
  const { id } = req.body;
  let item = await NFTItem.findOne({ tokenId: id });

  res.status(200).json(item)
})

app.post("/like", async function (req, res, next) {
  const { address, msg,nft_id } = req.body;
  const { signature } = req.headers;

  if (signature) {

    let msgHash = await contract.getEthSignedMessageHash(msg)
    let verifySigner = await contract.recoverSigner(msgHash,signature)
    
    if (String(verifySigner).toLowerCase() !== String(address).toLowerCase()) {
      return res.status(401).json({ message: "Authorization Error" });
    }
  } else {
    return res.status(401).json({ message: "Authorization Error" });
  }

  try {
    let nftItem = await NFTItem.findOne({
      tokenID: nft_id
    });

    let existingLike = await Like.findOne({
      address: address,
      nftitem: nftItem._id,
    });

    console.log(nftItem);
    console.log(existingLike);


    if (!existingLike) {

      await NFTItem.updateOne({ tokenID: nft_id }, { liked: nftItem.liked + 1 })

      let newLike = new Like();
      newLike.address = address;
      newLike.nftitem = mongoose.Types.ObjectId(nftItem._id);
      await newLike.save();
      return res.status(200).json({ like: newLike });

    } else {
      await NFTItem.updateOne({ tokenID: nft_id }, { liked: nftItem.liked - 1 })

      await Like.deleteOne({ address: address, nftitem: nftItem._id })

      return res.status(200).json("The like has been deleted");
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

app.post("/dislike", async function (req, res, next) {
  const { address, nft_id, msg } = req.body;
  const { signature } = req.headers;

  if (signature) {

    let msgHash = await contract.getEthSignedMessageHash(msg)
    let verifySigner = await contract.recoverSigner(msgHash,signature)
    
    if (String(verifySigner).toLowerCase() !== String(address).toLowerCase()) {
      return res.status(401).json({ message: "Authorization Error" });
    }

  } else {
    return res.status(401).json({ message: "Authorization Error" });
  }

  try {
    let existingLike = await Like.findOne({
      address: address,
      nftitem: nft_id,
    });
    if (existingLike) {
      await newLike.remove();
      return res.status(200).json({ response: true });
    }
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.get("/like", async function (req, res, next) {
  const { address } = req.query;

  try {
    let likes = await Like.find({
      address: address,
    });
    likes = likes.map((it) => it.toSimpleJson());
    if (likes) return res.status(200).json({ likes: likes });
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.post("/viewed", async function (req, res, next) {
  const { nft_id } = req.body;

  if (nft_id != null) {
    let nftItem = await NFTItem.findOne({
      tokenID: nft_id
    });

    
    await NFTItem.updateOne({ tokenID: nft_id }, { viewed: nftItem.viewed + 1 }).catch((err) => {
      console.log("error on line 483");
    })
  }  
})

app.post("/shared", async function (req, res, next) {
  const { nft_id } = req.query;
  console.log('a');

  if (nft_id != null) {
    let nftItem = await NFTItem.findOne({
      tokenID: nft_id
    });
    await NFTItem.updateOne({ tokenID: nft_id }, { shared: nftItem.shared + 1 }).then((result) => {
      res.status(200).json('Success');
    }).catch((err) => {
      console.log("error on line 483");
      res.status(500).json("Error");
    })
  } else {
 
    res.status(500).json("Pass the arguments correctly");

  } 
})

app.listen(process.env.PORT);