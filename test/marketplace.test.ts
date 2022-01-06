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
const zeroAddr = ethers.constants.AddressZero;
const birdURI: string = testData.bird.metadata;
const coronaURI: string = testData.corona.metadata;
const firstItem = 1;
const secondItem = 2;

// AccessControl roles in bytes32 string
// DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE
const adminRole = ethers.constants.HashZero;
const minterRole = ethers.utils.solidityKeccak256(["string"], ["MINTER_ROLE"]);
const burnerRole = ethers.utils.solidityKeccak256(["string"], ["BURNER_ROLE"]);

describe("Marketplace", function () {
  let mp: Contract,
    acdmToken: Contract,
    nft: Contract,
    Marketplace: ContractFactory,
    ACDMtoken: ContractFactory,
    ACDM721: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    ACDMtoken = await ethers.getContractFactory(tokenName);
    ACDM721 = await ethers.getContractFactory(nftName);
    Marketplace = await ethers.getContractFactory("Marketplace");
  });

  beforeEach(async () => {
    // Deploy token
    acdmToken = await ACDMtoken.deploy(tokenName, tokenSymbol);
    await acdmToken.deployed();

    // Deploy nft
    nft = await ACDM721.deploy(nftName, nftSymbol);
    await nft.deployed();

    // Deploy Marketplace contract
    mp = await Marketplace.deploy(acdmToken.address, nft.address);
    await mp.deployed();

    // Grant Minter & Burner role to admin
    await acdmToken.grantRole(minterRole, owner.address);
    await acdmToken.grantRole(burnerRole, owner.address);

    // Mint some tokens
    await acdmToken.mint(owner.address, twentyTokens);
    await acdmToken.mint(alice.address, twentyTokens);

    // Transfer NFT ownership to Marketplace
    nft.initMarketplace(mp.address);
  });

  describe("Deployment", function () {
    it("Should set Marketplace as NFT contract owner", async () => {
      expect(await nft.owner()).to.equal(mp.address);
    });

    it("Should set right Marketplace owner", async () => {
      expect(await mp.owner()).to.equal(owner.address);
    });

    it("Should set right Token owner", async () => {
      expect(await acdmToken.hasRole(adminRole, owner.address)).to.equal(true);
    });

    it("Should set right token contract address", async () => {
      expect(await mp.token()).to.be.equal(acdmToken.address);
    });

    it("Should set right NFT contract address", async () => {
      expect(await mp.nft()).to.be.equal(nft.address);
    });

    it("Should set minter & burner role to owner", async () => {
      expect(await acdmToken.hasRole(minterRole, owner.address)).to.equal(true);
      expect(await acdmToken.hasRole(burnerRole, owner.address)).to.equal(true);
    });

    it("Non owner should not be able to init Marketplace", async () => {
      await expect(nft.connect(alice).initMarketplace(mp.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Ownership", function () {
    it("Non owner should not be able to init Marketplace", async () => {
      await expect(nft.connect(alice).initMarketplace(mp.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Pausable", function () {
    it("Should be able to pause & unpause contract", async () => {
      await mp.pause();
      await expect(mp.createItem(owner.address, birdURI)).to.be.revertedWith(
        "Pausable: paused"
      );
      await mp.unpause();
      await mp.createItem(owner.address, birdURI);
    });

    it("Only admin should be able to pause contract", async () => {
      await expect(mp.connect(alice).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Creating items", function () {
    it("Only owner should be able to create item", async () => {
      await expect(
        mp.connect(alice).createItem(owner.address, birdURI)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should be able to create item", async () => {
      await expect(mp.createItem(owner.address, birdURI))
        .to.emit(mp, "CreatedItem")
        .withArgs(owner.address, owner.address, firstItem)
        .and.to.emit(nft, "Transfer")
        .withArgs(zeroAddr, owner.address, firstItem);

      expect(await nft.tokenURI(firstItem)).to.equal(birdURI);
    });
  });

  describe("Listing items", function () {
    beforeEach(async () => {
      // Minting 2 items
      await mp.createItem(owner.address, birdURI);
      await mp.createItem(alice.address, coronaURI);

      // Approving owner's item to Marketplace
      await nft.approve(mp.address, firstItem);
    });

    it("Can't list an unapproved item", async () => {
      await expect(mp.listItem(secondItem, tenTokens)).to.be.revertedWith(
        "ERC721: transfer caller is not owner nor approved"
      );
    });

    it("Can't list with zero price", async () => {
      await expect(mp.listItem(firstItem, 0)).to.be.revertedWith("Price can't be zero");
    });

    it("Listing emits events", async () => {
      await expect(mp.listItem(firstItem, tenTokens))
        .to.emit(mp, "ListedItem")
        .withArgs(firstItem, owner.address, tenTokens)
        .and.to.emit(nft, "Transfer")
        .withArgs(owner.address, mp.address, firstItem);
    });

    it("Can't list item twice", async () => {
      await mp.listItem(firstItem, tenTokens);
      await expect(mp.listItem(firstItem, tenTokens)).to.be.revertedWith(
        "ERC721: transfer of token that is not own"
      );
    });

    describe("Delisting", function () {
      it("Can delist only own items", async () => {
        await mp.listItem(firstItem, tenTokens);
        await expect(mp.connect(alice).cancel(firstItem)).to.be.revertedWith(
          "Not your item"
        );
      });

      it("Delisting emits events", async () => {
        await mp.listItem(firstItem, tenTokens);
        await expect(mp.cancel(firstItem))
          .to.emit(mp, "CancelListing")
          .withArgs(firstItem, owner.address)
          .and.to.emit(nft, "Transfer")
          .withArgs(mp.address, owner.address, firstItem);
      });
    });
  });

  describe("Buying items", function () {
    beforeEach(async () => {
      // Minting 2 items
      await mp.createItem(owner.address, birdURI);
      await mp.createItem(alice.address, coronaURI);
      // Approving items to Marketplace
      await nft.approve(mp.address, firstItem);
      await nft.connect(alice).approve(mp.address, secondItem);
      // Listing items
      await mp.listItem(firstItem, twentyTokens);
      await mp.connect(alice).listItem(secondItem, twentyTokens);
      // Approve tokens
      await acdmToken.approve(mp.address, tenTokens);
      await acdmToken.connect(alice).approve(mp.address, twentyTokens);
    });

    it("Can't buy from yourself", async () => {
      await expect(mp.buyItem(firstItem)).to.be.revertedWith("Can't buy from yourself");
    });

    it("Can't buy unlisted item", async () => {
      await expect(mp.buyItem(123)).to.be.revertedWith("Item not listed");
    });

    it("Can't buy with isuffitient balance", async () => {
      await expect(mp.connect(bob).buyItem(firstItem)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("Can't buy with isuffitient allowance", async () => {
      await expect(mp.buyItem(secondItem)).to.be.revertedWith(
        "ERC20: transfer amount exceeds allowance"
      );
    });

    it("Buying emits events", async () => {
      await expect(mp.connect(alice).buyItem(firstItem))
        .to.emit(mp, "Purchase")
        .withArgs(firstItem, alice.address, owner.address, twentyTokens)
        .and.to.emit(nft, "Transfer")
        .withArgs(mp.address, alice.address, firstItem)
        .and.to.emit(acdmToken, "Transfer")
        .withArgs(alice.address, owner.address, twentyTokens);
    });
  });

  describe("Getters", function () {
    beforeEach(async () => {
      // Minting 2 items
      await mp.createItem(owner.address, birdURI);
      await mp.createItem(alice.address, coronaURI);
      // Approving items to Marketplace
      await nft.approve(mp.address, firstItem);
      await nft.connect(alice).approve(mp.address, secondItem);
      // Listing items
      await mp.listItem(firstItem, twentyTokens);
      await mp.connect(alice).listItem(secondItem, twentyTokens);
    });

    it("Should be able to get all items", async () => {
      // Some crazy experiments
      // console.log(await mp.estimateGas.getAllListedItems());
      // for (let i = 3; i < 3400; i += 1) {
      //   await mp.createItem(owner.address, birdURI);
      //   await nft.approve(mp.address, i);
      //   await mp.listItem(i, tenTokens);
      // }
      // console.log("Done!");
      // console.log(await mp.estimateGas.getAllListedItems());
      const items = await mp.getAllItems();
      expect(items.length).to.be.equal(2);
      expect(items[0].owner).to.be.equal(owner.address);
      expect(items[1].owner).to.be.equal(alice.address);
      expect(items[0].isListed).to.be.equal(true);
      expect(items[1].isListed).to.be.equal(true);
    }).timeout(240000);

    it("Should be able to get listings by item ids", async () => {
      const item = await mp.listedItems(secondItem);
      expect(item.owner).to.be.equal(alice.address);
      expect(item.price).to.be.equal(twentyTokens);
      expect(item.isListed).to.be.equal(true);
    });
  });
});
