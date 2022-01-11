import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import testData from "./fixtures/sample-nft-metadata.json";

// Token metadata
const tokenName = "AcademyToken";
const tokenSymbol = "ACDM";
const decimals = 18;
const tenTokens = ethers.utils.parseUnits("10.0", decimals);
const twentyTokens = ethers.utils.parseUnits("20.0", decimals);

// NFT metadata
const nftName = "EssentialImages";
const nftSymbol = "EI";

// Test data
const biddingTime = 259200; // 3 days in seconds
const zeroAddr = ethers.constants.AddressZero;
const birdURI: string = testData.bird.metadata;
const coronaURI: string = testData.corona.metadata;
const firstItem = 1;
const secondItem = 2;
const firstOrder = 1;
const secondOrder = 2;

// AccessControl roles in bytes32 string
// DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE, CREATOR_ROLE
const adminRole = ethers.constants.HashZero;
const minterRole = ethers.utils.solidityKeccak256(["string"], ["MINTER_ROLE"]);
const burnerRole = ethers.utils.solidityKeccak256(["string"], ["BURNER_ROLE"]);
const creatorRole = ethers.utils.solidityKeccak256(["string"], ["CREATOR_ROLE"]);

describe("Marketplace", function () {
  let mp: Contract,
    acdmToken: Contract,
    nft: Contract,
    Marketplace: ContractFactory,
    ACDMtoken: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    ACDMtoken = await ethers.getContractFactory(tokenName);
    Marketplace = await ethers.getContractFactory("Marketplace");
  });

  beforeEach(async () => {
    // Deploy token
    acdmToken = await ACDMtoken.deploy(tokenName, tokenSymbol);
    await acdmToken.deployed();

    // Deploy Marketplace & NFT contract, set CREATOR_ROLE to Alice
    mp = await Marketplace.deploy(
      biddingTime,
      acdmToken.address,
      alice.address,
      nftName,
      nftSymbol
    );
    await mp.deployed();

    // Getting NFT contract
    const nftAddr: string = await mp.acdmItems();
    nft = await ethers.getContractAt(nftName, nftAddr);

    // Grant Minter & Burner role to admin
    await acdmToken.grantRole(minterRole, owner.address);
    await acdmToken.grantRole(burnerRole, owner.address);

    // Mint some tokens
    await acdmToken.mint(owner.address, twentyTokens);
    await acdmToken.mint(alice.address, twentyTokens);
  });

  describe("Deployment", function () {
    it("Should set Marketplace as NFT contract owner", async () => {
      expect(await nft.owner()).to.equal(mp.address);
    });

    it("Should set right acdmToken owner", async () => {
      expect(await acdmToken.hasRole(adminRole, owner.address)).to.equal(true);
    });

    it("Should set right acdmToken contract address", async () => {
      expect(await mp.acdmToken()).to.be.equal(acdmToken.address);
    });

    it("Should set right NFT contract address", async () => {
      expect(await mp.acdmItems()).to.be.equal(nft.address);
    });

    it("Should set right bidding time", async () => {
      expect(await mp.biddingTime()).to.be.equal(biddingTime);
    });

    it("Roles should be set correctly", async () => {
      expect(await mp.hasRole(creatorRole, alice.address)).to.equal(true);
      expect(await acdmToken.hasRole(minterRole, owner.address)).to.equal(true);
      expect(await acdmToken.hasRole(burnerRole, owner.address)).to.equal(true);
    });
  });

  describe("Pausable", function () {
    it("Should be able to pause & unpause contract", async () => {
      await mp.pause();
      await expect(mp.changeBiddingTime(biddingTime)).to.be.revertedWith(
        "Pausable: paused"
      );
      await mp.unpause();
      await mp.changeBiddingTime(biddingTime);
    });

    it("Only admin should be able to pause contract", async () => {
      await expect(mp.connect(alice).pause()).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });
  });

  describe("Creating items", function () {
    it("Only address with CREATOR_ROLE should be able to create item", async () => {
      await expect(mp.createItem(owner.address, birdURI)).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${creatorRole}`
      );
    });

    it("Creator should be able to create item", async () => {
      await expect(mp.connect(alice).createItem(owner.address, birdURI))
        .and.to.emit(nft, "Transfer")
        .withArgs(zeroAddr, owner.address, firstItem);

      expect(await nft.tokenURI(firstItem)).to.equal(birdURI);
    });
  });

  describe("Fixed price market order", function () {
    beforeEach(async () => {
      // Minting 2 items
      await mp.connect(alice).createItem(owner.address, birdURI);
      await mp.connect(alice).createItem(alice.address, coronaURI);

      // Approving owner's item to Marketplace
      await nft.approve(mp.address, firstItem);
      await nft.connect(alice).approve(mp.address, secondItem);

      // Listing first item
      await mp.listFixedPrice(firstItem, twentyTokens);

      // Approving tokens
      await acdmToken.approve(mp.address, tenTokens);
      await acdmToken.connect(alice).approve(mp.address, twentyTokens);
    });

    describe("Listing item", function () {
      it("Can't place order with zero price", async () => {
        await expect(mp.listFixedPrice(firstItem, 0)).to.be.revertedWith(
          "Base price can't be zero"
        );
      });

      it("Listing emits events", async () => {
        await expect(mp.connect(alice).listFixedPrice(secondItem, tenTokens))
          .to.emit(mp, "PlacedOrder")
          .withArgs(secondOrder, secondItem, alice.address, tenTokens)
          .and.to.emit(nft, "Transfer")
          .withArgs(alice.address, mp.address, secondItem);
      });
    });

    describe("Cancelling order", function () {
      it("Can cancel only own order", async () => {
        await expect(mp.connect(alice).cancelOrder(firstOrder)).to.be.revertedWith(
          "Not the creator of the order"
        );
      });

      it("Cancelling order emits events", async () => {
        await expect(mp.cancelOrder(firstOrder))
          .to.emit(mp, "CancelledOrder")
          .withArgs(firstOrder, owner.address)
          .and.to.emit(nft, "Transfer")
          .withArgs(mp.address, owner.address, firstItem);
      });
    });

    describe("Buying", function () {
      it("Can't buy from yourself", async () => {
        await expect(mp.buyOrder(firstOrder)).to.be.revertedWith(
          "Can't buy from yourself"
        );
      });

      it("Buying emits events", async () => {
        await expect(mp.connect(alice).buyOrder(firstOrder))
          .to.emit(mp, "Purchase")
          .withArgs(firstOrder, firstItem, owner.address, alice.address, twentyTokens)
          .and.to.emit(nft, "Transfer")
          .withArgs(mp.address, alice.address, firstItem)
          .and.to.emit(acdmToken, "Transfer")
          .withArgs(alice.address, owner.address, twentyTokens);
      });
    });
  });

  // describe("Getters", function () {
  //   beforeEach(async () => {
  //     // Minting 2 items
  //     await mp.connect(alice).createItem(owner.address, birdURI);
  //     await mp.connect(alice).createItem(alice.address, coronaURI);
  //     // Approving & listing first item
  //     await nft.approve(mp.address, firstItem);
  //     await mp.listItem(firstItem, twentyTokens);
  //   });

  //   it("Should be able to get all listed items", async () => {
  //     // Some crazy experiments
  //     // console.log(await mp.estimateGas.getAllListedItems());
  //     // for (let i = 3; i < 3400; i += 1) {
  //     //   await mp.createItem(owner.address, birdURI);
  //     //   await nft.approve(mp.address, i);
  //     //   await mp.listItem(i, tenTokens);
  //     // }
  //     // console.log("Done!");
  //     // console.log(await mp.estimateGas.getAllListedItems());
  //     const items = await mp.getListedItems();
  //     expect(items.length).to.be.equal(1);
  //     expect(items[0].price).to.be.equal(twentyTokens);
  //     expect(items[0].owner).to.be.equal(owner.address);
  //   }).timeout(240000);

  //   it("Should be able to check if item is listed", async () => {
  //     expect(await mp.isListed(firstItem)).to.be.equal(true);
  //     expect(await mp.isListed(secondItem)).to.be.equal(false);
  //   });

  //   it("Should be able to get items by itemId", async () => {
  //     const item = await mp.listedItems(firstItem);
  //     expect(item.price).to.be.equal(twentyTokens);
  //     expect(item.owner).to.be.equal(owner.address);
  //   });
  // });
});
